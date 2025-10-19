// @ts-ignore

import React from 'react';
// index.js
const useState = React.useState;
const useEffect = React.useEffect;
const useRef = React.useRef;
// @ts-ignore

import { API_BASE } from '../apiBase'; 
import FolderList from './FolderList';
// @ts-ignore
import { resizeAndPadImage, convertTifToPng } from './ImageUploader';
import { drawBoxes } from "./FolderImagesList";

function FolderUploader({ folders, setFolders, folderImages, setFolderImages, selectedFolder, setSelectedFolder, ready, detectionSettings, Threshold }) {

    const inputRef = useRef(null);

    const [loading, setLoading]   = useState(false); // 是否显示浮层
    const [progress, setProgress] = useState(0);     // 已处理数
    const [total, setTotal]       = useState(0);     // 待处理总数

    const [uploading, setUploading]   = useState(false);
    const [uplProgress, setUplProgress] = useState(0);
    const [uplTotal, setUplTotal]       = useState(0);

    // handle folder upload
    const handlePick = async (e) => {
        const picked = Array.from(e.target.files || []);
        if (!picked.length) return;

        const isImg = (name) => /\.(png|jpe?g|gif|bmp|pdf|webp|tiff?)$/i.test(name);

        // check for duplicate folder
        const existing = new Set((folders || []).map(f => f.name.toLowerCase()));
        const pickedTopNames = new Set();

        for (const file of picked) {
            if (!isImg(file.name)) continue;
            const rel = file.webkitRelativePath || file.name;      // e.g. "FolderA/sub/1.png"
            const top = (rel.split('/')[0] || 'Unknown').trim();
            if (top) pickedTopNames.add(top.toLowerCase());
        }

        const dupes = [...pickedTopNames].filter(name => existing.has(name));
        if (dupes.length) {
            alert('Duplicate folders found: ' + dupes.join(', '));
            e.target.value = '';
            return;
        }

        // filter only image files
        const toProcess = picked.filter(f => isImg(f.name));
        if (toProcess.length === 0) {
            e.target.value = '';
            return;
        }

        // set up uploading state and progress
        setUploading(true);
        setUplProgress(0);
        setUplTotal(toProcess.length);

        // group images by folder
        const nextFolderImages = Array.isArray(folderImages)
            ? folderImages.reduce((acc, img) => {
                (acc[img.folder] ||= []).push(img);
                return acc;
                }, {})
            : { ...(folderImages || {}) };

        const folderNameSet = new Set((folders || []).map(f => f.name));
        
        try 
        {
            for (const file of picked) {
                if (!isImageName(file.name)) continue;
                
                // Get the top-level folder name from the file's relative path
                const rel = file.webkitRelativePath || file.name;  // e.g. "FolderA/sub/1.png"
                const top = (rel.split('/')[0] || 'Unknown').trim();

                // preprocess all images to 608x608 PNG
                const { url, filename } = await preprocessTo608(file);
                folderNameSet.add(top);

                // create image item and store image info, add to folderImages
                const item = {
                    folder: top,
                    filename,
                    original_image: url,
                    detected: false,
                    boxes: [],
                    eggfound: null
                };
                (nextFolderImages[top] ||= []).push(item);
                setUplProgress(prev => prev + 1);
            }

        } finally {
            // finalize uploading state
            setUploading(false);
        }
        // add new images to state
        setFolderImages(nextFolderImages);

        // update folders list
        const statusByName = new Map(
        (folders || []).map(f => [f.name, f.status || 'not started'])
        );
        const eggByName    = new Map((folders || []).map(f => [f.name, f.eggnum ?? '-']));

        const nextFolders = Array.from(folderNameSet).map(name => ({
           name,
           count: (nextFolderImages[name] || []).length,
           status: statusByName.get(name) || 'not started',
           eggnum: eggByName.get(name) ?? '-'
        }));
        
        // update folders state
        setFolders(nextFolders);
        if (!selectedFolder && nextFolders.length) setSelectedFolder(nextFolders[0].name);

        e.target.value = '';
    };

    // helper: file/blob to Image object
    const fileToImage = (fileOrBlob) => new Promise((resolve, reject) => {
        const url = URL.createObjectURL(fileOrBlob);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
        img.src = url;
    });

    // preprocess image to 608x608 PNG, return { url, filename }
    async function preprocessTo608(file) {
        const maybePng = /\.(tif|tiff)$/i.test(file.name) ? await convertTifToPng(file) : file;
        const img = await fileToImage(maybePng);
        const blob = await new Promise((resolve) => {
            // 这里用你已写好的 resizeAndPadImage(img, callback)
            resizeAndPadImage(img, (b) => resolve(b));
        });
        const outName = maybePng.name.replace(/\.(tif|tiff|jpe?g|bmp|webp)$/i, '.png');
        const url = URL.createObjectURL(blob); // 供后续直接上传/转base64
        return { url, filename: outName };
    }

    // Convert object URL to Base64 for easier handling on the backend
    const objectUrlToBase64 = async (objectUrl) => {
        const res = await fetch(objectUrl);
        const blob = await res.blob();
        return new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => {
                const s = String(fr.result || '');
                const i = s.indexOf(',');
                resolve(i >= 0 ? s.slice(i + 1) : s);
            };
            fr.onerror = reject;
            fr.readAsDataURL(blob);
        });
    };

    // simple image name checker
    const isImageName = (name) => /\.(png|jpe?g|gif|bmp|webp|tiff?)$/i.test(name);

    // call backend
    const callPredict = async (image_base64, API_BASE) => {
        const res = await fetch(`${API_BASE}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_base64 })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    };


    // handle detection
    const handleDetection = async () => {

        const queue = (folders || [])
            .filter(f => (f.status || 'not started').toLowerCase() !== 'completed')
            .map(f => f.name);
        if (!queue.length) return;

        // pre-calculate total tasks and show overlay
        const totalTasks = queue.reduce((sum, folderName) => {
            const arr = Array.isArray(folderImages?.[folderName]) ? folderImages[folderName] : [];
            return sum + arr.filter(it => isImageName(it.filename) && !it.detected).length;
        }, 0);
        if (!totalTasks) return;
        setLoading(true);
        setProgress(0);
        setTotal(totalTasks);

        // process each folder one by one
        try {
            for (const folderName of queue) {
                // set folder status to in progress
                setFolders(prev =>
                    prev.map(f => f.name === folderName ? { ...f, status: 'in progress' } : f)
                );
                
                // create task list for this folder
                const tasks = (folderImages?.[folderName] || [])
                    .map((item, idx) => ({ item, idx }))
                    .filter(({ item }) => isImageName(item.filename) && !item.detected);
                
                // let eggCount = 0;

                // process each image sequentially to avoid exceeding processing time limits
                for (const { item, idx } of tasks) {
                    try {

                    // convert the images to base64 before sending to backend
                    const b64 = await objectUrlToBase64(item.original_image);
                    // call backend API and store result to json
                    const json = await callPredict(b64, API_BASE);
                    
                    // update folderImages with detection result
                    setFolderImages(prev => {
                        const arr = Array.isArray(prev[folderName]) ? prev[folderName] : [];
                        const cur = arr[idx];
                        if (!cur) return prev;

                        const updated = {
                            ...cur,
                            // annotated_image: json.annotated_image ? `data:image/png;base64,${json.annotated_image}` : cur.annotated_image,
                            detected: true,
                            boxes: json.boxes || [],
                            // eggfound: (json.boxes?.length || 0),
                            // the count of boxes depending on which confidence mode user selected
                            eggfound: (json.boxes || []).filter(b => {
                                const conf = detectionSettings.mode === 'adjusted'
                                    ? b.adjusted_confidence
                                    : b.confidence;
                                return conf > Threshold;
                            }).length,
                        };

                        // after receiving boxes, draw them on the image
                        // drawBoxes is a function imported from FolderImagesList.jsx
                        setTimeout(() => {
                            drawBoxes(updated, detectionSettings, Threshold);
                        }, 0);

                        const newArr = arr.map((it, i) => (i === idx ? updated : it));
                        return { ...prev, [folderName]: newArr };
                    });

                    } catch (e) {
  
                        setFolderImages(prev => {
                            const arr = Array.isArray(prev[folderName]) ? prev[folderName] : [];
                            const newArr = arr.map((it, i) =>
                                i === idx ? { ...it, detected: true, boxes: it.boxes || [], eggfound: it.eggfound ?? 0 } : it
                            );
                            return { ...prev, [folderName]: newArr };
                        });
                    } finally {
                        // update progress bar
                        setProgress(prev => prev + 1);
                    }
                }

                // after completed detection for all images in this folder, count the total eggs found in this folder and update folder status
                setFolderImages(prev => {
                    const next = { ...prev }; // ✅ 对象浅拷贝
                    const arr = Array.isArray(next[folderName]) ? next[folderName] : [];

                    const eggCount = arr.reduce((sum, it) => {
                        const validBoxes = (it.boxes || []).filter(b => {
                            const conf = detectionSettings.mode === 'adjusted' 
                            ? b.adjusted_confidence 
                            : b.confidence;
                            return conf > Threshold;
                        });
                        return sum + validBoxes.length;
                    }, 0);

                    setFolders(prevF =>
                        prevF.map(f =>
                        f.name === folderName
                            ? { ...f, status: 'completed', eggnum: eggCount /*, count: arr.length */ }
                            : f
                        )
                    );
                    return next; // ✅ 不改数据就返回拷贝（或直接 return prev 也行）
                });
            }
        } finally {
            // close loading overlay
            setLoading(false);
        }

    };

    // whenever detectionsetting changes, recalculate eggfound for all images and folders
    useEffect(() => {
        setFolderImages(prev => {
            const next = {};

            // recalculate eggfound for each image
            for (const folderName in prev) {
            const arr = prev[folderName];
            if (!Array.isArray(arr)) continue;

            // 重新计算每张图片的 eggfound
            next[folderName] = arr.map(it => {
                const validBoxes = (it.boxes || []).filter(b => {
                const conf = detectionSettings.mode === 'adjusted'
                    ? b.adjusted_confidence
                    : b.confidence;
                return conf > Threshold;
                });
                // 返回新的对象，重置 eggfound
                return { ...it, eggfound: validBoxes.length };
            });
            }

            return next;
        });

        // recalculate eggnum for each folder
        setFolders(prevFolders =>
            prevFolders.map(f => {
            const arr = folderImages?.[f.name] || [];
            const eggCount = arr.reduce((sum, it) => {
                const validBoxes = (it.boxes || []).filter(b => {
                const conf = detectionSettings.mode === 'adjusted'
                    ? b.adjusted_confidence
                    : b.confidence;
                return conf > Threshold;
                });
                return sum + validBoxes.length;
            }, 0);
            return { ...f, eggnum: eggCount };
            })
        );
    }, [detectionSettings.mode]);

    // determine if detection can be started
    const statuses = (folders || []).map(f => (f.status || 'not started').toLowerCase());
    const canStart = (Array.isArray(folders) && folders.length > 0)
        && statuses.includes('not started')
        && !statuses.includes('in progress')
        && !loading; // 新增

    return (
        <div className=" bg-white rounded-lg shadow-lg h-full shrink-0 flex flex-col gap-y-4 w-[350px] p-8 ">
            <div className='flex flex-row h-[30px] items-center justify-between  gap-x-4 mb-1'>
                <h2 className="font-semibold">Folders</h2>

                {/* 隐藏原生 input */}
                <input
                    ref={inputRef}
                    type="file"
                    webkitdirectory=""
                    directory=""
                    multiple
                    id="folderInput"
                    className="hidden"
                    onChange={handlePick}        // ← 绑定处理函数
                />

                {/* 自定义按钮 */}
                <label
                    htmlFor="folderInput"
                    className="cursor-pointer px-4 py-2 font-semibold bg-white border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition"
                >
                    Upload
                </label>

            </div>
            <div className=' flex-1 overflow-y-auto overscroll-y-contain'>
                <FolderList
                    folders={folders}
                    setFolders={setFolders}
                    folderImages={folderImages}
                    setFolderImages={setFolderImages}
                    selectedFolder={selectedFolder}
                    setSelectedFolder={setSelectedFolder}
                    detectionSettings={detectionSettings}
                    Threshold={Threshold}
  
                />
            </div>
            <div className='mt-auto flex h-[30px] flex-col gap-y-1'>
                <div>
                    <button
                        onClick={handleDetection}
                        disabled={!canStart || !ready}
                        className={`w-full px-4 py-2  rounded-lg transition
                            ${canStart && ready
                            ? 'bg-blue-500 text-white font-semibold hover:bg-blue-600'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                        >
                        { !ready ? 'Starting backend...' : 'Start Detection'}
                    </button>
                </div>
            </div>
            {(uploading || loading) && (
                <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                    <div className="w-72 bg-gray-200 rounded-full h-4 mb-4 overflow-hidden shadow-inner">
                    <div
                        className="bg-blue-500 h-4 transition-all duration-300"
                        style={{
                        width: (() => {
                            const curTotal = uploading ? uplTotal : total;
                            const curProg  = uploading ? uplProgress : progress;
                            return curTotal ? `${Math.min(100, (curProg / curTotal) * 100)}%` : '0%';
                        })()
                        }}
                    />
                    </div>
                    <div className="text-lg text-gray-700 font-medium">
                    {uploading
                        ? `Preparing images... (${uplProgress} / ${uplTotal})`
                        : `Detecting images... (${progress} / ${total})`}
                    </div>
                </div>
            )}
                    
        </div>
    );

}

export default FolderUploader;