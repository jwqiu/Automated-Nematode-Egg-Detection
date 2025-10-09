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

function FolderUploader({ folders, setFolders, folderImages, setFolderImages, selectedFolder, setSelectedFolder, ready }) {

    const inputRef = useRef(null);

    const [loading, setLoading]   = useState(false); // 是否显示浮层
    const [progress, setProgress] = useState(0);     // 已处理数
    const [total, setTotal]       = useState(0);     // 待处理总数

    const [uploading, setUploading]   = useState(false);
    const [uplProgress, setUplProgress] = useState(0);
    const [uplTotal, setUplTotal]       = useState(0);

    // 选择文件夹：按顶层目录分组图片，并更新 folders 与 folderImages
    const handlePick = async (e) => {
        const picked = Array.from(e.target.files || []);
        if (!picked.length) return;

        const isImg = (name) => /\.(png|jpe?g|gif|bmp|pdf|webp|tiff?)$/i.test(name);

        // 先做重名校验（忽略大小写）
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
            alert('已存在同名文件夹，禁止重复上传：' + dupes.join(', '));
            e.target.value = '';
            return;
        }

        const toProcess = picked.filter(f => isImg(f.name));
        if (toProcess.length === 0) {
            e.target.value = '';
            return;
        }
        setUploading(true);
        setUplProgress(0);
        setUplTotal(toProcess.length);

        // 基于现有状态进行合并（对象模式）
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

                const rel = file.webkitRelativePath || file.name;  // e.g. "FolderA/sub/1.png"
                const top = (rel.split('/')[0] || 'Unknown').trim();

                // 🔧 新增：上传阶段就统一处理成 608×608 PNG
                const { url, filename } = await preprocessTo608(file);
                folderNameSet.add(top);

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
            setUploading(false);
        }

        setFolderImages(nextFolderImages);

        // 旧状态索引：只按对象读取（不再兼容字符串）
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
        

        setFolders(nextFolders);
        if (!selectedFolder && nextFolders.length) setSelectedFolder(nextFolders[0].name);

        // 允许用户再次选择同一目录（清空 value）
        e.target.value = '';
    };


    // 新增：File/Blob -> HTMLImageElement
    const fileToImage = (fileOrBlob) => new Promise((resolve, reject) => {
        const url = URL.createObjectURL(fileOrBlob);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
        img.src = url;
    });

    // 新增：预处理（TIF->PNG + 按你已有的 resizeAndPadImage 变 608×608 PNG）
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


    // 把 objectURL 转成 base64（去掉 data:*;base64, 前缀）
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

    // 简单的图片后缀判断（跳过 pdf 等）
    const isImageName = (name) => /\.(png|jpe?g|gif|bmp|webp|tiff?)$/i.test(name);

    // 调后端
    const callPredict = async (image_base64, API_BASE) => {
        const res = await fetch(`${API_BASE}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_base64 })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    };

    // 开始检测：若有 selectedFolder 则只跑该文件夹，否则跑全部
    const handleDetection = async () => {

        const queue = (folders || [])
            .filter(f => (f.status || 'not started').toLowerCase() !== 'completed')
            .map(f => f.name);
        if (!queue.length) return;

        // === 新增：预计算总任务数并开启浮层 ===
        const totalTasks = queue.reduce((sum, folderName) => {
            const arr = Array.isArray(folderImages?.[folderName]) ? folderImages[folderName] : [];
            return sum + arr.filter(it => isImageName(it.filename) && !it.detected).length;
        }, 0);
        if (!totalTasks) return;
        setLoading(true);
        setProgress(0);
        setTotal(totalTasks);
        try {
            for (const folderName of queue) {
                setFolders(prev =>
                    prev.map(f => f.name === folderName ? { ...f, status: 'in progress' } : f)
                );
                // ↓ 以下现有的 tasks/for 循环与更新逻辑，整体放到这个 for 块里

                // const tasks = (folderImages || [])
                //     .map((item, idx) => ({ item, idx }))
                //     .filter(({ item }) =>
                //         item.folder === folderName &&
                //         isImageName(item.filename) &&
                //         !item.detected
                //     );

                const tasks = (folderImages?.[folderName] || [])
                    .map((item, idx) => ({ item, idx }))
                    .filter(({ item }) => isImageName(item.filename) && !item.detected);
                
                // let eggCount = 0;

                for (const { item, idx } of tasks) {
                    try {
                    const b64 = await objectUrlToBase64(item.original_image);
                    const json = await callPredict(b64, API_BASE);
                    
                    setFolderImages(prev => {
                        const arr = Array.isArray(prev[folderName]) ? prev[folderName] : [];
                        const cur = arr[idx];
                        if (!cur) return prev;

                        const updated = {
                            ...cur,
                            annotated_image: json.annotated_image ? `data:image/png;base64,${json.annotated_image}` : cur.annotated_image,
                            detected: true,
                            boxes: json.boxes || [],
                            eggfound: (json.boxes?.length || 0),
                        };

                        const newArr = arr.map((it, i) => (i === idx ? updated : it));
                        return { ...prev, [folderName]: newArr };
                    });

                    } catch (e) {
                    // 失败也标记已处理，避免卡住
                        // setFolderImages(prev => {
                        //     const next = [...prev];
                        //     next[idx] = { ...next[idx], detected: true, boxes: next[idx].boxes || [], eggfound: next[idx].eggfound ?? 0 };
                        //     return next;
                        // });
                        setFolderImages(prev => {
                            const arr = Array.isArray(prev[folderName]) ? prev[folderName] : [];
                            const newArr = arr.map((it, i) =>
                                i === idx ? { ...it, detected: true, boxes: it.boxes || [], eggfound: it.eggfound ?? 0 } : it
                            );
                            return { ...prev, [folderName]: newArr };
                        });
                    } finally {
                        // === 新增：每处理完一张，推进进度 ===
                        setProgress(prev => prev + 1);
                    }
                }

                setFolderImages(prev => {
                    const next = { ...prev }; // ✅ 对象浅拷贝
                    const arr = Array.isArray(next[folderName]) ? next[folderName] : [];
                    const eggCount = arr.reduce((sum, it) => sum + (it.eggfound ?? 0), 0);

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
            // === 新增：全部结束后关闭浮层 ===
            setLoading(false);
        }

    };

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