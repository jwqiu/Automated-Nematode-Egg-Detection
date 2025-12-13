// @ts-ignore
import React, { useState, useContext } from 'react';
// @ts-ignore
import { ImageContext } from '../context/ImageContext';

// =================================================================================================
// This component is not currently used in the app
// =================================================================================================

function BatchImagesList() {
  const { images } = useContext(ImageContext);
  const { setAnnotateImage } = useContext(ImageContext);

  return (
    <div className=' space-y-8'>
      {images.map((img, index) => (
        <div key={img.uid || index} className=' shadow-lg rounded-lg bg-white'>
          <img
            src={img.annotatedUrl || img.originalUrl || img.url}
            alt={`image-${index}`}
            className='w-full h-[auto]  rounded-lg hover:scale-105 transition-transform duration-300'
          />
          <div className='text-gray-700 flex items-center justify-between p-4'>
            <div>
              <p className='text-gray-500'>Filename: {img.filename}</p>
              <p className='text-gray-500'>Status: {img.detected ? '✅ Detected' : '⏳ Pending '}</p>
              <p className='text-gray-500 '> Not accurate? <button onClick={() => setAnnotateImage(img)} className='text-blue-500 cursor-pointer'> Help us correct it &gt;&gt;</button></p>

            </div>
            <div className='me-4'>
              {img.detected && (
                <>
                  <p className='text-blue-500 text-center text-3xl bg-gray-100 p-2 mb-1 rounded-lg shadow-lg '> {img.boxes.length} </p>
                  <span className='text-sm text-gray-500'>Eggs Found</span>
                </>
              )}
            </div>
            {img.error && <p className='text-red-500'>⚠️ Detection failed</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default BatchImagesList;