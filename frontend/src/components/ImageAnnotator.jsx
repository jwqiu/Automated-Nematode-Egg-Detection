// @ts-ignore
import React, { useContext, useRef, useState } from 'react';
// @ts-ignore

import { ImageContext } from '../context/ImageContext';

function ImageAnnotator() {
    const { annotateImage, setAnnotateImage } = useContext(ImageContext);
    const [boxes, setBoxes] = useState([]);
    const [drawing, setDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const imageRef = useRef(null);
    const [hasMoved, setHasMoved] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");


    if (!annotateImage) return null;

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

    const handleUpload = () => {
        if (!annotateImage || !annotateImage.file) {
            console.error("❌ No image to upload.");
            return;
        }

        const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
        const apiBaseUrl = isLocalhost
            ? "http://localhost:7071/api/upload"
            : "https://eggdetection-dnepbjb0fychajh6.australiaeast-01.azurewebsites.net/api/upload";

        fetch(`${apiBaseUrl}?filename=${encodeURIComponent(annotateImage.filename)}`, {
            method: "POST",
            body: annotateImage.file, // ✅ 上传 blob，不要 headers
        })
        .then((res) => res.text())
        .then((msg) => {
            console.log("✅ Done:", msg);
            setSubmitted(true);
            setErrorMsg(""); // 清除上次的错误
            setTimeout(() => {
                setSubmitted(false);
                setAnnotateImage(null);
            }, 2000);
        })
        .catch((err) => {
            console.error("❌ Failed to Upload:", err);
            setErrorMsg("❌ Upload failed. Please try again.");
            setSubmitted(true); // 仍然显示提示区域

            setTimeout(() => {
                setSubmitted(false);
                setErrorMsg("");
            }, 2000);
        });
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center">
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
                            setBoxes([]); // ✅ 清空所有框
                            // setSubmitted(true);         
                            // setTimeout(() => {
                            //     setSubmitted(false);
                            //     setAnnotateImage(null);
                            // }, 2500); 

                        }
                    } className='bg-blue-500 text-white rounded-lg px-4 py-2 hover:bg-blue-600'>Submit</button>
                </div>

                {submitted && (
                    <p className={`mb-4 text-sm ${errorMsg ? 'text-red-400' : 'text-green-400'}`}>
                        {errorMsg || "✅ Submission successful! 🎉 Every label helps us get better. Thank you!"}
                    </p>
                )}

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
