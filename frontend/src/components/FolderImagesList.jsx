// @ts-ignore
import React from 'react';
// index.js
const useState = React.useState;
const useEffect = React.useEffect;
const useMemo   = React.useMemo;

function FolderImagesList({ selectedFolder, folderImages, setFolderImages, folders, setFolders }) {
    // 1) 计算当前要显示的文件列表
//    const files = useMemo(() => {
//         if (!selectedFolder) return [];
//         return folderImages[selectedFolder] || [];
//     }, [selectedFolder, folderImages]);
    const files = useMemo(() => {
        if (!selectedFolder) return [];
        return (folderImages || []).filter(item => item.folder === selectedFolder);
    }, [selectedFolder, folderImages]);

    // const isImage = (name, type) =>
    //     type?.startsWith('image/') || /\.(png|jpe?g|gif|bmp|webp|tiff?)$/i.test(name);

    // const isPdf = (name, type) =>
    //     type === 'application/pdf' || /\.pdf$/i.test(name);

    const isImage = (name) => /\.(png|jpe?g|gif|bmp|webp|tiff?)$/i.test(name);
    const isPdf = (name) => /\.pdf$/i.test(name);

    const title = selectedFolder || 'No folder selected';
    const total = files.length;
    const eggnum = folders?.find(f => f.name === selectedFolder)?.eggnum ?? '-';

    // 新增：弹层开关与选择值
    const [editingKey, setEditingKey] = useState(null);
    const [choice, setChoice] = useState(0);

    const openAdjust = (key, current) => {
        setEditingKey(key);
        setChoice(Number.isFinite(current) ? current : 0);
    };

    const confirmAdjust = () => {
        let folderNameRef = null;
        setFolderImages(prev => {
            const next = [...prev];
            const idx = next.findIndex(it => `${it.folder}/${it.filename}` === editingKey);
            if (idx >= 0) {
                const cur = next[idx];
                folderNameRef = cur.folder;
                next[idx] = { ...cur, eggfound: choice };
            }
            if (folderNameRef) {
                const total = next
                    .filter(it => it.folder === folderNameRef)
                    .reduce((sum, it) => sum + (it.eggfound ?? 0), 0);
                setFolders(prevF =>
                    prevF.map(f => f.name === folderNameRef ? { ...f, eggnum: total } : f)
                );
            }
            return next;
        });
        setEditingKey(null);
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
        if (!selectedFolder || !Array.isArray(folderImages) || !setFolderImages) {
            setSortOpen(false);
            return;
        }
        setFolderImages(prev => {
            const pairs = prev.map((it, idx) => ({ it, idx }));
            const selected = pairs.filter(p => p.it.folder === selectedFolder);

            let sortedSel;
            if (mode === 'noeggs') {
            // 无蛋图优先（已检测且 boxes.length===0）
                const score = (img) => (img.detected && (img.boxes?.length || 0) === 0) ? 0 : 1;
                sortedSel = selected.slice().sort((a, b) => score(a.it) - score(b.it));
                } else {
                // 置信度最低的框优先（按最小 confidence 升序；无框视为 +∞ 放后）
                const metric = (img) => {
                    const arr = img.boxes || [];
                    if (!arr.length) return Number.POSITIVE_INFINITY;
                    let m = Infinity;
                    for (const b of arr) {
                    const c = typeof b.confidence === 'number' ? b.confidence : 1;
                    if (c < m) m = c;
                    }
                    return m;
                };
                sortedSel = selected.slice().sort((a, b) => metric(a.it) - metric(b.it));
            }

            // 仅在该文件夹内部就地重排，其他文件夹不变
            const newArr = prev.slice();
            const indicesAsc = selected.map(p => p.idx).sort((a, b) => a - b);
            sortedSel.forEach((p, i) => { newArr[indicesAsc[i]] = p.it; });
            return newArr;
        });

        setSortOpen(false);
    };

    const isComplete = !!folders?.some(
        f => f.name === selectedFolder && (f.status || '').toLowerCase() === 'completed'
    );

    return (
        <div className='bg-white flex flex-col rounded-lg w-full shadow-lg p-8'>
            <div className='flex h-[30px] justify-between items-center mb-4'>
                <div className='flex flex-col gap-y-0 items-baseline'>
                    <h2 className='font-semibold mb-0'>{title}</h2>
                    {selectedFolder && (
                    <div className='text-gray-400 flex '>
                        ( 
                        {/* <span>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6  text-gray-500">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.866.966 1.866 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24.204 24.204 0 0 1 12 12.75Zm0 0c2.883 0 5.647.508 8.207 1.44a23.91 23.91 0 0 1-1.152 6.06M12 12.75c-2.883 0-5.647.508-8.208 1.44.125 2.104.52 4.136 1.153 6.06M12 12.75a2.25 2.25 0 0 0 2.248-2.354M12 12.75a2.25 2.25 0 0 1-2.248-2.354M12 8.25c.995 0 1.971-.08 2.922-.236.403-.066.74-.358.795-.762a3.778 3.778 0 0 0-.399-2.25M12 8.25c-.995 0-1.97-.08-2.922-.236-.402-.066-.74-.358-.795-.762a3.734 3.734 0 0 1 .4-2.253M12 8.25a2.25 2.25 0 0 0-2.248 2.146M12 8.25a2.25 2.25 0 0 1 2.248 2.146M8.683 5a6.032 6.032 0 0 1-1.155-1.002c.07-.63.27-1.222.574-1.747m.581 2.749A3.75 3.75 0 0 1 15.318 5m0 0c.427-.283.815-.62 1.155-.999a4.471 4.471 0 0 0-.575-1.752M4.921 6a24.048 24.048 0 0 0-.392 3.314c1.668.546 3.416.914 5.223 1.082M19.08 6c.205 1.08.337 2.187.392 3.314a23.882 23.882 0 0 1-5.223 1.082" />
                            </svg>
                        </span> */}
                        <span className='font-semibold text-md  text-blue-500 me-2'>{eggnum} </span>
                     
                        <span> Eggs Found across {total} files)</span> 
                    </div>
                    )}
                </div>

                { isComplete && (
                    <button
                    type="button"
                    onClick={handleOpenSort}
                    className="flex items-center gap-x-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                    <div>Sort</div>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                    </button>
                )}       
            </div>
            {sortOpen &&  (
                <div className="fixed inset-0 z-50" onClick={() => setSortOpen(false)}>
                    <div
                    className="fixed bg-white shadow-lg rounded-md border p-6 w-64 -translate-x-full"
                    style={{ left: sortPos.x, top: sortPos.y }}
                    onClick={(e) => e.stopPropagation()}
                    >
                    <div className="text-md font-medium mb-2">Sort by:</div>
                    <label className="flex items-center gap-2 py-1 cursor-pointer">
                        <input
                        type="radio"
                        name="sortmode"
                        checked={sortMode === 'lowest'}
                        onChange={() => applySort('lowest')}
                        />
                        <span>Display lowest-confidence box first</span>
                    </label>
                    <label className="flex items-center gap-2 py-1 cursor-pointer">
                        <input
                        type="radio"
                        name="sortmode"
                        checked={sortMode === 'noeggs'}
                        onChange={() => applySort('noeggs')}
                        />
                        <span>Display no-eggs pictures first</span>
                    </label>
                    </div>
                </div>
            )}

        {total === 0 ? (
            <div className=" text-gray-400 italic">No files. Please pick a folder.</div>
        ) : (
            <div className="overflow-y-auto mt-3 overscroll-y-contain grid grid-cols-1 xl:grid-cols-2 gap-4">
            {files.map((item) => {
                const url = item.annotated_image || item.original_image; // 优先标注图
                const key = `${item.folder}/${item.filename}`;

                return (
                <div key={key} className="border relative rounded-lg ">
                    {isImage(item.filename) ? (
                    <img
                        src={url}
                        alt={item.filename}
                        className="w-full h-[300px]  object-cover rounded"
                        loading="lazy"
                    />
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
                        <div className='flex flex-row items-center justify-between'>
                            <div className="px-2 py-1 text-md truncate" title={item.filename}>
                                {item.filename}
                            </div>
                            {item.eggfound != null && (
                                <span className="f px-2 py-1 text-md">{item.eggfound} eggs</span>
                            )}
                        </div>
                
                        <div className="px-2 pb-1 text-xs text-gray-600">
                            {item.detected ? (
                            (item.boxes?.length ? (
                                <div className='flex justify-between items-center'>
                                    <ul className="space-y-1">
                                        {item.boxes.map((b, idx) => {
                                            const [x1, y1, x2, y2] = b.bbox || [];
                                            const confPct = ((b.confidence ?? 0) * 100).toFixed(1);
                                            return (
                                                <li key={idx}>
                                                    #{idx + 1} ({x1},{y1})–({x2},{y2}) — {confPct}%
                                                </li>
                                            );
                                        })}
                                    </ul>
                                    <div className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4 text-blue-500 mr-1">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
                                        </svg>
                                        <div className='text-blue-500 cursor-pointer' onClick={() => openAdjust(key, item.eggfound)}>
                                           Report incorrect detection {">>"}
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
                                <div className='flex justify-between items-center'>
                                    <div className="italic text-gray-400">No eggs found by AI</div>
                                    <div className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4 text-blue-500 mr-1">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
                                        </svg>
                                        <div className='text-blue-500 cursor-pointer' onClick={() => openAdjust(key, item.eggfound)}>
                                           Report incorrect detection {">>"}
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
