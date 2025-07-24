import React from 'react';

function DetectionResult() {
  return (
        <div className="bg-white shadow-lg flex flex-col rounded-lg p-8 flex-1 ">
            <div className="flex justify-between items-center mb-3">
                <p className="mb-0 text-gray-500">Detection Result:</p>
                <button className="bg-blue-500 text-white rounded-lg px-4 py-2">Detect</button>
            </div>
            <div className="w-full flex-1 bg-gray-50 p-8 text-md rounded text-center italic shadow-inner text-gray-400">No result</div>
        </div>
  );
}

export default DetectionResult;