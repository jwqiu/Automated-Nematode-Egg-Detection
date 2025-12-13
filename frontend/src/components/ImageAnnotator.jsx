// @ts-ignore
import React, { useContext, useRef, useState } from 'react';
// @ts-ignore
import { ImageContext } from '../context/ImageContext';
// @ts-ignore
import { API_BASE } from '../apiBase'; 


function ImageAnnotator() {

    const { annotateImage, setAnnotateImage } = useContext(ImageContext); // get the annotateImage and setAnnotateImage from global context
    const [boxes, setBoxes] = useState([]);
    const [drawing, setDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const imageRef = useRef(null);
    const [hasMoved, setHasMoved] = useState(false);
    const [submitted, setSubmitted] = useState(false); // determine whether to show the submission result message
    const [errorMsg, setErrorMsg] = useState(""); // this error message would be shown on frontend if upload fails


    if (!annotateImage) return null;

    // -----------------------------------
    // functions to handle drawing boxes
    // -----------------------------------

    // these three functions together allow the user to draw bounding boxes on the image by clicking and dragging the mouse

    const handleMouseDown = (e) => {
    if (!imageRef.current) return;
        const rect = imageRef.current.getBoundingClientRect();
        setStartPos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
        setHasMoved(false);
        setDrawing(true);
    };

    const handleMouseUp = (e) => {
    if (!drawing || !imageRef.current) return;
        const rect = imageRef.current.getBoundingClientRect();
        const endX = e.clientX - rect.left;
        const endY = e.clientY - rect.top;

        const x1 = Math.min(startPos.x, endX);
        const y1 = Math.min(startPos.y, endY);
        const x2 = Math.max(startPos.x, endX);
        const y2 = Math.max(startPos.y, endY);

        setBoxes([...boxes, {
            bbox: [x1, y1, x2, y2],
            confidence: 1.0  // 或其他默认值
        }]);
        setDrawing(false);
        setMousePos({ x: 0, y: 0 });
        setHasMoved(false); // ✅ 清除
    };

    const handleMouseMove = (e) => {
        setHasMoved(true);
        if (!drawing || !imageRef.current) return;
            const rect = imageRef.current.getBoundingClientRect();
            setMousePos({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
        });
    };

    // -----------------------------------------------
    // functions to handle uploading boxes and image
    // -----------------------------------------------

    // please note that we upload the image file and boxes separately
    // this function handles uploading the image file to the backend
    const handleUpload = async () => {
        if (!annotateImage || !annotateImage.file) {
            console.error("❌ No image to upload.");
            return;
        }
        // call the upload image API, which accepts a post request with form-data body, including the image file
        await fetch(`${API_BASE}/upload/image?filename=${encodeURIComponent(annotateImage.filename)}`, {
            method: "POST",
            body: annotateImage.file, // annotateImage.file is a blob/file object, blob = raw binary data        
        })
        .then((res) => res.text())
        .then((msg) => {
            // if success
            console.log("✅ Done:", msg);
            setSubmitted(true);
            setErrorMsg(""); // clear error message on success
            setTimeout(() => {
                // after 2 seconds, clear the submission state and close the annotator, reset UI
                setSubmitted(false);
                setAnnotateImage(null);
            }, 2000);
        })
        .catch((err) => {
            // if error
            console.error("❌ Failed to Upload:", err);
            setErrorMsg("❌ Upload failed. Please try again.");
            setSubmitted(true); // still show the message area
            setTimeout(() => {
                setSubmitted(false);
                setErrorMsg("");
            }, 2000);
        });
    };
    // this function handles uploading the boxes data to the backend
    const handleBoxUpload = async () => {
        if (!annotateImage || !annotateImage.filename || boxes.length === 0) {
            console.error("❌ Missing image filename or boxes.");
            return;
        }

        // all bounding boxes for this image will be uploaded together in one request
        const payload = {
            filename: annotateImage.filename,
            boxes: boxes.map(b => ({
                bbox: b.bbox,
                confidence: b.confidence ?? 1.0
            }))
        };
        
        await fetch(`${API_BASE}/upload/boxes`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        })
        .then(res => res.text())
        .then(msg => {
            // if success
            console.log("✅ Box Upload Success:", msg);
            setSubmitted(true);
            setErrorMsg("");
            setTimeout(() => {
                setSubmitted(false);
                setAnnotateImage(null);
            }, 2000);
        })
        .catch(err => {
            console.error("❌ Box Upload Failed:", err);
            setErrorMsg("❌ Failed to upload boxes.");
            setSubmitted(true);
            setTimeout(() => {
                setSubmitted(false);
                setErrorMsg("");
            }, 2000);
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center">
            {/* close button */}
            <button
                onClick={() => {
                    setAnnotateImage(null);
                    setBoxes([]);
                }}
                className="absolute top-2 right-2 "
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-10 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
            </button>
            <div className="relative flex flex-col rounded-lg shadow-lg">
                {/* header and submit button */}
                <div className="flex justify-between items-center mb-3">
                    <p className='text-white text-lg '>Please label all the eggs you found below ⬇️</p>
                    <button onClick={
                        () => {
                            if (boxes.length === 0) {
                                alert("Please label at least one egg before submitting.");
                            return;
                            }
                            console.log('boxes:', boxes);
                            console.log("🖼️ filename:", annotateImage.filename); 
                            handleUpload(); 
                            handleBoxUpload(); 
                            setBoxes([]); // ✅ Clear all boxes

                        }
                    } className='bg-blue-500 text-white rounded-lg px-4 py-2 hover:bg-blue-600'>Submit</button>
                </div>

                {/* submission result message */}
                {submitted && (
                    <p className={`mb-4 text-sm ${errorMsg ? 'text-red-400' : 'text-green-400'}`}>
                        {errorMsg || "✅ Submission successful! 🎉 Every label helps us get better. Thank you!"}
                    </p>
                )}

                {/* image and annotation boxes */}
                <div
                    className="relative inline-block"
                        onMouseDown={handleMouseDown}
                        onMouseUp={handleMouseUp}
                        onMouseMove={handleMouseMove}
                    >
                    <img
                        ref={imageRef}
                        src={annotateImage.originalUrl}
                        alt="Original"
                        className="max-w-[90vw] max-h-[80vh] rounded-lg select-none"
                    />
                    
                    {/* showing the box being drawn */}
                   {drawing && hasMoved &&  (
                        <div
                            className="absolute border-2 border-dashed border-red-400 bg-blue-200/20"
                            style={{
                            left: `${Math.min(startPos.x, mousePos.x)}px`,
                            top: `${Math.min(startPos.y, mousePos.y)}px`,
                            width: `${Math.abs(startPos.x - mousePos.x)}px`,
                            height: `${Math.abs(startPos.y - mousePos.y)}px`,
                            }}
                        />
                    )}
                    {/* showing all existing boxes */}
                    {boxes.map((box, index) => {
                        const [x1, y1, x2, y2] = box.bbox;
                        return (
                            <div
                            key={index}
                            className="absolute border-2 border-red-500"
                            style={{
                                left: `${x1}px`,
                                top: `${y1}px`,
                                width: `${x2 - x1}px`,
                                height: `${y2 - y1}px`,
                            }}
                            />
                        );
                    })}
                </div>
                <button className='text-blue-500 underline mt-2' onClick={() => setBoxes([])}>Clear Boxes {'>>'}</button>
            </div>
        </div>
    );
}

export default ImageAnnotator;
