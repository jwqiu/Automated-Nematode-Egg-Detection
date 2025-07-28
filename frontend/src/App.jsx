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
      {/* <ParticlesNetwork /> */}
      <div className=' bg-gradient-to-b from-white  via-blue-200 to-blue-300 lg:bg-gradient-to-tr lg:from-white lg:via-gray-100 lg:to-blue-300 h-screen bg-gray-100 flex flex-col lg:overflow-hidden'>
        <LogoHeader />
        <div className="flex-1 flex flex-col  pb-8 pt-4 px-8 w-[1000px] xl:w-[1200px] mx-auto lg:pb-12 lg:px-12 lg:pt-6">
            <div className="grid grid-cols-1 flex-1 lg:grid-cols-3 gap-8 ">
              <div className="lg:col-span-1 flex flex-col border shadow-lg lg:h-[calc(100vh-168px)] overflow-y-auto">             
                <ImageUploader
                  images={images}
                  setImages={setImages}
                  selectedImage={selectedImage}
                  setSelectedImage={setSelectedImage}
                />                
              </div>

              <div className="lg:col-span-2 flex flex-col gap-8 ">
                <ImagePreview
                  selectedImage={selectedImage}
                />
                <DetectionResult 
                  selectedImage={selectedImage} 
                  setSelectedImage={setSelectedImage}
                  images={images}
                  setImages={setImages}
                />
              </div>
            </div>

        </div>
      </div>
      

    </>
  );
}

export default App;


