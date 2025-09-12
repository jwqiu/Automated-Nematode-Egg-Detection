import React from 'react';
// index.js
const useState = React.useState;
const useEffect = React.useEffect;
const useRef = React.useRef;

function FolderImagesList() {
    return (
        <div className='bg-white rounded-lg h-full w-full shadow-lg p-8'>
            <h2>Folder Images</h2>
            <p>Display images uploaded from folder here.</p>
        </div>
    );
}

export default FolderImagesList;
