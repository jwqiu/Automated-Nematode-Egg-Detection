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
      <div className='flex flex-col h-full'>
        <LogoHeader />
        <div className="flex-1  min-h-0 pb-8 pt-4 px-8 w-full lg:w-[1000px] xl:w-[1200px] mx-auto lg:pb-12 lg:px-12 lg:pt-6">
            <div className=" h-full min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-8 ">
              <div className="lg:col-span-1 flex flex-col  shadow-lg min-h-0 h-full">             
                <ImageUploader
                  images={images}
                  setImages={setImages}
                  selectedImage={selectedImage}
                  setSelectedImage={setSelectedImage}
                />                
              </div>

              <div className="lg:col-span-2 flex flex-col h-full gap-8 min-h-0 ">
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


