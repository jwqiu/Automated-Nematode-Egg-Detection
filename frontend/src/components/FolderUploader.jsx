import React from 'react';
// index.js
const useState = React.useState;
const useEffect = React.useEffect;
const useRef = React.useRef;

import FolderList from './FolderList';

function FolderUploader() {

    const [folders, setFolders] = useState([]);

    return (
        <div className=" bg-white rounded shadow-lg h-full shrink-0 flex flex-col gap-y-4 w-[350px] p-8 ">
            <div className='flex flex-row  items-center justify-between  gap-x-4'>
                <h2 className="">Folders</h2>

                {/* 隐藏原生 input */}
                <input
                    type="file"
                    webkitdirectory=""
                    directory=""
                    multiple
                    id="folderInput"
                    className="hidden"
                />

                {/* 自定义按钮 */}
                <label
                    htmlFor="folderInput"
                    className="cursor-pointer px-4 py-2 font-semibold bg-white border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition"
                >
                    Upload
                </label>
            </div>
            <div className='flex-1 overflow-y-auto'>
                <FolderList />
            </div>
            <div>
                <button className="mt-4 w-full px-4 py-2 font-semibold bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
                    Start Detection
                </button>
            </div>
        </div>

    );
}

export default FolderUploader;