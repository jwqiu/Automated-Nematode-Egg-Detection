// @ts-ignore
import React from 'react';
// @ts-ignore
import LogoHeader from '../components/LogoHeader';

import DetectionResult from '../components/DetectionResult'; 
import FolderUploader from '../components/FolderUploader';
import FolderImagesList from '../components/FolderImagesList';
import FolderImagesDetectionResult from '../components/FolderImagesDetectionResult';

function FolderModePage() {

    return (
        <div className='flex flex-col h-screen '>
            <LogoHeader />
            <div className='px-12 pb-12 pt-6 flex h-full flex-row gap-x-8 mx-auto w-full max-w-[1200px] '>
                <FolderUploader />
                <div className='flex flex-col w-full gap-y-8 '>
                    <FolderImagesDetectionResult />
                    <FolderImagesList />
                </div>

            </div>
        </div>
    );
}

export default FolderModePage;