// @ts-ignore
import React from 'react';
// @ts-ignore
const useState = React.useState;
const useEffect = React.useEffect;
const useMemo   = React.useMemo;
const useRef = React.useRef;

// this function used to draw boxes on the image canvas after receiving boxes from backend
// this function is called when the image first loads and when the detection settings change in applySort(user clicks sort by confidence/ no-eggs)
export function drawBoxes(item, confidenceMode,Threshold) {
  if (!item?.boxes?.length) return;
  const img = item.imgRef;
  const canvas = document.getElementById(`canvas-${item.filename}`);
  if (!img || !canvas) return;

  const ctx = canvas.getContext("2d");

  // get original and display dimensions, cause the image may be scaled in the browser
  const naturalWidth = img.naturalWidth;   // original image width
  const naturalHeight = img.naturalHeight; // original image height
  const displayWidth = img.clientWidth;    // current display width
  const displayHeight = img.clientHeight;  // current display height

  // calculate scaling factors
  const scaleX = displayWidth / naturalWidth;
  const scaleY = displayHeight / naturalHeight;

  canvas.width = displayWidth;
  canvas.height = displayHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height); // clear previous drawings

  ctx.lineWidth = 2;
  ctx.font = "12px Arial";

  // determine which confidence to use and the boxes to draw, depending on confidenceMode and conf threshold value
  item.boxes.forEach((b) => {
    const conf =
      confidenceMode.mode === "adjusted"
        ? b.adjusted_confidence
        : b.confidence;
    if (Number(conf) < Number(Threshold)) return;

    // scale box coordinates
    const [x1, y1, x2, y2] = b.bbox.map((v, i) =>
      i % 2 === 0 ? v * scaleX : v * scaleY
    );

    const text = `${(conf * 100).toFixed(1)}%`;

    // draw boxes, confidence text with white shadow and red text
    // ✅ red box
    ctx.strokeStyle = "red";
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

    // ✅ white shadow text
    const x = x1;
    const y = Math.max(10, y1 - 5); // prevent text from going out of bounds
    ctx.fillStyle = "white";
    [-1, 0, 1].forEach((dx) =>
      [-1, 0, 1].forEach((dy) => {
        if (dx || dy) ctx.fillText(text, x + dx, y + dy);
      })
    );

    // ✅ main text
    ctx.fillStyle = "red";
    ctx.fillText(text, x, y);
  });
}

// TODO: if the user confirms adjustment, we should upload the image to the backend so i can re-train the model with the bad cases
function FolderImagesList({ selectedFolder, folderImages, setFolderImages, folders, setFolders, setConfidenceMode, confidenceMode, Threshold }) {

    // useMemo = don't redo work unless necessary
    // files contains the list of images for the selected folder
    // useMemo ensure this computation only runs when selectedFolder or folderImages change
    const files = useMemo(() => {
        if (!selectedFolder || !folderImages) return []; // if no folder selected or the image data is empty, return empty array

        // if folderImages is an array, filter only images from the selected folder to display
        if (Array.isArray(folderImages)) {
            return folderImages.filter(x => x.folder === selectedFolder);
        }

        // if folderImages is an object, directly access by key
        const arr = folderImages[selectedFolder];
        return Array.isArray(arr) ? arr : [];
    }, [selectedFolder, folderImages]);

    // helpers to identify file types
    // I might build similar functions like this in other components, consider making it a shared utility later
    const isImage = (name) => /\.(png|jpe?g|gif|bmp|webp|tiff?)$/i.test(name);
    const isPdf = (name) => /\.pdf$/i.test(name);

    const title = selectedFolder || ''; // selectedFolder stores the name of the currently selected folder, which is set in FolderList component
    const total = files.length;
    const eggnum = folders?.find(f => f.name === selectedFolder)?.eggnum ?? '-'; // get eggnum for the selected folder, eggnum is stored in folders state

    // key is foldername/filename, the unique identifier for each image
    // the adjust egg found modal opens when editingKey is set
    const [editingKey, setEditingKey] = useState(null); 
    const [choice, setChoice] = useState(0);

    // when user clicks "Incorrect detection", set the editingKey to open the adjust modal, and the current eggfound will be set to choice state
    const openAdjust = (key, current) => {
        setEditingKey(key);
        setChoice(Number.isFinite(current) ? current : 0);
    };
    
    // handle confirm adjust and update folderimages and folders state
    const confirmAdjust = async () => {
        if (!editingKey) return;

        const [folderName, ...rest] = String(editingKey).split('/'); // first, convert editingKey to string and split to get foldername and filename, then set the first part as folderName
        const filename = rest.join('/'); // set the rest as filename

        setFolderImages(prev => {
            const arr = Array.isArray(prev?.[folderName]) ? prev[folderName] : []; //prev[folderName] safely checks whether prev and prev[folderName] exist
            if (!arr.length) return prev;

            const newArr = arr.map(it =>
                it.filename === filename ? { ...it, eggfound: choice } : it // update eggfound for the specific image
            );
            const next = { ...prev, [folderName]: newArr }; // create a new object with updated array for the specific folder

            // reduce loops through newArr to calculate total eggfound for the folder
            const total = newArr.reduce((sum, it) => sum + (it.eggfound ?? 0), 0);
            setFolders(fs => fs.map(f =>
                f.name === folderName ? ({ ...f, eggnum: total }) : f // set the updated eggnum for the specific folder
            ));

            return next;
        });

        // close the modal and clear editingKey
        setEditingKey(null);
    };

    const cancelAdjust = () => setEditingKey(null);

    // state and handlers for sort modal
    const [sortOpen, setSortOpen] = useState(false);
    const [sortPos, setSortPos] = useState({ x: 0, y: 0 }); // this state is to save the clicked position of my mouse
    const [sortMode, setSortMode] = useState(null); // 'lowest' | 'noeggs'

    // this function is called when user clicks the sort button 
    const handleOpenSort = (e) => {
        setSortPos({ x: e.clientX, y: e.clientY }); // save the mouse click position
        setSortOpen(true); // open the sort modal
    };

    // apply sorting to images in the selected folder
    const applySort = (mode) => {
        // after use clicks a sort option, first set the sortMode state
        setSortMode(mode);
        if (!selectedFolder) { setSortOpen(false); return; }

        // then update folderImages state to sort images based on the selected mode
        setFolderImages(prev => {
            const arr = Array.isArray(prev?.[selectedFolder]) ? prev[selectedFolder] : [];
            if (!arr.length) return prev;

            // define a small helper function to return score for images, if no eggs detected, return 0, else return 1
            const scoreNoEggs = (img) =>
            (img.detected && (img.boxes?.length || 0) === 0) ? 0 : 1;

            // define a small helper function to return the lowest confidence in an image's boxes
            const metricLowest = (img) => {
                const boxes = img.boxes || [];
                if (!boxes.length) return Number.POSITIVE_INFINITY;
                let m = Infinity;
                for (const b of boxes) {
                    const conf =
                    confidenceMode.mode === "adjusted"
                        ? b.adjusted_confidence
                        : b.confidence;
                    const c = typeof conf === 'number' ? conf : 1;
                    if (c < m) m = c;
                }
                return m;
            };

            const sorted = arr.slice().sort((a, b) => // slice() means create a shallow copy to avoid mutating original array
            mode === 'noeggs' 
                ? (scoreNoEggs(a) - scoreNoEggs(b)) // the smaller number appears first, so no-eggs (0) comes before eggs (1)
                : (metricLowest(a) - metricLowest(b)) // the lower confidence appears fiirst
            );

            return { ...prev, [selectedFolder]: sorted }; // only update the specific folder
        });

        setSortOpen(false);
    };

    // check if the detection for the selected folder is complete, and this will determine whether to show the eggnum and sort button
    const isComplete = !!folders?.some(
        f => f.name === selectedFolder && (f.status || '').toLowerCase() === 'completed'
    );

    // apply initial sort when selectedFolder changes and detection is complete
    useEffect(() => {
        if (selectedFolder && isComplete) {
            setSortMode('lowest');
            applySort('lowest');
        }
    }, [selectedFolder, isComplete]);


    return (
        <div className='bg-white flex flex-col rounded-lg w-full shadow-lg p-8'>
            {/* the right-hand header */}
            <div className='flex   justify-between items-center mb-3'>
                <div className='flex flex-col  gap-y-3 xl:flex-row xl:items-center xl:justify-between xl:gap-y-0  w-full'>
                    <h2 className='font-semibold mb-0'>{title}</h2>
                    <div className='flex gap-x-4'>
                        {/* show total images found in the selected folder if selectedFolder exists */}
                        {selectedFolder && (
                            <div className='text-gray-700 px-4 py-2 bg-gray-100 shadow rounded-lg'><span className='font-bold text-md text-blue-500 me-2'>{total}</span> images Found</div>

                        )}

                        {/* show total eggs found in the selected folder if detection is complete */}
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
                // dropdown menu for sort options
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
                                setConfidenceMode({ mode: 'original' });
                                setSortOpen(false);
                                files.forEach(item => drawBoxes(item, { mode: 'original' }, Threshold)); // ✅ 立即重绘
                            }}
                            className={`w-full bg-gray-100 group inline-flex justify-start mb-2 items-center gap-2 px-4 py-2 rounded-lg 
                                hover:bg-blue-100 hover: transition 
                                ${confidenceMode.mode === 'original' ? '  bg-blue-100 ' : ''}`}
                            >

                            Original Confidence &gt; {Threshold}
                            {confidenceMode.mode === 'original' && <span className="ml-auto text-blue-500">✓</span>}
                            </button>

                            <button
                            onClick={() => {
                                setConfidenceMode({ mode: 'adjusted' });
                                setSortOpen(false);
                                files.forEach(item => drawBoxes(item, { mode: 'adjusted' }, Threshold)); // ✅ 立即重绘
                            }}
                            className={`w-full bg-gray-100 group inline-flex justify-start items-center gap-2 px-4 py-2 rounded-lg 
                                hover:bg-blue-100 hover: transition 
                                ${confidenceMode.mode === 'adjusted' ? '  bg-blue-100 ' : ''}`}
                            >

                            Adjusted Confidence &gt; {Threshold}
                            {confidenceMode.mode === 'adjusted' && <span className="ml-auto text-blue-500">✓</span>}
                            </button>
                        </div>
                        
                        
                    </div>

                </div>

            )}
        {/* No images message */}
        {total === 0 ? (
            <div className="flex h-full justify-center items-center text-gray-400 mb-4 italic">
                <div>
                    💡 No folder selected or no images in this folder.
                </div>
            </div>
        ) : (
            // images grid
            <div className="overflow-y-auto mt-3 overscroll-y-contain grid grid-cols-1 xl:grid-cols-2 gap-4">
            {files.map((item) => {
                const url = item.annotated_image || item.original_image; // 优先标注图
                const key = `${item.folder}/${item.filename}`;

                return (
                <div key={key} className="border relative rounded-lg " >
                    {isImage(item.filename) ? (
                    
                    // image preview with canvas for boxes
                    <div style={{ position: "relative", display: "inline-block" }}>
                        <img
                            ref={(el) => (item.imgRef = el)} // ✅ 保存图片引用
                            src={url}
                            alt={item.filename}
                            className="w-full h-auto rounded"
                            loading="lazy"
                            onLoad={() => drawBoxes(item, confidenceMode, Threshold)} // ✅ 图片加载后画框
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
                    {/* Image details panel */}
                    <div>
                        {/* Image filename and egg count */}
                        <div className='flex flex-row text-nowrap items-center '>
                            <div className="px-2 py-1 text-md truncate" title={item.filename}>
                                {item.filename}
                            </div>
                            {item.eggfound != null && (
                                <span className=" me-1 text-sm">({item.eggfound} eggs)</span>
                            )}
                        </div>
                        
                        {/* Detection boxes list */}
                        <div className="px-2 pb-1 text-xs text-gray-600">
                            {/* if detected, render the detection boxes */}
                            {item.detected ? (
                                (item.boxes?.some(b => {
                                    const conf = confidenceMode.mode === 'adjusted'
                                    ? b.adjusted_confidence
                                    : b.confidence;
                                    return conf > Threshold;
                                }) ? (
                                <div className='flex flex-col items-start'>
                                    <ul className="space-y-1">
                                        {item.boxes
                                            ?.filter(b => {
                                                const conf = confidenceMode.mode === 'adjusted'
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
                                        {/* Adjust egg count modal */}
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
                                // if no eggs found, show message
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
                            // if not yet detected, show pending message
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
