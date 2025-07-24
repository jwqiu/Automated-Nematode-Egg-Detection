import React from 'react';

function ImagePreview({ selectedImage }) {
  const containerClass = `   rounded-lg flex flex-col  overflow-auto ${
    selectedImage ? 'p-0 bg-gray-100 ' : 'p-8 bg-white shadow-lg flex-1'
  }`;
  return (
    <div className={containerClass}>
        {selectedImage ? (
          <img src={selectedImage.url} className="w-full h-full object-contain rounded-lg" />
        ) : (
          <>
            <p className="mb-3 text-gray-500">Preview the Image / Detection Result:</p>
            <div className="flex-1  bg-gray-50 p-0 flex items-center shadow-inner justify-center rounded min-h-[100px] ">
              <p className="text-center text-md italic text-gray-400">No image selected</p>
            </div>
          </>
        )}
    </div>
  );
}

export default ImagePreview;