// @ts-ignore
import React from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { decode, decodeImage, toRGBA8 } from "utif";

// ==========================================
// Image processing helper functions
// ==========================================

// this function resizes an image to fit inside a 608x608 square while keeping its aspect ratio, pads the remaining area with gray color, and outputs a PNG blob
// the callback here is a function that we pass in to handle the result when the blob is ready
// we need to resize and pad the image because our model was trained on 608x608 images with padding, so we need to do the same preprocessing before running inference
export function resizeAndPadImage(img, callback) {
  const targetSize = 608;
  const canvas = document.createElement("canvas");
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext("2d"); // ctx = 2D drawing API, used to draw rectangles and images

  const ratio = Math.min(targetSize / img.width, targetSize / img.height); // computing scale ratio
  const newWidth = img.width * ratio;
  const newHeight = img.height * ratio;

  const dx = (targetSize - newWidth) / 2; // calculates how much empty space remains on each side
  const dy = (targetSize - newHeight) / 2; // calculates how much empty space remains on each side
  ctx.fillStyle = "rgb(114,114,114)";
  ctx.fillRect(0, 0, targetSize, targetSize);

  ctx.drawImage(img, dx, dy, newWidth, newHeight); // draw the scaled image
  // canvas.toBlob() is asynchronous, it does not product the result immediately, so use a callback instead of return
  canvas.toBlob((blob) => callback(blob), "image/png"); // convert the canvas to a PNG blob, there is no default quality parameter for PNG, it is always full quality
}

// this function is used to convert a TIFF file to PNG format
// TIFF is the standard format for images provided by our client, but our model and frontend do not support this format, so we need to convert it to PNG first
export async function convertTifToPng(file) {
  const name = file.name.toLowerCase();
  if (!name.endsWith(".tif") && !name.endsWith(".tiff")) return file;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const buffer = new Uint8Array(reader.result);
      const ifds = decode(buffer);
      const validIfd = ifds.find((ifd) => ifd.t273 && ifd.t279);
      if (!validIfd) return resolve(file);
      decodeImage(buffer, validIfd);
      const width  = validIfd.t256?.[0];
      const height = validIfd.t257?.[0];
      if (!width || !height) return resolve(file);
      const rgba = toRGBA8(validIfd);
      if (!rgba.length) return resolve(file);
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      const imgData = ctx.createImageData(width, height);
      imgData.data.set(rgba);
      ctx.putImageData(imgData, 0, 0);
      canvas.toBlob((blob) => {
        const pngFile = new File([blob], file.name.replace(/\.(tif|tiff)$/i, ".png"), { type: "image/png" });
        resolve(pngFile);
      }, "image/png");
    };
    reader.readAsArrayBuffer(file);
  });
}

// this function converts a Blob object to a base64-encoded string, then it can be sent to the backend API for inference
// however, I already moved the base64 conversion logic into DetectionResult.jsx, so i don't need to use this function during image upload
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

// ==========================================
// Main UI component
// ==========================================

function ImageUploader({ images, setImages, setSelectedImage, selectedImage, bottomButton = false, defaultHints = true, isCard = false, ready }) {

  const navigate = useNavigate();
  const useState = React.useState;
  const useEffect = React.useEffect;
  const useRef = React.useRef;

  const [uploadCompleted, setUploadCompleted] = useState(false);
  const imageListRef = useRef(null);

  // ---------------------
  // image upload handler
  // ---------------------

  // user can upload images manually
  async function handleImageUpload(event) {
    
    const fileList = event.target.files;
    const files = Array.from(fileList); // create an array from the FileList object, copies each item from fileList into a new array

    // currently, each file is processed by convertTifToPng, which convert the image file to PNG if it is in TIFF format, this helper function contains a format check logic
    // TODO: however, it is good practice to keep helper function focused and specialized, therefore, the format check logic should be moved to the main function here before calling convertTifToPng
    const uploadTasks = files.map(async (originalFile) => {
      const file = await convertTifToPng(originalFile); 

      return new Promise((resolve) => {
      // create an Image object to load the file
        const img = new Image();
        img.src = URL.createObjectURL(file); // this URL is used only to load the image into memory

        img.onload = () => { // onload here means run this function when the image has finished loading
          resizeAndPadImage(img, async (blob) => {
            const previewUrl = URL.createObjectURL(blob); // this creates a preview URL for the processed image, this URL is different from img.src, because they represent different images
            const formData = new FormData();
            formData.append("image", blob, file.name); 
            const newUid = crypto.randomUUID();
              // add the new image to the images state
              setImages((prev) =>
                prev.concat({
                  file: blob,
                  originalUrl: previewUrl,
                  annotatedUrl: null,
                  uid: newUid,
                  filename: file.name,
                  detected: false,
                  boxes: null,
                })
              );
              // at this point, the new image has been added to the image state
              resolve();
          }); 
        };
      });
    });
    await Promise.all(uploadTasks); 
    setUploadCompleted(true); 
    event.target.value = "";
  }

  // this effect is used to automatically select the last uploaded image and scroll the image list to the top
  useEffect(() => {
    if (uploadCompleted && images.length > 0) { // this ensures the effect runs only when there is at least one image
      setSelectedImage(images[images.length - 1]);
      setUploadCompleted(false); // 重置状态

      // this code scrolls the image list to the top smoothly after image updated
      setTimeout(() => {
        const el = imageListRef.current;
        if (!el) return;
        el.scrollTo({
          top: 0,
          left: 0,
          behavior: "smooth",
        });
      }, 0);  // ensure it runs after DOM update
    }
  }, [images]);// this effect runs every time images state changes

  // user can also load default images provided 
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
          const objectUrl = URL.createObjectURL(blob);  // temporary URL for loading the image

          // resize and pad the image, same as in handleImageUpload
          const resizedBlob = await new Promise((resolve) => {
            const img = new Image();
            img.src = objectUrl;
            img.onload = () => {
              resizeAndPadImage(img, (resizedBlob) => {
                resolve(resizedBlob);
              });
            };
          });

          const previewUrl = URL.createObjectURL(resizedBlob);
          // const base64 = await convertToBase64(resizedBlob); // we don't need to convert to base64 here anymore

          return {
            file: resizedBlob,
            originalUrl: previewUrl,
            annotatedUrl: null,
            uid: crypto.randomUUID(),
            filename: url.split("/").pop(),
            // image_base64: base64,
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

  // ---------------------
  // image remove handler
  // ---------------------
  
  // remove a single image
  function handleRemove(uidToRemove) {
    const imgIndex = images.findIndex(img => img.uid === uidToRemove);
    if (imgIndex === -1) return;

    const img = images[imgIndex];

    URL.revokeObjectURL(img.url); // releases a temporary URL that was previously created

    // update images state by filtering out the removed image
    const newImages = images.filter(img => img.uid !== uidToRemove);
    setImages(newImages);

    // if the removed image is currently selected, clear the selection
    if (selectedImage?.uid === uidToRemove) {
      const selectedUrl = selectedImage.annotatedUrl || selectedImage.originalUrl;
      if (typeof selectedUrl === "string" && selectedUrl.startsWith("blob:")) {
        URL.revokeObjectURL(selectedUrl); // releases a temporary URL that was previously created
      }
      setSelectedImage(null);
    }
  }

  // clear all images at once
  function clearUploads() {
    setImages([]);
    setSelectedImage(null);
  }

  return (
    <div  className={`relative min-h-0 flex flex-col rounded-lg border  px-8 py-6 bg-white shadow-lg
      ${isCard ? 'h-[80vh] min-h-[300px] pb-24 '  : 'h-full'}
    `}>
        {/* image list header with upload button */}
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
                className="cursor-pointer font-bold inline-block bg-white border border-blue-500 text-blue-500 rounded-lg px-3 py-2 rounded-xl hover:text-white hover:bg-blue-500"
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

        {/* image list area */}
        <div ref={imageListRef} className={
          ` gap-6 overflow-auto 
          ${isCard ? 'grid grid-cols-2 gap-6  relative min-h-32    '  : 'flex flex-row lg:flex-col'}
          `
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
                        relative group min-w-[160px] shadow-lg flex flex-col h-44 xl:h-52 flex-shrink-0  bg-gray-100 hover:bg-gray-300 overflow-hidden rounded cursor-pointer 
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
                      src={img.annotatedUrl || img.originalUrl || img.url}
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
        
        {/* batch detection action, only used in batch detection page */}
        <div className='absolute bottom-4 left-0 right-0 flex px-6 justify-center'>
          {bottomButton && (
            <div className='flex flex-col items-center w-full'>
              {/* <p className='text-gray-400 text-sm mt-2 text-center italic mb-0'>⏳ *Feature Coming Soon </p> */}
              <button
                onClick={() => navigate('/batch/result')}
                // onClick={() => navigate('/batch/result', { state: { autoDetect: true } })}
                disabled={images.length === 0 || !ready}
                className={`mt-4 w-[400px]   bg-blue-500  px-4 py-2 rounded-lg 
                  ${images.length === 0 || !ready ? (
                    'bg-gray-200 text-gray-400 cursor-not-allowed'
                    ) : (
                      'bg-blue-500 hover:bg-blue-600 text-white'
                    )}
                `}
              >
                { !ready ? 'Starting backend...' : 'Start Detection'}
              </button>
              <button onClick={clearUploads} className=" mt-1 text-sm hover:text-blue-600 text-blue-500 underline">Clear Uploads {'>>'}</button>
            </div>
          )}
        </div>
    </div>
  );
}

export default ImageUploader;
