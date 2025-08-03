// @ts-ignore
import React, { useContext, useEffect, useState } from 'react';
import LogoHeader from '../components/LogoHeader';
import BatchResult from '../components/BatchResult';
import BatchImagesList from '../components/BatchImagesList';
import { ImageContext } from '../context/ImageContext';
// @ts-ignore
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';




function BatchResultPage() {
    const { images, setImages } = useContext(ImageContext);
    const [loading, setLoading] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    
    async function detectAllImages() {
        setLoading(true);

        const updatedImages = [];

        for (const img of images) {
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

            const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

            const apiBaseUrl = isLocalhost
                ? "http://localhost:7071/api/predict"
                : "https://eggdetection-dnepbjb0fychajh6.australiaeast-01.azurewebsites.net/api/predict";

            const res = await fetch(apiBaseUrl, {
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
                url: "data:image/png;base64," + resJson.image,
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
        }

        setImages(updatedImages);
        setLoading(false);
    }

    useEffect(() => { detectAllImages(); }, [])



    return (
        <div className='flex flex-col h-screen '>
        <LogoHeader />
        <div className="text-blue-500 underline text-center cursor-pointer hover:underline hover:text-blue-700 transition"
        
            onClick={() => navigate('/batch')}
        >
            Go Back
        </div>

        <div className='flex-1 flex  items-start justify-center gap-8 pt-6'>

            <div className='sticky top-4 h-fit w-[400px] border rounded-lg min-h-[200px] bg-white'>
                <BatchResult/>
            </div>
            <div className='w-[500px] xl:min-w-[600px] min-h-[400px] pb-12 '>
                <BatchImagesList/>
            </div>

        </div>
        
        </div>
    );
}

export default BatchResultPage;