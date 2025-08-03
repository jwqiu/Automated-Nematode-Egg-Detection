// @ts-ignore
// @ts-ignore
import React, { useState, useContext } from 'react';

import { ImageContext } from '../context/ImageContext';


function BatchImagesList() {
  const { images } = useContext(ImageContext);

  return (
    <div className=' space-y-8'>
      {images.map((img, index) => (
        <div key={img.uid || index} className=' shadow-lg rounded-lg bg-white'>
          <img
            src={img.url}
            alt={`image-${index}`}
            className='w-full h-[auto]  rounded-lg'
          />
          <div className='text-gray-700 flex items-center justify-between p-4'>
            <div>
              <p className='text-gray-500'>Filename: {img.filename}</p>
              <p className='text-gray-500'>Status: {img.detected ? '✅ Detected' : '⏳ Pending '}</p>
              <p className='text-gray-500 '> Wrong results? <span className='text-blue-500 cursor-pointer'>Report it&gt;&gt;</span></p>

            </div>
            <div className='me-4'>
              {img.detected && (
                <>
                  <p className='text-blue-500 text-center text-3xl bg-gray-100 p-2 mb-1 rounded-lg shadow-lg '> {img.boxes.length} </p>
                  <span className='text-sm text-gray-500'>Egg Count</span>
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