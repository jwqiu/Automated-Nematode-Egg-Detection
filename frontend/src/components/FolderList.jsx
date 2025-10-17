// @ts-ignore

import React from 'react';
// index.js
const useState = React.useState;
const useEffect = React.useEffect;
const useRef = React.useRef;
import { drawBoxes } from "./FolderImagesList";


function FolderList({ folders = [], setFolders, folderImages = {}, setFolderImages, selectedFolder, setSelectedFolder, detectionSettings, Threshold }) {

    const handleFolderSelect = (folder) => {
        setSelectedFolder(folder);

    };



    if (!folders.length) {
        return <p className="text-gray-400 bg-gray-100 p-4 mt-2 rounded-lg italic">Please upload the folders with images in them</p>;
    }

    const statusBadge = (status) => {
        switch ((status || 'not started').toLowerCase()) {
            case 'in progress':
                return <span className="text-xs bg-blue-500 text-white rounded-lg px-2 py-1 italic">In Progress</span>;
            case 'completed':
                return <span className="text-xs bg-green-600 text-white rounded-lg px-2 py-1 italic">Completed</span>;
            default:
                return <span className="text-xs bg-gray-200  text-gray-600 rounded-lg px-2 py-1 italic">Not Started</span>;
        }
    };


    // ❌ 删除按钮：删除当前 folder + 相关 images + 清空选中
    const handleDelete = (e, name) => {
        e.stopPropagation();
        setFolders(prev => prev.filter(f => f.name !== name));
        
        setFolderImages(prev => {
            // 1) 若是数组，先按 folder 分组为对象
            const obj = Array.isArray(prev)
                ? prev.reduce((acc, img) => {
                    const key = img.folder || 'unknown';
                    (acc[key] ||= []).push(img);
                    return acc;
                }, {})
                : { ...(prev || {}) }; // 2) 若已是对象，浅拷贝

            // 3) 删除该文件夹
            delete obj[name];
            return obj;
        });


    // 只在删除的正是当前选中时才清空
        setSelectedFolder(prev => (prev === name ? null : prev));
    };

    return (
        <div className=" flex flex-col gap-y-4">
        {folders.map(({ name, count, status, eggnum }) => {

            const active = selectedFolder === name;

            return (
            <div
                key={name}
                onClick={() => handleFolderSelect(name)}
                className={`bg-gray-100 shadow-md p-4 rounded-lg flex flex-col hover:bg-gray-200 cursor-pointer
                      border-2 ${active ? 'border-blue-500 ring-2 ring-blue-100' : 'border-transparent'}`}
            >
                {/* 左边：文件夹名 + 数量 */}
                <div className="flex justify-between items-center gap-x-2">
                    <h2 className="text-md truncate">{name}</h2>
                    {/* ❌ 删除图标按钮 */}
                    <svg
                        onClick={(e) => handleDelete(e, name)}
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="size-6 text-gray-500 cursor-pointer hover:text-red-600"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                </div>
                <div className='flex flex-row justify-between  items-center w-full mt-2'>
                    <div className='flex gap-x-2'>
                        <div className="flex flex-row w-[50px] items-center gap-x-1">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="1.5"
                                stroke="currentColor"
                                className="size-6  text-gray-500"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                                />
                            </svg>
                            <p className="text-sm text-gray-600 italic">{count}</p>
                        </div>
                        <div className="flex flex-row items-center gap-x-1">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6  text-gray-500">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.866.966 1.866 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24.204 24.204 0 0 1 12 12.75Zm0 0c2.883 0 5.647.508 8.207 1.44a23.91 23.91 0 0 1-1.152 6.06M12 12.75c-2.883 0-5.647.508-8.208 1.44.125 2.104.52 4.136 1.153 6.06M12 12.75a2.25 2.25 0 0 0 2.248-2.354M12 12.75a2.25 2.25 0 0 1-2.248-2.354M12 8.25c.995 0 1.971-.08 2.922-.236.403-.066.74-.358.795-.762a3.778 3.778 0 0 0-.399-2.25M12 8.25c-.995 0-1.97-.08-2.922-.236-.402-.066-.74-.358-.795-.762a3.734 3.734 0 0 1 .4-2.253M12 8.25a2.25 2.25 0 0 0-2.248 2.146M12 8.25a2.25 2.25 0 0 1 2.248 2.146M8.683 5a6.032 6.032 0 0 1-1.155-1.002c.07-.63.27-1.222.574-1.747m.581 2.749A3.75 3.75 0 0 1 15.318 5m0 0c.427-.283.815-.62 1.155-.999a4.471 4.471 0 0 0-.575-1.752M4.921 6a24.048 24.048 0 0 0-.392 3.314c1.668.546 3.416.914 5.223 1.082M19.08 6c.205 1.08.337 2.187.392 3.314a23.882 23.882 0 0 1-5.223 1.082" />
                            </svg>
                            <p className="text-sm text-gray-600 italic">{eggnum}</p>
                        </div>
                    </div>
                    <div>{statusBadge(status)}</div>

                </div>
                {/* 右边：状态，这里先固定成 Waiting，你可以以后加状态逻辑 */}
            
            </div>
            );
        })}
        </div>
    );
}

export default FolderList;
