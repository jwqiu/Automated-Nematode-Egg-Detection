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
    // 获取 input 中用户选择的文件
    const fileList = event.target.files;

    // 将类数组的 fileList 转换为真正的数组
    const files = Array.from(fileList);

    // 创建一个新的数组，用于存储包含文件和预览地址的对象
    const newImages = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // 为每张图片生成一个可供浏览器预览的 URL
      const previewUrl = URL.createObjectURL(file);

      // 将文件和生成的预览地址打包成一个对象，放入数组中
      newImages.push({
        file: file,
        url: previewUrl
      });
    }

    // 更新状态，把新的图片追加到原有的 images 列表中
    setImages(function (previousImages) {
      return previousImages.concat(newImages);
    });
    event.target.value = "";

  }

  function handleRemove(indexToRemove) {
    const imageToRemove = images[indexToRemove];

    // 释放浏览器中占用的临时图片地址（节省内存）
    URL.revokeObjectURL(imageToRemove.url);

    // 如果当前删除的是已选中的图片，则清除选中状态
    if (selectedImage && selectedImage.url === imageToRemove.url) {
      setSelectedImage(null);
    }

    // 删除指定 index 的图片，并更新状态
    setImages(function (previousImages) {
      return previousImages.filter(function (_, index) {
        return index !== indexToRemove;
      });
    });
  }


  // 返回要渲染的 HTML 结构（JSX）
  return (
    <div className="w-full   max-h-[600px] 2xl:max-h-[800px] overflow-y-auto rounded-lg   mx-auto  px-8 py-6 bg-white shadow-lg ">
      {/* 图片上传的 input 元素 */}
        <div className="flex items-center w-full justify-between mb-4 mt-0 sticky z-10 bg-white p-3 rounded-lg border bg-white/60 shadow-lg top-0">
            <div className=""> 
                <p className="mb-0 text-gray-500">Images:</p>
            </div>
            <div>
                <label
                htmlFor="upload"
                className="cursor-pointer inline-block bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600"
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
        <div className="flex flex-row lg:flex-col  gap-5 overflow-x-auto">
          {images.length === 0 ? (
              <div className=" min-h-[300px] w-full flex items-center justify-center p-4 bg-gray-50 rounded shadow-inner">
                  <p className="text-gray-400 text-md  italic">No images uploaded yet.</p>
              </div>

          ) : (
              images.map(function (img, index) {
                  return (
                      <div key={index} className="relative group shadow-lg bg-gray-100 hover:bg-gray-300 rounded">
                          <img
                              src={img.url}
                              alt={"preview-" + index}
                              className="w-full h-40 object-cover rounded transition group-hover:brightness-75"
                              onClick={() => setSelectedImage(img)}
                          />
                          <p className="text-sm ms-2 text-start group-hover:text-gray-800 mt-1 py-1 text-gray-600 truncate">
                              {img.file.name}
                          </p>

                          {/* 删除按钮（鼠标移上去才显示） */}
                          <button
                              onClick={function () {
                                  handleRemove(index);
                              }}
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