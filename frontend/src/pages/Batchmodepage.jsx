// @ts-ignore
import React from 'react';
// @ts-ignore
import LogoHeader from '../components/LogoHeader';
// @ts-ignore

import ImageUploader from '../components/ImageUploader';
// @ts-ignore

import { useContext } from 'react';
// @ts-ignore

import { ImageContext } from '../context/ImageContext';



function BatchModePage( { ready }) {
  const { images, setImages, selectedImage, setSelectedImage } = useContext(ImageContext);

  return (
    <div className='flex flex-col h-screen '>
        <LogoHeader />
        <div className='px-12 pb-12 pt-6 flex h-full flex-row gap-x-8 mx-auto w-full max-w-[800px] '>
            <div className=" w-full  ">
                <ImageUploader
                    images={images}
                    setImages={setImages}
                    selectedImage={selectedImage}
                    setSelectedImage={setSelectedImage}
                    bottomButton={true} // 传递 bottomButton 属性
                    defaultHints={false} // 传递 defaultHints 属性
                    isCard={true} // 传递 isCard 属性
                    ready={ready}
                />  
            </div>
            {/* <div className=" w-full px-8 lg:px-0 lg:w-[700px] h-[75vh] min-h-[500px]   ">
              <DetectionResult 
                  selectedImage={selectedImage} 
                  setSelectedImage={setSelectedImage}
                  images={images}
                  setImages={setImages}
                />
            </div> */}

        </div>

    </div>
  );
}

export default BatchModePage;