// @ts-ignore
import React, { useState, useEffect, useContext, useRef } from 'react';
// @ts-ignore

import LogoHeader from '../components/LogoHeader';
import BatchResult from '../components/BatchResult';
// @ts-ignore

import BatchImagesList from '../components/BatchImagesList';
// @ts-ignore

import ImageAnnotator from '../components/ImageAnnotator';

// @ts-ignore

import { ImageContext } from '../context/ImageContext';
// @ts-ignore
import { useLocation } from 'react-router-dom';
// @ts-ignore

import { useNavigate } from 'react-router-dom';
// @ts-ignore

import { API_BASE } from '../apiBase'; 





function BatchResultPage() {
    const { images, setImages } = useContext(ImageContext);
    const [loading, setLoading] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const [progress, setProgress] = useState(0);
    const ranOnce = useRef(false);

    async function detectAllImages() {
        setLoading(true);
        setProgress(0);

        const updatedImages = [];

        for (let i = 0; i < images.length; i++) {

            const img = images[i];
            try {
            // 如果已经检测过，就跳过
            if (img.detected) {
                updatedImages.push(img);
                continue;
            }

            // 转 base64
            const base64Data = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(",")[1]);
                reader.onerror = () => reject("无法读取图像");
                reader.readAsDataURL(img.file);
            });

            // const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

            // const apiBaseUrl = isLocalhost
            //     ? "http://localhost:7071/api/predict"
            //     : "https://eggdetection-dnepbjb0fychajh6.australiaeast-01.azurewebsites.net/api/predict";

            // const res = await fetch(apiBaseUrl, {
            const res = await fetch(`${API_BASE}/predict`, {

                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                image_base64: base64Data,
                filename: img.filename,
                }),
            });

            if (!res.ok) throw new Error(`检测失败 ${res.status}`);

            const resJson = await res.json();

            updatedImages.push({
                ...img,
                // url: "data:image/png;base64," + resJson.image,
                originalUrl: "data:image/png;base64," + resJson.original_image,
                annotatedUrl: "data:image/png;base64," + resJson.annotated_image,
                detected: true,
                boxes: resJson.boxes,
                egg_count: resJson.egg_count || 0,
            });
            } catch (error) {
            console.error(`检测失败: ${img.filename}`, error);
            updatedImages.push({
                ...img,
                detected: false,
                error: true,
                boxes: [],
                egg_count: 0,
            });
            }
            setProgress(prev => prev + 1);
        }

        setImages(updatedImages);
        setLoading(false);
    }

    // useEffect(() => { detectAllImages(); }, [])
    // useEffect(() => {
    // if (images.length > 0) {
    //     detectAllImages();
    // }
    // }, [images]);
    useEffect(() => {
        if (ranOnce.current) return;       // 已经跑过就不再跑
        ranOnce.current = true;            // 标记：跑过了
        detectAllImages();
    }, []);


    return (
        <div className='flex flex-col min-h-screen '>
            {loading && (
                <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                    <div className="w-72 bg-gray-200 rounded-full h-4 mb-4 overflow-hidden shadow-inner">
                        <div
                            className="bg-blue-500 h-4 transition-all duration-300"
                            style={{ width: `${(progress / images.length) * 100}%` }}
                        ></div>
                    </div>
                    <div className="text-lg text-gray-700 font-medium">
                    Detecting images... ({progress} / {images.length})
                    </div>
                </div>
            )}
            <LogoHeader />
            {/* <div className='mx-auto mt-8'>
                <div className="rounded-lg bg-white/50 hover:bg-blue-100 shadow-lg border border-gray-100  w-[950px] xl:w-[1050px]  py-2 text-blue-500 underline text-center cursor-pointer hover:underline hover:text-blue-700 transition"
                    onClick={() => navigate('/batch')}
                >
                    Back to Upload
                </div>
            </div> */}

            <div className='lg:sticky lg:top-4 mx-auto mt-8 w-full lg:w-[950px]  flex flex-col lg:flex-row items-center justify-start xl:w-[1250px]'>
                <button className='text-blue-500 underline' onClick={() => navigate('/batch')} >Back to Upload {'>>'}</button>
            </div>

            <div className='mx-auto'>
                <div className='flex-1 flex flex-col lg:flex-row w-full lg:w-[950px] xl:w-[1250px]  items-start justify-center gap-8 pt-6'>
                    <div className='lg:sticky lg:top-14 h-fit w-full lg:w-[420px] xl:w-[500px] border rounded-lg min-h-[200px] bg-white'>
                        <BatchResult/>
                    </div>
                    <div className='flex-1 min-h-[400px] pb-12 '>
                        <BatchImagesList/>
                    </div>
                </div>
            </div>
            <ImageAnnotator />
   
        
        </div>
    );
}

export default BatchResultPage;