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

// --------------------------------------------------------------------------------------------------------------------------------
// Notes on keeping the state shape consistent
// --------------------------------------------------------------------------------------------------------------------------------
// a very common beginner mistake in React is mixing up arrays and objects and accidentally changing the state shape during updates
// for example, initializing the state as an object, but later setting an array to it, react will technically allow it
// but any code that expects the state to be the original shape will break at runtime, so always keep the state shape consistent throughout its lifetime


function FolderModePage({ ready }) {

    const [folders, setFolders] = useState([]);
    const [folderImages, setFolderImages] = useState({}); // the data in folderImages is start as an object, and should be kept as an object
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [confidenceMode, setConfidenceMode] = useState({
        mode: 'original' // 'original' | 'adjusted'
    });
    const [Threshold, setThreshold] = useState(0.5);

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
                    confidenceMode={confidenceMode}
                    Threshold={Threshold}
                />
                <div className=' w-full flex '>
                    <FolderImagesList
                        folders={folders}
                        setFolders={setFolders}
                        folderImages={folderImages}
                        setFolderImages={setFolderImages}
                        selectedFolder={selectedFolder}
                        setConfidenceMode={setConfidenceMode}
                        confidenceMode={confidenceMode}
                        Threshold={Threshold}
                    />
                </div>

            </div>
        </div>
    );
}

export default FolderModePage;