// @ts-ignore
import React from 'react';
// @ts-ignore

import { API_BASE } from '../apiBase';

// index.js
const useState = React.useState;
const useEffect = React.useEffect;
const useMemo   = React.useMemo;
const useRef = React.useRef;

export function drawBoxes(item, detectionSettings) {
  if (!item?.boxes?.length) return;
  const img = item.imgRef;
  const canvas = document.getElementById(`canvas-${item.filename}`);
  if (!img || !canvas) return;

  const ctx = canvas.getContext("2d");

  // ✅ 获取原始尺寸与显示尺寸
  const naturalWidth = img.naturalWidth;   // 原始图像宽
  const naturalHeight = img.naturalHeight; // 原始图像高
  const displayWidth = img.clientWidth;    // 当前显示宽
  const displayHeight = img.clientHeight;  // 当前显示高

  // ✅ 计算缩放比例
  const scaleX = displayWidth / naturalWidth;
  const scaleY = displayHeight / naturalHeight;

  canvas.width = displayWidth;
  canvas.height = displayHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.lineWidth = 2;
  ctx.font = "12px Arial";

  item.boxes.forEach((b) => {
    const conf =
      detectionSettings.mode === "adjusted"
        ? b.adjusted_confidence
        : b.confidence;
    if (conf < 0.5) return;

    // ✅ 坐标按比例缩放
    const [x1, y1, x2, y2] = b.bbox.map((v, i) =>
      i % 2 === 0 ? v * scaleX : v * scaleY
    );

    const text = `${(conf * 100).toFixed(1)}%`;

    // ✅ 红框
    ctx.strokeStyle = "red";
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

    // ✅ 白色阴影文字
    const x = x1;
    const y = Math.max(10, y1 - 5); // 防止文字超出边界
    ctx.fillStyle = "white";
    [-1, 0, 1].forEach((dx) =>
      [-1, 0, 1].forEach((dy) => {
        if (dx || dy) ctx.fillText(text, x + dx, y + dy);
      })
    );

    // ✅ 主文字
    ctx.fillStyle = "red";
    ctx.fillText(text, x, y);
  });
}


function FolderImagesList({ selectedFolder, folderImages, setFolderImages, folders, setFolders, setDetectionSettings, detectionSettings,Threshold }) {

    const files = useMemo(() => {
        if (!selectedFolder || !folderImages) return [];

        // 数组模式：全局数组里按 folder 过滤
        if (Array.isArray(folderImages)) {
            return folderImages.filter(x => x.folder === selectedFolder);
        }

        // 对象模式：直接按 key 取
        const arr = folderImages[selectedFolder];
        return Array.isArray(arr) ? arr : [];
    }, [selectedFolder, folderImages]);

    function dataURLtoBlob(dataUrl) {
        const [meta, b64] = String(dataUrl).split(',');
        const mime = /data:(.*?);base64/.exec(meta)?.[1] || 'application/octet-stream';
        const bin = atob(b64);
        const u8 = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        return new Blob([u8], { type: mime });
    }

    async function srcToBlob(src) {
        if (!src) throw new Error('No image src');
        // dataURL -> Blob；objectURL/普通 URL -> fetch -> Blob
        return src.startsWith('data:') ? dataURLtoBlob(src) : (await fetch(src)).blob();
    }

    const isImage = (name) => /\.(png|jpe?g|gif|bmp|webp|tiff?)$/i.test(name);
    const isPdf = (name) => /\.pdf$/i.test(name);

    const title = selectedFolder || '';
    const total = files.length;
    const eggnum = folders?.find(f => f.name === selectedFolder)?.eggnum ?? '-';

    // 新增：弹层开关与选择值
    const [editingKey, setEditingKey] = useState(null);
    const [choice, setChoice] = useState(0);

    const openAdjust = (key, current) => {
        setEditingKey(key);
        setChoice(Number.isFinite(current) ? current : 0);
    };
    
    const confirmAdjust = async () => {
        if (!editingKey) return;

        // 先解析 key，定位这张图
        const [folderName, ...rest] = String(editingKey).split('/');
        const filename = rest.join('/');

        // 拿到“当前这张图”的快照（上传用），优先 annotated_image
        const beforeArr = Array.isArray(folderImages?.[folderName]) ? folderImages[folderName] : [];
        const beforeItem = beforeArr.find(it => it.filename === filename);

        // 先更新本地状态（egg 数/汇总）
        setFolderImages(prev => {
            const arr = Array.isArray(prev?.[folderName]) ? prev[folderName] : [];
            if (!arr.length) return prev;

            const newArr = arr.map(it =>
            it.filename === filename ? { ...it, eggfound: choice } : it
            );
            const next = { ...prev, [folderName]: newArr };

            const total = newArr.reduce((sum, it) => sum + (it.eggfound ?? 0), 0);
            setFolders(fs => fs.map(f => f.name === folderName ? ({ ...f, eggnum: total }) : f));

            return next;
        });

        setEditingKey(null);

        // 再上传（最简单：annotated 有就传 annotated，没就传 original）
        try {
            if (beforeItem) {
            const src = beforeItem.annotated_image || beforeItem.original_image;
            const blob = await srcToBlob(src);
            // 防重名，带上文件夹名
            const upName = `${folderName}__${filename}`;

            const res = await fetch(
                `${API_BASE}/upload/image?filename=${encodeURIComponent(upName)}`,
                { method: 'POST', body: blob } // ✅ 直接传二进制，不加 headers
            );
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json(); // { ok, filename, url }
            console.log('✅ Uploaded:', data.url);
            }
        } catch (err) {
            console.error('❌ Upload failed:', err);
        }
    };

    const cancelAdjust = () => setEditingKey(null);

    // 弹层与模式
    const [sortOpen, setSortOpen] = useState(false);
    const [sortPos, setSortPos] = useState({ x: 0, y: 0 });
    const [sortMode, setSortMode] = useState(null); // 'lowest' | 'noeggs'

    const handleOpenSort = (e) => {
        setSortPos({ x: e.clientX, y: e.clientY });
        setSortOpen(true);
    };

    const applySort = (mode) => {
        setSortMode(mode);
        if (!selectedFolder) { setSortOpen(false); return; }

        setFolderImages(prev => {
            const arr = Array.isArray(prev?.[selectedFolder]) ? prev[selectedFolder] : [];
            if (!arr.length) return prev;

            const scoreNoEggs = (img) =>
            (img.detected && (img.boxes?.length || 0) === 0) ? 0 : 1;

            const metricLowest = (img) => {
            const boxes = img.boxes || [];
            if (!boxes.length) return Number.POSITIVE_INFINITY;
            let m = Infinity;
            for (const b of boxes) {
                const c = typeof b.confidence === 'number' ? b.confidence : 1;
                if (c < m) m = c;
            }
            return m;
            };

            const sorted = arr.slice().sort((a, b) =>
            mode === 'noeggs'
                ? (scoreNoEggs(a) - scoreNoEggs(b))
                : (metricLowest(a) - metricLowest(b))
            );

            return { ...prev, [selectedFolder]: sorted }; // 仅更新该文件夹
        });

        setSortOpen(false);
    };

    const isComplete = !!folders?.some(
        f => f.name === selectedFolder && (f.status || '').toLowerCase() === 'completed'
    );



    return (
        <div className='bg-white flex flex-col rounded-lg w-full shadow-lg p-8'>
            <div className='flex   justify-between items-center mb-3'>
                <div className='flex flex-col  gap-y-3 xl:flex-row xl:items-center xl:justify-between xl:gap-y-0  w-full'>
                    <h2 className='font-semibold mb-0'>{title}</h2>
                    <div className='flex gap-x-4'>
                        {selectedFolder && (
                            <div className='text-gray-700 px-4 py-2 bg-gray-100 shadow rounded-lg'><span className='font-bold text-md text-blue-500 me-2'>{total}</span> images Found</div>

                        )}
                    
                        { isComplete && (
                            <div className='flex items-center gap-x-4'>
                                <div className='text-gray-500 bg-gray-100 shadow  px-4 py-2 rounded-lg'>
                                    <div className='text-gray-700'><span className='font-bold text-md text-blue-500 me-2'>{eggnum}</span> Eggs Found </div>
                                </div>
                                <button
                                type="button"
                                onClick={handleOpenSort}
                                className="flex items-center gap-x-2 px-4 py-2 bg-gray-100 shadow rounded-lg hover:bg-gray-200"
                                >
                                <div>Setting</div>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>
                    
                </div>

            </div>
            {sortOpen &&  (

                <div className="relative inline-block">
                    <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)}></div>  {/* ✅ 新增遮罩层 */}
                    <div className="absolute top-full mt-2 right-0 z-50 bg-white shadow-lg rounded-lg border p-8 w-96 text-gray-700 text-sm" onClick={(e) => e.stopPropagation()} >
                        <div className='mb-8'>
                            <div className="text-md font-semibold mb-3">Sort by:</div>

                            <button
                            onClick={() => applySort('lowest')}
                            className={`w-full bg-gray-100 group inline-flex justify-start mb-2 items-center gap-2 px-4 py-2 rounded-lg 
                                hover:bg-blue-100 hover: transition 
                                ${sortMode === 'lowest' ? '  bg-blue-100 ' : ''}`}
                            >
                    
                            Display lowest-confidence box first
                            {sortMode === 'lowest' && <span className="ml-auto text-blue-500">✓</span>}
                            </button>

                            <button
                            onClick={() => applySort('noeggs')}
                            className={`w-full bg-gray-100 group inline-flex justify-start items-center gap-2 px-4 py-2 rounded-lg 
                                hover:bg-blue-100 hover: transition 
                                ${sortMode === 'noeggs' ? '  bg-blue-100 ' : ''}`}
                            >
                    
                            Display no-eggs pictures first
                            {sortMode === 'noeggs' && <span className="ml-auto text-blue-500">✓</span>}
                            </button>
                        </div>
                        <div>
                            <div className="text-md font-semibold  mb-3">How to Identify an Egg:</div>
                            <button
                            onClick={() => {
                                setDetectionSettings({ mode: 'original' });
                                setSortOpen(false);
                                files.forEach(item => drawBoxes(item, { mode: 'original' })); // ✅ 立即重绘
                            }}
                            className={`w-full bg-gray-100 group inline-flex justify-start mb-2 items-center gap-2 px-4 py-2 rounded-lg 
                                hover:bg-blue-100 hover: transition 
                                ${detectionSettings.mode === 'original' ? '  bg-blue-100 ' : ''}`}
                            >

                            Original Confidence &gt; {Threshold}
                            {detectionSettings.mode === 'original' && <span className="ml-auto text-blue-500">✓</span>}
                            </button>

                            <button
                            onClick={() => {
                                setDetectionSettings({ mode: 'adjusted' });
                                setSortOpen(false);
                                files.forEach(item => drawBoxes(item, { mode: 'adjusted' })); // ✅ 立即重绘
                            }}
                            className={`w-full bg-gray-100 group inline-flex justify-start items-center gap-2 px-4 py-2 rounded-lg 
                                hover:bg-blue-100 hover: transition 
                                ${detectionSettings.mode === 'adjusted' ? '  bg-blue-100 ' : ''}`}
                            >

                            Adjusted Confidence &gt; {Threshold}
                            {detectionSettings.mode === 'adjusted' && <span className="ml-auto text-blue-500">✓</span>}
                            </button>
                        </div>
                        
                        
                    </div>

                </div>

            )}

        {total === 0 ? (
            <div className="flex h-full justify-center items-center text-gray-400 mb-4 italic">
                <div>
                    💡 No folder selected or no images in this folder.
                </div>
            </div>
        ) : (
            <div className="overflow-y-auto mt-3 overscroll-y-contain grid grid-cols-1 xl:grid-cols-2 gap-4">
            {files.map((item) => {
                const url = item.annotated_image || item.original_image; // 优先标注图
                const key = `${item.folder}/${item.filename}`;

                return (
                <div key={key} className="border relative rounded-lg " >
                    {isImage(item.filename) ? (
    
                    <div style={{ position: "relative", display: "inline-block" }}>
                        <img
                            ref={(el) => (item.imgRef = el)} // ✅ 保存图片引用
                            src={url}
                            alt={item.filename}
                            className="w-full h-auto rounded"
                            loading="lazy"
                            onLoad={() => drawBoxes(item, detectionSettings)} // ✅ 图片加载后画框
                        />
                        <canvas
                            id={`canvas-${item.filename}`}
                            style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            pointerEvents: "none",
                            width: "100%",
                            height: "100%",
                            }}
                        />
                    </div>
                    ) : isPdf(item.filename) ? (
                    <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-blue-600 underline text-sm"
                    >
                        Open PDF
                    </a>
                    ) : (
                    <div className="text-gray-500 text-sm">No preview</div>
                    )}
                    <div>
                        <div className='flex flex-row text-nowrap items-center '>
                            <div className="px-2 py-1 text-md truncate" title={item.filename}>
                                {item.filename}
                            </div>
                            {item.eggfound != null && (
                                <span className=" me-1 text-sm">({item.eggfound} eggs)</span>
                            )}
                        </div>
                
                        <div className="px-2 pb-1 text-xs text-gray-600">
                            {item.detected ? (
                                (item.boxes?.some(b => {
                                    const conf = detectionSettings.mode === 'adjusted'
                                    ? b.adjusted_confidence
                                    : b.confidence;
                                    return conf > Threshold;
                                }) ? (
                                <div className='flex flex-col items-start'>
                                    <ul className="space-y-1">
                                        {item.boxes
                                            ?.filter(b => {
                                                const conf = detectionSettings.mode === 'adjusted'
                                                ? b.adjusted_confidence
                                                : b.confidence;
                                                return conf > Threshold; // ✅ 阈值判断
                                            })
                                            .map((b, idx) => {
                                            const [x1, y1, x2, y2] = b.bbox || [];
                                            const confPct = ((b.confidence ?? 0) * 100).toFixed(1);
                                            const ellipsePct = ((b.ellipse_prob ?? 0) * 100).toFixed(1);
                                            const adjustedPct = ((b.adjusted_confidence ?? 0) * 100).toFixed(1);
                                            return (
                                                <li key={idx}>
                                                    #{idx + 1} ({x1},{y1})–({x2},{y2}),conf:{confPct}%, ellipse:{ellipsePct}%, <span className="">adjusted_conf:{adjustedPct}% </span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                    <div className="flex items-center mt-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4 text-blue-500 mr-1">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
                                        </svg>
                                        <div className='text-blue-500 cursor-pointer' onClick={() => openAdjust(key, item.eggfound)}>
                                           Incorrect detection {">>"}
                                        </div>
                                        {editingKey === key && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                                                <div className="bg-white rounded-lg p-4 w-64 shadow-lg">
                                                    <div className="font-medium mb-2">Adjust egg count</div>
                                                    <div className="space-y-2 mb-3">
                                                        {[0,1,2,3,4].map(n => (
                                                        <label key={n} className="flex items-center gap-2">
                                                            <input
                                                            type="radio"
                                                            name={`eggopt-${key}`}
                                                            checked={choice === n}
                                                            onChange={() => setChoice(n)}
                                                            />
                                                            <span>{n}</span>
                                                        </label>
                                                        ))}
                                                    </div>
                                                    <div className="flex justify-end gap-2">
                                                        <button className="px-3 py-1 rounded bg-gray-100" onClick={cancelAdjust}>Cancel</button>
                                                        <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={confirmAdjust}>Confirm</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                </div>
                            ) : (
                                <div className='flex flex-col items-start'>
                                    <div className="italic text-gray-400 mb-1">No eggs found by AI</div>
                                    <div className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4 text-blue-500 mr-1">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
                                        </svg>
                                        <div className='text-blue-500 cursor-pointer' onClick={() => openAdjust(key, item.eggfound)}>
                                            Incorrect detection {">>"}
                                        </div>
                                        {editingKey === key && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                                                <div className="bg-white rounded-lg p-8 w-64 shadow-lg">
                                                    <div className="font-medium mb-2">Adjust Egg Num in this picture</div>
                                                    <div className="space-y-2 mb-3">
                                                        {[0,1,2,3,4].map(n => (
                                                        <label key={n} className="flex items-center gap-2">
                                                            <input
                                                            type="radio"
                                                            name={`eggopt-${key}`}
                                                            checked={choice === n}
                                                            onChange={() => setChoice(n)}
                                                            />
                                                            <span>{n}</span>
                                                        </label>
                                                        ))}
                                                    </div>
                                                    <div className="flex justify-end gap-2">
                                                        <button className="px-3 py-1 rounded bg-gray-100" onClick={cancelAdjust}>Cancel</button>
                                                        <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={confirmAdjust}>Confirm</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
              
                                </div>
                            ))
                            ) : (
                            <div className="italic text-gray-400">Pending detection…</div>
                            )}
                        </div>
                    </div>
    
      
                </div>
                );
            })}
            </div>
        )}
        </div>
    );
}

export default FolderImagesList;
