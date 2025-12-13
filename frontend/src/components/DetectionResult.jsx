// @ts-ignore
import React, { useState, useContext } from 'react';
// @ts-ignore
import { ImageContext } from '../context/ImageContext';
// @ts-ignore
import { API_BASE } from '../apiBase'; 

// TODO: I have built another similar function to draw boxes in FolderImageList.jsx, consider merging them later
async function drawBoxesOnImage(imageFile, boxes) {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      img.src = reader.result;
    };
    reader.readAsDataURL(imageFile);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      ctx.lineWidth = 2;
      ctx.font = "12px Arial";

      boxes.forEach((b) => {
        const [x1, y1, x2, y2] = b.bbox;
        const confText = `${(b.confidence * 100).toFixed(1)}%`;

        // 红色矩形
        ctx.strokeStyle = "red";
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

        // 白色阴影文字
        const textX = x1;
        const textY = y1 - 5;
        ctx.fillStyle = "white";
        [-1, 0, 1].forEach((dx) =>
          [-1, 0, 1].forEach((dy) => {
            if (dx || dy) ctx.fillText(confText, textX + dx, textY + dy);
          })
        );

        // 红色主文字
        ctx.fillStyle = "red";
        ctx.fillText(confText, textX, textY);
      });

      // 返回带框的 base64 图片
      resolve(canvas.toDataURL("image/png"));
    };
  });
}

function DetectionResult({ images,setImages, selectedImage, setSelectedImage, ready }) {
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  // annotateImage is a global state defined in ImageContext
  // when the user clicks the correction button, the current selectedImage will be set to annotateImage
  //so it can be accessed by ImageAnnotator component without passing it down through props
  const { setAnnotateImage } = useContext(ImageContext);

  // ---------------------------------
  // handle detection button click
  // ---------------------------------

  const handleDetect = async () => {
    if (!selectedImage) return;

    setLoading(true);
    setError(null);

    try {

      const base64Data = await new Promise((resolve, reject) => { 
        const reader = new FileReader(); // filereader is a built-in browser API to read files
        // if the file is read successfully, call this function
        reader.onload = () => {
          const base64 = reader.result.split(',')[1]; // remove the data URL prefix and keep only the base64 part
          resolve(base64); // resolve the promise with the base64 data
        };
        // if there is an error reading the file, call this function
        reader.onerror = () => reject("Unable to read image");
        // the code below asks the browser to do three things:
        // 1. read bytes from selectedImage.file
        // 2. encode the bytes into base64 format
        // 3. add a prefix "data:image/xxx;base64," to indicate that this is a base64-encoded image
        reader.readAsDataURL(selectedImage.file);  // start reading the file as a data URL
      });
      // call the backend/predict endpoint with the base64 image data we just got
      const res = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_base64: base64Data,
          filename: selectedImage.filename,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Prediction Failed: ${res.status} ${text}`);
      }

      const resJson = await res.json();
      // after receiving the response from backend, draw boxes on the image
      const annotatedUrl = await drawBoxesOnImage(selectedImage.file, resJson.boxes);

      // update the selectedImage state
      setSelectedImage({
        ...selectedImage,
        annotatedUrl, // please note that in JS, if the property name and the variable name are the same, we can just write it once
        detected: true,
        boxes: resJson.boxes,
      });
      // also update the images list in the context
      setImages((prevImages) =>
        prevImages.map((img) =>
          img.uid === selectedImage.uid
            ? { ...img, detected: true, boxes: resJson.boxes, annotatedUrl }
            : img
        )
      );
      
    } catch (err) {
      console.error(err);
      setError(err.message || "An error occurred during detection.");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------
  // Detection status message logic
  // ---------------------------------

  let statusMessage = null;

  if (error) {
    statusMessage = <p className="text-red-500">{error}</p>;
  } else if (!selectedImage) {
    statusMessage = <p className="italic text-gray-400">Then click “Detect” to see the result here.</p>;
  } else if (loading) {
    statusMessage = <p className="italic text-gray-400">Fetching result...</p>;
  } else if (!selectedImage.detected) {
    statusMessage = (
      <p className="italic text-gray-400">
        Click  <span className="text-red-400">“Detect”</span> to get the result.
      </p>
    );
  } else if (selectedImage.detected && (!selectedImage.boxes || selectedImage.boxes.length === 0)) {
    // if detected but no boxes found
    statusMessage = (
      <div>
        <p className="italic text-center text-gray-400">
          No nematode eggs found.
        </p>
        <button onClick={() => setAnnotateImage(selectedImage)} className='text-center text-sm mt-1 text-blue-500 underline'>Not accurate? Help us correct it {'>>'}</button>
      </div>
    );
  }
  return (
    <div className="bg-white border shadow-lg h-[200px] flex flex-col justify-start items-center rounded-lg p-6">
      {/* Detection Result header and detection button */}
      <div className="flex w-full justify-between h-[35px]  items-center  gap-2">
        <div>
          <p className="text-lg text-gray-500">Detection Result:</p>
        </div>
        <div className='flex items-center gap-2'>
          <div className="hover:bg-gray-200 border rounded-lg  px-3 py-2  flex items-center gap-2" onClick={() => setShowSettings(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5 text-gray-400 hover:text-gray-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
            <p className="text-gray-400 ">Setting</p>
          </div>
          <button
            onClick={handleDetect}
            disabled={!selectedImage || loading || !ready}
            className={`rounded-lg px-3 py-2  ${
              !selectedImage || loading || !ready
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            { !ready ? 'Starting backend...' : (loading ? 'Detecting...' : 'Start Detection') }
          </button>
        </div>
      </div>
      {/* Detection Result display area */}
      <div
        className={`w-full flex flex-col  items-center mt-4 overflow-y-auto rounded-lg flex-1 
          ${selectedImage?.boxes?.length > 0 ? 'justify-start' : 'bg-gray-100 justify-center'}
        `}
      >
        {statusMessage}
        {/* Display boxes */}
        {selectedImage?.boxes?.length > 0 && (
          <div className="text-left w-full  overflow-y-auto">
            <ul className=" space-y-2">
              {selectedImage.boxes.map((box, index) => {
                const [x1, y1, x2, y2] = box.bbox;  // ✅ 正确解构
                const conf = box.confidence;
                const ellipse_prob = box.ellipse_prob;
                const adjusted_conf = box.adjusted_confidence;

                return (
                  <li key={index} className='bg-gray-100 px-4 py-2 rounded-lg'>
                    <span className="font-semibold">#{index + 1}</span>:
                    x1: {x1.toFixed(1)}, y1: {y1.toFixed(1)},
                    x2: {x2.toFixed(1)}, y2: {y2.toFixed(1)},
                    confidence: {(conf * 100).toFixed(2)}%,
                    ellipse_prob: {(ellipse_prob * 100).toFixed(2)}%,
                    <span className=""> adjusted_conf: {(adjusted_conf * 100).toFixed(2)}%</span>
                  </li>
                );
              })}
            </ul>
            {/* correction button */}
            <div className='flex items-center justify-center'>
              <button onClick={() => setAnnotateImage(selectedImage)} className='text-center text-sm mt-2 text-blue-500 underline'>Not accurate? Help us correct it {'>>'}</button>
            </div>
          </div>
      )}
      </div>

      {/* settings modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/30 z-40 flex justify-center items-center" onClick={() => setShowSettings(false)} >
          <div className="bg-white rounded-xl shadow-lg p-6 w-96 relative z-50" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Model Settings</h2>

            {/* 模型选择（disabled） */}
            <label className="block text-sm text-gray-500 mb-1">Current Model:</label>
            <div className="w-full flex items-center gap-2 mb-4">
              <button
                disabled
                className="flex items-center gap-2 px-4 py-2  rounded-md border border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed"
              >
                <span>yolov8s_sgd_lr0001_max</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.23 8.27a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {/* 参数（disabled） */}
            <label className="block text-sm text-gray-500 mb-1">Confidence Threshold:</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              disabled
              className="w-full mb-4 cursor-not-allowed"
            />

            <p className="text-xs text-red-600 italic mb-4">⚠️ Setting Currently disabled — demo only</p>

            {/* Close button */}
            <button
              onClick={() => setShowSettings(false)}
              className="mt-2 w-full bg-blue-500 hover:bg-blue-600 text-white py-1 rounded"
            >
              Confirm & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DetectionResult;
