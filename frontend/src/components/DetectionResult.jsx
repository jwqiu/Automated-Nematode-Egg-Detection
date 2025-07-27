import React, { useState } from 'react';

function DetectionResult({ images,setImages, selectedImage,setSelectedImage }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const handleDetect = async () => {
    if (!selectedImage) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('http://127.0.0.1:5001/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: selectedImage.uid,
          filename: selectedImage.filename
        })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`预测失败: ${res.status} ${text}`);
      }

      const resJson = await res.json();

      setSelectedImage({
        ...selectedImage,
        url: 'data:image/jpeg;base64,' + resJson.image,
        detected: true,
        boxes: resJson.boxes
      });

      setImages((prevImages) =>
        prevImages.map((img) =>
          img.uid === selectedImage.uid
            ? {
                ...img,
                url: 'data:image/jpeg;base64,' + resJson.image,
                detected: true,
                boxes: resJson.boxes
              }
            : img
        )
      );

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  let statusMessage = null;

  if (error) {
    statusMessage = <p className="text-red-500">{error}</p>;
  } else if (!selectedImage) {
    statusMessage = <p className="italic text-gray-400">No image selected.</p>;
  } else if (loading) {
    statusMessage = <p className="italic text-gray-400">Fetching result...</p>;
  } else if (!selectedImage.detected) {
    // 未点击 Detect 按钮
    statusMessage = (
      <p className="italic text-gray-400">
        Click detect to get the result.
      </p>
    );
  } else if (selectedImage.detected && (!selectedImage.boxes || selectedImage.boxes.length === 0)) {
    // 点击了 Detect 但没有检测到任何结果
    statusMessage = (
      <p className="italic text-gray-400">
        No nematode eggs found.
      </p>
    );
  }

  return (
    <div className="bg-white shadow-lg  max-h-[300px] flex flex-col justify-start items-center rounded-lg p-8 ">
      {statusMessage}

      {/* 显示 boxes */}
      {selectedImage?.boxes?.length > 0 && (
        <div className="text-left w-full max-h-[300px] overflow-y-auto">
          <h3 className="text-gray-500 font-bold mb-2">Detected Boxes:</h3>
          <ul className=" space-y-3">
            {selectedImage.boxes.map((box, index) => {
              const [x1, y1, x2, y2] = box.bbox;  // ✅ 正确解构
              const conf = box.confidence;
              return (
                <li key={index} className='bg-gray-100 px-4 py-2 rounded-lg shadow'>
                  <span className="font-semibold">#{index + 1}</span>:
                  x1: {x1.toFixed(1)}, y1: {y1.toFixed(1)},
                  x2: {x2.toFixed(1)}, y2: {y2.toFixed(1)},
                  confidence: {(conf * 100).toFixed(2)}%
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* 只有当还没有检测到任何 box 时才显示按钮 */}
      {(!selectedImage?.boxes || selectedImage.boxes.length === 0) && (
        <div className="flex items-center mt-2 justify-between gap-2">
          <div className="hover:bg-gray-200 bg-gray-100 rounded-lg border p-1  flex items-center gap-1" onClick={() => setShowSettings(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-8 text-gray-400 hover:text-gray-500">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
            <p className="text-gray-400">Setting</p>
          </div>
          <button
            onClick={handleDetect}
            disabled={!selectedImage || loading}
            className={`rounded-xl px-4 py-2  text-white font-bold ${
              !selectedImage || loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {loading ? 'Detecting...' : 'Detect'}
          </button>
        
        </div>
      )}

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
