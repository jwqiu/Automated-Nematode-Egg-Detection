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


// --------------------------------------------------------------------------------------------------------------------------------
// Notes on where to place function declarations vs const + arrow functions 
// --------------------------------------------------------------------------------------------------------------------------------
// Here are some super simple rules i should remember when to use const to define a function, and when to use function declaration
// Rule 1: if a function lives inside a React component, use const + arrow function
// Rule 2: if a function does not depend on the component, use function declaration and place it outside the component

// --------------------------------------------------------------------------------------------------------------------------------
// Notes on why some functions can be used before they are defined
// --------------------------------------------------------------------------------------------------------------------------------
// when the page first loads, all of my functions are defined but not executed yet
// Javascript scans through the component and sets up every function, including those defined with cosnt and arrow functions
// nothing runs yet at this point
// functions only execute when the user clicks a button or uploads a file, etc.
// by the time my code actually runs, all of the helper functions already exist, so everything works correctly

// --------------------------------------------------------------------------------------------------------------------------------
// Notes on how to update the current state
// --------------------------------------------------------------------------------------------------------------------------------
// React encourages creating new objects/arrays instead of mutating existing ones directly, because it helps React to detect changes and update the UI correctly
// if the new data follows the same stucture as the existing state, we can use the updater function(prev => ...) to append or change values safely
// however, if the data's structure is inconsistent or needs to be reshaped, we should build a new object/array based on the desired structure
// merge the existing data and new data into it, and then set the new object/array as the new state


// this function takes an uploaded file, convert TIFF to PNG if needed, loads it as an image,, resizes and pads it to 608×608
// returns a new PNG blob with a temporary URL and a new filename
async function preprocessTo608(file) {
    const maybePng = /\.(tif|tiff)$/i.test(file.name) ? await convertTifToPng(file) : file;
    const img = await fileToImage(maybePng); // convert file/blob to Image object
    const blob = await new Promise((resolve) => {  // Process the original image with the predefined resizeAndPadImage function from ImageUploader
        resizeAndPadImage(img, (b) => resolve(b));
    });
    const outName = maybePng.name.replace(/\.(tif|tiff|jpe?g|bmp|webp)$/i, '.png');
    // Create a temporary URL so the processed image can be used easily later
    // we only need a temporary URL when we want to load or preview the file inside the browser
    const url = URL.createObjectURL(blob); 
    return { url, filename: outName };
}

// helper: file/blob to Image object
// const function can be exported like normal function declaration
// function declarations can be used before their definition, but const arrow functions cannot
// if a function or a value is only used inside the same file, no need to export it
const fileToImage = (fileOrBlob) => new Promise((resolve, reject) => { // it returns a Promise, meaning it is async
    const url = URL.createObjectURL(fileOrBlob); // convert the blob/file to a temporary URL
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); }; // on successful load, clean up the temp URL and resolve the promise with the image object
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url; // starts loading the image
});

// Convert object URL to Base64 for easier handling on the backend
// TODO: this function should be defined by a function declaration and placed outside the component cause it does not depend on the component
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
// there is something that doesn't make sense here, my code convert the file to an object URL for preview, and later convert that URL back into Base64 to send to backend
// it's not very efficient, because i already had the original file, i could keep the file and convert it directly when needed

function FolderUploader({ folders, setFolders, folderImages, setFolderImages, selectedFolder, setSelectedFolder, ready, detectionSettings, Threshold }) {

    // create a ref to the hidden file input element, image upload button
    // however, this ref is not used in the current code, because we use label+htmlFor to trigger the input click
    const inputRef = useRef(null);

    // state variables to manage loading overlay and progress bar while fetching detection results
    const [loading, setLoading]   = useState(false); // state variable to determine whether to display the loading overlay
    const [progress, setProgress] = useState(0);     // number of images processed so far
    const [total, setTotal]       = useState(0);     // total number of images to process

    // state variables to manage uploading overlay and progress bar while preparing images
    const [uploading, setUploading]   = useState(false);
    const [uplProgress, setUplProgress] = useState(0);
    const [uplTotal, setUplTotal]       = useState(0);

    // ---------------------
    // handle folder upload
    // ---------------------
    const handlePick = async (e) => {
        const picked = Array.from(e.target.files || []); // convert the selected files into a normal array so we can work with them more easily
        if (!picked.length) return;

        const isImg = (name) => /\.(png|jpe?g|gif|bmp|pdf|webp|tiff?)$/i.test(name); // this is a small helper function to check if a file is an image based on its extension

        // check for duplicate folder
        // folders || [] means if folders exists, use it, otherwise use an empty array
        // .map(f => f.name.toLowerCase()) means convert all existing folder names to lowercase and store them in a set for easy lookup
        const existing = new Set((folders || []).map(f => f.name.toLowerCase()));
        
        const pickedTopNames = new Set(); // create a set to store the folder names from the picked files
        for (const file of picked) { // loop through each picked file
            if (!isImg(file.name)) continue;
            // extract the relative path of the file to get the folder name. however, if uploading a single file, use the file name itself
            const rel = file.webkitRelativePath || file.name;      // e.g. "FolderA/sub/1.png"
            const top = (rel.split('/')[0] || 'Unknown').trim(); // split the path by / and take the first part as folder name
            if (top) pickedTopNames.add(top.toLowerCase()); // if top is not empty, add it to the set in lowercase
        }

        // the three dots ... mean to spread the set, and convert it to an array
        // check if any of the picked folder names already exist in the existing folder names set
        // let's say the user upload 3 folders and one of them is duplicate, then all 3 folders will be rejected and failed to upload
        const dupes = [...pickedTopNames].filter(name => existing.has(name));
        if (dupes.length) {
            alert('Duplicate folders found: ' + dupes.join(', '));
            e.target.value = ''; // clear the input value to allow re-uploading
            return;
        }

        // filter only image files, using the isImg helper function defined above
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
        // this code will produce an object which contains folder names as keys, and arrays of image items as values(for existing folders and images)
        // please note that we don't append new data directly to folderImages, instead, we create a new object nextFolderImages to hold all existing and new images
        const nextFolderImages = Array.isArray(folderImages) // Array.isArray is a built in function to check if an value/object is an array
            // the logic here is check if folderImages is an array, if so, convert it to an object grouped by folder name, otherwise, treat it as an object directly
            // reduce() loops through each image in folderImages, for each image, check whether acc already has this folder name as a key
            // if not, create a new empty array for that folder, add the current image to the array for that folder
            // if already has that folder name, just push the image to the existing array
            ? folderImages.reduce((acc, img) => {
                acc[img.folder] = acc[img.folder] ?? [];
                acc[img.folder].push(img);
                return acc;
                }, {})
            : { ...(folderImages || {}) }; 
            // using ... is like opening the box and taking out all items in previous folderImages object and putting them into a new object (shallow copy)
            
        // folderNameSet is a set containing all folder names that currently exist
        const folderNameSet = new Set((folders || []).map(f => f.name));

        try 
        {   
            for (const file of picked) { // picked is an array of objects, and each object represents one uploaded file (image or any file).
                
                // this function isImageName is referenced before its definition, but it doesn't run immediately
                // it only executes when the user triggers it. On page load, all functions are set up so the helper function is already available when it is actually called
                if (!isImageName(file.name)) continue;
                
                // add new folder names to the folderNameSet
                const rel = file.webkitRelativePath || file.name;  // e.g. "FolderA/sub/1.png"
                const top = (rel.split('/')[0] || 'Unknown').trim();  // Get the top-level folder name from the file's relative path
                folderNameSet.add(top);

                // preprocess all images to 608x608 PNG
                const { url, filename } = await preprocessTo608(file);

                // create image item for each file and store image info, add to nextFolderImages
                const item = {
                    folder: top,
                    filename,
                    original_image: url,
                    detected: false,
                    boxes: [],
                    eggfound: null
                };
                // (nextFolderImages[top] ||= []).push(item);
                if (!nextFolderImages[top]){
                    nextFolderImages[top] = [];
                }
                nextFolderImages[top].push(item);
                setUplProgress(prev => prev + 1);
            }

        } finally {
            // finalize uploading state
            setUploading(false);
        }
        // update folderImages using the nextFolderImages we just created
        // TODO: we can simplify this by using prev => pattern if we are sure the data shape is consistent
        setFolderImages(nextFolderImages);

        // update folders list
        const statusByName = new Map( // new Map() creates an empty map object that can store key-value pairs
        (folders || []).map(f => [f.name, f.status || 'not started'])
        );
        const eggByName  = new Map((folders || []).map(f => [f.name, f.eggnum ?? '-']));

        // folder model, represents the data structure for each folder in the folders state
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

    // simple image name checker
    const isImageName = (name) => /\.(png|jpe?g|gif|bmp|webp|tiff?)$/i.test(name);

    // function to call backend
    const callPredict = async (image_base64, API_BASE) => {
        const res = await fetch(`${API_BASE}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_base64 })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    };

    // ---------------------
    // handle image detection
    // ---------------------
    const handleDetection = async () => {

        const queue = (folders || [])
            .filter(f => (f.status || 'not started').toLowerCase() !== 'completed') // only process folders whose status is not completed
            .map(f => f.name); // keep only the folder names
        if (!queue.length) return;

        // const totalTasks = queue.reduce((sum, folderName) => {
        //     const arr = Array.isArray(folderImages?.[folderName]) ? folderImages[folderName] : [];
        //     return sum + arr.filter(it => isImageName(it.filename) && !it.detected).length;
        // }, 0);

        // pre-calculate total tasks and show overlay
        let totalTasks = 0;
        for(const folderName of queue){
            const images = folderImages?.[folderName] ?? [];
            const pendingImages = images.filter(img => isImageName(img.filename) && !img.detected);
            totalTasks += pendingImages.length;
        }

        if (!totalTasks) return;
        setLoading(true);
        setProgress(0);
        setTotal(totalTasks);

        // process each folder one by one
        try {
            for (const folderName of queue) {
                // go through each folder: if the name matches folderName, create a new object with status 'in progress'
                // for non-matching folders, just keep them unchanged, this map produces a new array, which becomes the new folders state
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
                            ...cur, // ...cur means copy all existing properties from cur
                            // annotated_image: json.annotated_image ? `data:image/png;base64,${json.annotated_image}` : cur.annotated_image,
                            // update only the fields that actually changed
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
                        
                        // loop through each image in the array, if the index matches idx, replace it with updated object we just created, otherwise keep it unchanged
                        const newArr = arr.map((it, i) => (i === idx ? updated : it));
                        // ...prev means copy all existing folder 
                        // [folderName]: newArr means in the new object, set the key folderName to the updated array newArr
                        return { ...prev, [folderName]: newArr };
                    });

                    } catch (e) {
  
                        setFolderImages(prev => {
                            const arr = Array.isArray(prev[folderName]) ? prev[folderName] : [];
                            // loop through each image in the array, if this is the image that caused error(i === idx), update its detected to true but boxes to empty array, and eggfound to 0
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

                // we put the egg count update logic inside the setFolderImages callback to ensure it runs with the latest data
                setFolderImages(prev => { // react calls this callback with the latest state value, ensuring the update logic runs with the most recent data
                    const next = { ...prev }; // copy existing folderImages
                    const arr = Array.isArray(next[folderName]) ? next[folderName] : [];

                    // count the number of valid boxes across all images in this folder, and only count boxes that meet the confidence threshold
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
                    return next; // return existing data without changes, cause the code here is designed to update folders state only, not folderImages
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
            // this use of setFolderImages is different from the previous one
            // here we update every image's eggfound based on the new detectionSettings
            // before we only updated folder-level status without modifying image data
            const next = {};

            for (const folderName in prev) { // loop through each folder in the previous folderImages state
            // get the array of images for this folder
            const arr = prev[folderName];
            if (!Array.isArray(arr)) continue;

            // recalculate eggfound for each image
            next[folderName] = arr.map(it => {
                const validBoxes = (it.boxes || []).filter(b => {
                    const conf = detectionSettings.mode === 'adjusted'
                        ? b.adjusted_confidence
                        : b.confidence;
                    return conf > Threshold;
                });
                // we use ...it here, not ...prev, because prev represents the entire folderImages state, while it is the specific image object we are updating
                return { ...it, eggfound: validBoxes.length }; // the ...it means copy all existing properties from the image object
            });
            }

            return next;
        });

        // after update eggfound for each image, then recalculate total eggnum for each folder
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
    }, [detectionSettings.mode]); // this is a dependency array, meaning this effect runs whenever detectionSettings.mode changes

    // determine if detection can be started
    const statuses = (folders || []).map(f => (f.status || 'not started').toLowerCase());
    // folders || [] means if folders exists, use it, otherwise use an empty array
    // for each folder, if f.status exists, use it, otherwise use 'not started'
    // the code above is to get all folder statuses as a lowercase list of strings, defaulting to 'not started' if status is missing
    
    // the condition below controls whether the start detection button is enables
    const canStart = (Array.isArray(folders) && folders.length > 0) // there are folders uploaded
        && statuses.includes('not started') // at least one folder is not started
        && !statuses.includes('in progress') // no folder is in progresss
        && !loading; // not currently loading

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