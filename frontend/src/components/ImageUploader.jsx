import React from 'react';
// index.js
const useState = React.useState;

// React 组件函数，名称为 ImageUploader
function ImageUploader({ images, setImages, setSelectedImage,selectedImage  }) {
  // 用 useState 创建一个状态变量 images，用于保存上传的图片
  // 初始值是一个空数组 []
  // const [images, setImages] = React.useState([]);
  // const [selectedImage, setSelectedImage] = React.useState(null);

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
    }, "image/jpeg", 0.8);
  }

  // 处理上传图片的函数
  function handleImageUpload(event) {
    const fileList = event.target.files;
    const files = Array.from(fileList);

    files.forEach(async (file, index) => {
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

            if (index === files.length - 1) {              
              setSelectedImage({
                file: blob,
                url: previewUrl,
                uid: newUid,
                filename: file.name,
                detected: false,
                boxes: null,
              });
            }
          // } catch (err) {
          //   console.error("Upload failed:", err);
          // }
        }, "image/jpeg", 1); // 第三个参数为压缩质量（可选）
      };
    });

    event.target.value = "";
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





  // 返回要渲染的 HTML 结构（JSX）
  return (
    <div className=" flex-1 overflow-auto rounded-lg    px-8 py-6 bg-white shadow-lg ">
      {/* 图片上传的 input 元素 */}
        <div className="flex items-center w-full bg-gray-200/60  justify-between mb-6 mt-0 sticky z-10  p-3 rounded-lg   shadow-lg top-0">
            <div className=""> 
                <p className="mb-0 text-gray-500 ms-2">Images:</p>
            </div>
            <div>
                <label
                htmlFor="upload"
                className="cursor-pointer font-bold inline-block bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600"
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
        <div className="flex flex-row  lg:flex-col gap-6 overflow-x-auto">
          {images.length === 0 ? (
            <p className="text-gray-400 text-md text-center italic">No images uploaded yet.</p>
          ) : (
            images
              .slice()         // 拷贝一份，防止修改原数组
              .reverse()       
              .map((img, index) => {
              const isSelected = selectedImage?.uid === img.uid; // ✅ 判断选中

              return (
                <div
                  key={img.uid}
                  className={`relative group min-w-[160px] flex-shrink-0 lg:w-full bg-gray-100 hover:bg-gray-300 overflow-hidden rounded cursor-pointer ${
                    isSelected ? 'border-4 border-blue-500 rounded' : ''
                  }`}
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
                    className="w-full max-w-72 lg:max-w-none h-40 xl:h-55 object-cover transition group-hover:brightness-75"
                    onClick={() => setSelectedImage(img)}
                  />
                  <p className="text-sm ms-2 text-start group-hover:text-gray-800 mt-1 py-1 text-gray-600 truncate">
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
    </div>
  );
}

export default ImageUploader;