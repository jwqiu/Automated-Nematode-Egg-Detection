import React, { useState } from 'react';

function DetectionResult({ selectedImage,setSelectedImage }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
        <button
          onClick={handleDetect}
          disabled={!selectedImage || loading}
          className={`rounded-xl px-4 py-2 mt-3 text-white font-bold ${
            !selectedImage || loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {loading ? 'Detecting...' : 'Detect'}
        </button>
      )}



  

    </div>
  );

}

export default DetectionResult;
