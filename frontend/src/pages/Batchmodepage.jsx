import React from 'react';
import LogoHeader from '../components/LogoHeader';
import ImageUploader from '../components/ImageUploader';
import { useContext } from 'react';
import { ImageContext } from '../context/ImageContext';



function BatchModePage() {
  const { images, setImages, selectedImage, setSelectedImage } = useContext(ImageContext);

  return (
    <div className='flex flex-col h-screen '>
        <LogoHeader />
        <div className='flex-1 flex flex-col items-center justify-center'>
            <div className=" w-[800px]  min-h-[550px]  pb-16 ">
                <ImageUploader
                    images={images}
                    setImages={setImages}
                    selectedImage={selectedImage}
                    setSelectedImage={setSelectedImage}
                    bottomButton={true} // 传递 bottomButton 属性
                    defaultHints={false} // 传递 defaultHints 属性
                    isCard={true} // 传递 isCard 属性
                />  
            </div>
        </div>

    </div>
  );
}

export default BatchModePage;