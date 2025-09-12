import React from 'react';
// index.js
const useState = React.useState;
const useEffect = React.useEffect;
const useRef = React.useRef;

function FolderImagesDetectionResult() {
    return (
        <div className='bg-white rounded-lg h-[120px] w-full shadow-lg p-8'>
            <h2>Folder Images Detection Result</h2>
            <p>Display detection results for images uploaded from folder here.</p>
        </div>
    );
}

export default FolderImagesDetectionResult;
