import React, { useState } from 'react';
import LogoHeader from './components/LogoHeader';
import ImageUploader from './components/ImageUploader';
import ImagePreview from './components/ImagePreview';
import DetectionResult from './components/DetectionResult'; 
import ParticlesNetwork from './components/ParticlesNetwork';


function App() {
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);


  return (
    <>
      <ParticlesNetwork />
      <div className='relative bg-gradient-to-b from-white  via-blue-200 to-blue-400 lg:bg-gradient-to-r lg:from-gray-100 lg:via-blue-200 lg:to-blue-400 min-h-screen bg-gray-100 flex flex-col lg:overflow-hidden'>
        <LogoHeader />
        <div className="flex-1 flex items-center justify-center">
            <div className=" w-[1000px] lg:w-[1200px] xl:max-w-[1500px]  grid grid-cols-1 mt-8 lg:mt-0 lg:grid-cols-3 gap-8 px-8 lg:px-8 xl:px-0 pb-12">
              <ImageUploader
                  images={images}
                  setImages={setImages}
                  selectedImage={selectedImage}
                  setSelectedImage={setSelectedImage}
                />

              <div className="lg:col-span-2 flex flex-col gap-8  max-h-[600px] 2xl:max-h-[800px]">
                <ImagePreview 
                  selectedImage={selectedImage} 
                />
                <DetectionResult 
                  selectedImage={selectedImage} 
                  setSelectedImage={setSelectedImage}
                />
              </div>
            </div>

        </div>
      </div>
      

    </>
  );
}

export default App;
