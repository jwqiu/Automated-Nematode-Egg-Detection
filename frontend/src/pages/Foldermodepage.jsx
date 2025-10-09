// @ts-ignore
import React from 'react';
// @ts-ignore
import LogoHeader from '../components/LogoHeader';
// @ts-ignore

import DetectionResult from '../components/DetectionResult'; 
// @ts-ignore

import FolderUploader from '../components/FolderUploader';

const useState = React.useState;
const useEffect = React.useEffect;
const useRef = React.useRef;

// @ts-ignore

import FolderImagesList from '../components/FolderImagesList';

function FolderModePage({ ready }) {

    const [folders, setFolders] = useState([]);
    const [folderImages, setFolderImages] = useState({});
    const [selectedFolder, setSelectedFolder] = useState(null);


    return (
        <div className='flex flex-col h-screen '>
            <LogoHeader />
            <div className='px-12 pb-12 pt-6 flex h-[calc(100vh-100px)] flex-row gap-x-8 mx-auto w-full min-w-[1000px] max-w-[1400px] '>
                <FolderUploader
                    folders={folders}
                    setFolders={setFolders}
                    folderImages={folderImages}
                    setFolderImages={setFolderImages}
                    selectedFolder={selectedFolder}
                    setSelectedFolder={setSelectedFolder}
                    ready={ready}
                />
                <div className=' w-full flex '>
                    <FolderImagesList
                        folders={folders}
                        setFolders={setFolders}
                        folderImages={folderImages}
                        setFolderImages={setFolderImages}
                        selectedFolder={selectedFolder}
                    />
                </div>

            </div>
        </div>
    );
}

export default FolderModePage;