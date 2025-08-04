import React from 'react';
// index.js
const useState = React.useState;
const useEffect = React.useEffect;
const useRef = React.useRef;
import { useNavigate } from 'react-router-dom';


import { decode, decodeImage, toRGBA8 } from "utif";

// React 组件函数，名称为 ImageUploader
function ImageUploader({ images, setImages, setSelectedImage,selectedImage, bottomButton = false, defaultHints = true,isCard = false }) {
  // 用 useState 创建一个状态变量 images，用于保存上传的图片
  // 初始值是一个空数组 []
  // const [images, setImages] = React.useState([]);
  // const [selectedImage, setSelectedImage] = React.useState(null);
  const navigate = useNavigate();
  
  function resizeAndPadImage(img, callback) {
    const targetSize = 608;
    const canvas = document.createElement("canvas");
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext("2d");

    // 计算等比缩放尺寸
    const ratio = Math.min(targetSize / img.width, targetSize / img.height);
    const newWidth = img.width * ratio;
    const newHeight = img.height * ratio;

    const dx = (targetSize - newWidth) / 2;
    const dy = (targetSize - newHeight) / 2;

    // 可选：设置背景色为灰色（与 YOLO letterbox 一致）
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, targetSize, targetSize);

    // 居中绘制缩放后的图像
    ctx.drawImage(img, dx, dy, newWidth, newHeight);

    canvas.toBlob((blob) => {
      callback(blob);
    }, "image/jpeg", 0.9);
  }

  async function convertTifToPng(file) {
    const name = file.name.toLowerCase();
    if (!name.endsWith(".tif") && !name.endsWith(".tiff")) {
      return file;
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const buffer = new Uint8Array(reader.result);
        const ifds = decode(buffer);

        // 找到包含图像数据的 IFD
        const validIfd = ifds.find((ifd) => ifd.t273 && ifd.t279);
        if (!validIfd) {
          console.error("❌ No usable image data found in any IFD");
          resolve(file);
          return;
        }

        // **关键**：解码压缩数据到像素缓存
        decodeImage(buffer, validIfd);

        // 取尺寸
        const width  = validIfd.t256?.[0];
        const height = validIfd.t257?.[0];
        if (!width || !height) {
          console.error("❌ Invalid TIFF dimensions");
          resolve(file);
          return;
        }

        // 真正拿回 RGBA 数组
        const rgba = toRGBA8(validIfd);
        if (!rgba.length) {
          console.error("❌ Failed to decode image pixels.");
          resolve(file);
          return;
        }

        // 绘制到 canvas，再导出 PNG
        const canvas = document.createElement("canvas");
        canvas.width  = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        const imgData = ctx.createImageData(width, height);
        imgData.data.set(rgba);
        ctx.putImageData(imgData, 0, 0);

        canvas.toBlob((blob) => {
          const pngFile = new File(
            [blob],
            file.name.replace(/\.(tif|tiff)$/i, ".png"),
            { type: "image/png" }
          );
          resolve(pngFile);
        }, "image/png");
      };

      reader.readAsArrayBuffer(file);
    });
  }

  const [isUploading, setIsUploading] = useState(false);
  const imageListRef = useRef(null);

  // 处理上传图片的函数
  async function handleImageUpload(event) {
    
    const fileList = event.target.files;
    const files = Array.from(fileList);

    const uploadTasks = files.map(async (originalFile) => {
      const file = await convertTifToPng(originalFile);

      return new Promise((resolve) => {
      // 🧠 Step 1: 将原始文件转换为 Image 对象
        const img = new Image();
        img.src = URL.createObjectURL(file);

        img.onload = () => {
          resizeAndPadImage(img, async (blob) => {
            const previewUrl = URL.createObjectURL(blob);
            const formData = new FormData();
            formData.append("image", blob, file.name); // 保留原文件名
            const newUid = crypto.randomUUID();
            // try {
            //   const res = await fetch("http://127.0.0.1:5001/upload", {
            //     method: "POST",
            //     body: formData,
            //   });

            //   if (!res.ok) {
            //     const errorText = await res.text();
            //     throw new Error(`Upload failed: ${res.status} ${errorText}`);
            //   }

            //   const data = await res.json();

              setImages((prev) =>
                prev.concat({
                  file: blob,
                  url: previewUrl,
                  uid: newUid,
                  filename: file.name,
                  detected: false,
                  boxes: null,
                })
              );
              // if (index === files.length - 1) {              
              //   setSelectedImage({
              //     file: blob,
              //     url: previewUrl,
              //     uid: newUid,
              //     filename: file.name,
              //     detected: false,
              //     boxes: null,
              //   });
              // }
            // } catch (err) {
            //   console.error("Upload failed:", err);
            // }
              resolve();

          }, "image/jpeg", 1); // 第三个参数为压缩质量（可选）
        };
      });
    });
    await Promise.all(uploadTasks); 
    setIsUploading(true); 
    event.target.value = "";
  }

  useEffect(() => {
    if (isUploading && images.length > 0) {
      setSelectedImage(images[images.length - 1]);
      setIsUploading(false); // 重置状态

      setTimeout(() => {
        const el = imageListRef.current;
        if (!el) return;
        el.scrollTo({
          top: 0,
          left: 0,
          behavior: "smooth",
        });
      }, 0); // 确保 DOM 更新后再滚动
    }
  }, [images]);

  function loadDefaultImages() {
    const defaultImageUrls = [
      `${import.meta.env.BASE_URL}static/images/default_Image1.png`,
      `${import.meta.env.BASE_URL}static/images/default_Image2.jpeg`,
      `${import.meta.env.BASE_URL}static/images/default_Image3.png`,
    ];

    const loadAll = async () => {
      const newImages = await Promise.all(
        defaultImageUrls.map(async (url) => {
          const res = await fetch(url);
          const blob = await res.blob();
          const objectUrl = URL.createObjectURL(blob);  // 原图临时地址

          // Step 1: 加载图片为 Image 对象
          const resizedBlob = await new Promise((resolve) => {
            const img = new Image();
            img.src = objectUrl;
            img.onload = () => {
              resizeAndPadImage(img, (resizedBlob) => {
                resolve(resizedBlob);
              }, "image/jpeg", 0.9);
            };
          });

          const previewUrl = URL.createObjectURL(resizedBlob);
          const base64 = await convertToBase64(resizedBlob);

          return {
            file: resizedBlob,
            url: previewUrl,
            uid: crypto.randomUUID(),
            filename: url.split("/").pop(),
            image_base64: base64,
            detected: false,
            boxes: null,
          };
        })
      );

      setImages(newImages);
      if (newImages.length > 0) {
        setSelectedImage(newImages[newImages.length - 1]);
      }
    };

    loadAll();
  }

  function convertToBase64(blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  }

  // function deleteImageOnServer({ uid, filename }) {
  //   return fetch("http://127.0.0.1:5001/delete", {
  //     method: "DELETE",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ uid, filename })
  //   })
  //   .then(res => {
  //     if (!res.ok) throw new Error(`Server returned ${res.status}`);
  //     return res.json();
  //   });
  // }

  

  // function handleRemove(indexToRemove) {
  //   const img = images[indexToRemove];

  //   // 先调用后端接口
  //   deleteImageOnServer(img)
  //     .then((data) => {
  //       if (data.status !== "success") {
  //         console.error("删除失败：", data.error);
  //         return;
  //       }

  //       // 后端删成功，前端再做清理
  //       URL.revokeObjectURL(img.url);
  //       setImages(prev =>
  //         prev.filter((_, idx) => idx !== indexToRemove)
  //       );
  //       if (selectedImage?.uid === img.uid) {
  //         // 如果是 blob URL，也要 revoke
  //         if (selectedImage.url.startsWith("blob:")) {
  //           URL.revokeObjectURL(selectedImage.url);
  //         }
  //         setSelectedImage(null);
  //       }
  //     })
  //     .catch(err => {
  //       console.error("删除过程中出错：", err);
  //     });
  // }

  function handleRemove(uidToRemove) {
    const imgIndex = images.findIndex(img => img.uid === uidToRemove);
    if (imgIndex === -1) return;

    const img = images[imgIndex];

    // 清理 URL
    URL.revokeObjectURL(img.url);

    // 更新图片列表（前端删除）
    const newImages = images.filter(img => img.uid !== uidToRemove);
    setImages(newImages);

    // 清理 selectedImage（必须在最后执行，不能用旧的 images 判断）
    if (selectedImage?.uid === uidToRemove) {
      if (selectedImage.url.startsWith("blob:")) {
        URL.revokeObjectURL(selectedImage.url);
      }
      setSelectedImage(null);
    }
  }

  function clearUploads() {
    setImages([]);
    setSelectedImage(null);
  }

  // 返回要渲染的 HTML 结构（JSX）
  return (
    <div  className={`relative min-h-0 flex flex-col rounded-lg border  px-8 py-6 bg-white shadow-lg
      ${isCard ? 'h-[80vh] min-h-[300px] pb-24 '  : 'h-full'}
    `}>
      {/* 图片上传的 input 元素 */}
        <div className="flex overflow-auto flex-shrink-0 h-[50px] items-center w-full  justify-between mb-3 mt-0 sticky z-10  rounded-lg  top-0">
            <div className="flex items-center"> 
                {/* <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5 my-0 text-gray-400 me-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg> */}
                <p className="mb-0 text-gray-500 mt-0">
                  Image List:
                </p>
            </div>
            <div>
                <label
                htmlFor="upload"
                className="cursor-pointer font-bold inline-block bg-blue-500 text-white px-3 py-2 rounded-xl hover:bg-blue-600"
                >
                    Upload
                </label>
                <input
                    id="upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                />
            </div>
        </div>

        {/* 图片列表区域 */}
        <div ref={imageListRef} className={
          ` gap-6 overflow-auto 
          ${isCard ? 'grid grid-cols-2 gap-6  relative min-h-32    '  : 'flex flex-row lg:flex-col'}`
        }>
          {images.length === 0 ? 
          (
            defaultHints ? ( // ✅ 根据 defaultHints 决定是否显示提示文字
              <p className="text-gray-400 w-full bg-gray-100 p-5 rounded-lg text-md text-start  italic">
                Please upload an image to start detection, or <br />
                <span
                  className="text-blue-400 underline cursor-pointer hover:underline hover:text-blue-600 transition"
                  onClick={loadDefaultImages}
                >
                  Load default images {'>>'}
                </span>
              </p>
            ) : (
              <p className="absolute w-full bg-gray-100 p-4 rounded-lg top-0 left-0 text-gray-400 text-md text-start italic">
                *Upload multiple images of the same meat sample and get the <span className="text-blue-400">average number of eggs per image</span>  with just one click. <br />
                *Don’t have any images? <span
                  className="text-blue-400 underline cursor-pointer hover:underline hover:text-blue-600 transition"
                  onClick={loadDefaultImages}
                >
                  Load default images {'>>'}
                </span>
              </p>
            )
          ) : (
            images
              .slice()
              .reverse()
              .map((img, index) => {
                const isSelected = selectedImage?.uid === img.uid;

                return (
                  <div
                    key={img.uid}
                    className={
                      `
                        relative group min-w-[160px] flex flex-col h-44 xl:h-52 flex-shrink-0  bg-gray-100 hover:bg-gray-300 overflow-hidden rounded cursor-pointer 
                        ${isSelected ? 'border-2 border-blue-500 rounded' : ''}
                        ${isCard ? '' : 'lg:w-full'}

                      `
                    }
                  >
                    {/* ✅ 左上角角标 */}
                    {isSelected && (
                      <div className="absolute z-10 top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded shadow">
                        Selected
                      </div>
                    )}
                    <img
                      src={img.url}
                      alt={"preview-" + img.uid}
                      className="w-full max-w-72 lg:max-w-none h-36 xl:h-44 object-cover transition group-hover:brightness-75"
                      onClick={() => setSelectedImage(img)}
                    />
                    <p className="text-sm ms-2 text-start group-hover:text-gray-800 mt-0 py-1 text-gray-600 truncate">
                      {img.filename}
                    </p>

                    {/* 删除按钮 */}
                    <button
                      onClick={() => handleRemove(img.uid)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded px-3 py-1 text-xl opacity-0 group-hover:opacity-100 transition"
                    >
                      ×
                    </button>
                  </div>
                );
              })
          )}
        </div>

        <div className='absolute bottom-6 left-0 right-0 flex px-6 justify-center'>
          {bottomButton && (
            <div className='flex flex-col items-center w-full'>
              {/* <p className='text-gray-400 text-sm mt-2 text-center italic mb-0'>⏳ *Feature Coming Soon </p> */}
              <button
                onClick={() => navigate('/batch/result')}
                // onClick={() => navigate('/batch/result', { state: { autoDetect: true } })}
                disabled={images.length === 0}
                className={`mt-4 w-[400px] font-bold  bg-blue-500 text-white px-4 py-2 rounded-lg 
                  ${images.length === 0 ? (
                    'bg-gray-300 cursor-not-allowed'
                    ) : (
                      'bg-blue-500 hover:bg-blue-600'
                    )}
                `}
              >
                Get Average Egg Count
              </button>
              <button onClick={clearUploads} className=" mt-1 text-sm hover:text-blue-600 text-blue-500 underline">Clear Uploads {'>>'}</button>
            </div>
          )}
        </div>
    </div>
  );
}

export default ImageUploader;