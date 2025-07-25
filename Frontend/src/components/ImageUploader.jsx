import React from 'react';
// index.js
const useState = React.useState;

// React 组件函数，名称为 ImageUploader
function ImageUploader({ images, setImages, setSelectedImage,selectedImage  }) {
  // 用 useState 创建一个状态变量 images，用于保存上传的图片
  // 初始值是一个空数组 []
  // const [images, setImages] = React.useState([]);
  // const [selectedImage, setSelectedImage] = React.useState(null);

  // 处理上传图片的函数
  function handleImageUpload(event) {
    const fileList = event.target.files;
    const files = Array.from(fileList);

    const newImages = [];

    files.forEach((file, index) => {
      const previewUrl = URL.createObjectURL(file);

      const formData = new FormData();
      formData.append("image", file);

      // 发送 POST 请求到后端上传图片
      fetch("http://127.0.0.1:5001/upload", {
        method: "POST",
        body: formData
      })
        .then(async (res) => {
          if (!res.ok) {
            // 后端返回 404、500 等状态码时，避免 json 报错
            const errorText = await res.text();
            throw new Error(`Upload failed: ${res.status} ${errorText}`);
          }
          return res.json();
        })
        .then((data) => {
          setImages((previousImages) => previousImages.concat({
            file: file,
            url: previewUrl,
            uid: data.uid,
            filename: data.filename,
            detected: false,
            boxes: null
          }));
          if (index === 0) {
            setSelectedImage({
              file: file,
              url: previewUrl,
              uid: data.uid,
              filename: data.filename,
              detected: false,
              boxes: null
            });
          }
        })
        .catch((err) => {
          console.error("Upload failed:", err);
        });
    });
    event.target.value = "";
  }

  function deleteImageOnServer({ uid, filename }) {
    return fetch("http://127.0.0.1:5001/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, filename })
    })
    .then(res => {
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      return res.json();
    });
  }


  function handleRemove(indexToRemove) {
    const img = images[indexToRemove];

    // 先调用后端接口
    deleteImageOnServer(img)
      .then((data) => {
        if (data.status !== "success") {
          console.error("删除失败：", data.error);
          return;
        }

        // 后端删成功，前端再做清理
        URL.revokeObjectURL(img.url);
        setImages(prev =>
          prev.filter((_, idx) => idx !== indexToRemove)
        );
        if (selectedImage?.uid === img.uid) {
          // 如果是 blob URL，也要 revoke
          if (selectedImage.url.startsWith("blob:")) {
            URL.revokeObjectURL(selectedImage.url);
          }
          setSelectedImage(null);
        }
      })
      .catch(err => {
        console.error("删除过程中出错：", err);
      });
  }


  // 返回要渲染的 HTML 结构（JSX）
  return (
    <div className="w-full   max-h-[600px] 2xl:max-h-[800px] overflow-y-auto rounded-lg   mx-auto  px-8 py-6 bg-white shadow-lg ">
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
        <div className="flex flex-row lg:min-h-[500px] lg:flex-col gap-6 overflow-x-auto">
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
                  key={index}
                  className={`relative group min-w-[160px] flex-shrink-0 lg:w-full bg-gray-100 hover:bg-gray-300 overflow-hidden rounded cursor-pointer ${
                    isSelected ? 'border-4 border-gray-400 rounded' : ''
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
                    alt={"preview-" + index}
                    className="w-full max-w-72 lg:max-w-none h-40 xl:h-55 object-cover transition group-hover:brightness-75"
                    onClick={() => setSelectedImage(img)}
                  />
                  <p className="text-sm ms-2 text-start group-hover:text-gray-800 mt-1 py-1 text-gray-600 truncate">
                    {img.file.name}
                  </p>

                  {/* 删除按钮 */}
                  <button
                    onClick={() => handleRemove(index)}
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