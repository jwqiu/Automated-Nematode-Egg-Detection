// @ts-ignore

import React, { useState } from 'react';
// @ts-ignore

import LogoHeader from '../components/LogoHeader';
// @ts-ignore

import ImageUploader from '../components/ImageUploader';
// @ts-ignore
import ImagePreview from '../components/ImagePreview';
// @ts-ignore
import DetectionResult from '../components/DetectionResult'; 
// @ts-ignore
import ParticlesNetwork from '../components/ParticlesNetwork';
// @ts-ignore
import ImageAnnotator from '../components/ImageAnnotator';


function HomePage() {
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);


  return (
    <>
      {/* <ParticlesNetwork /> */}
      <div className='flex flex-col h-full'>
        <LogoHeader />
        <div className="flex-1  min-h-0 pb-8 pt-8 px-8 w-full lg:w-[950px] xl:w-[1200px] 2xl:w-[1300px] min-h-[600px] mx-auto lg:pb-12 xl:pb-20 lg:px-12 lg:pt-6">
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
        <ImageAnnotator />
      </div>
      

    </>
  );
}

export default HomePage;


