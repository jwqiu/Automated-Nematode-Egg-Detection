// @ts-ignore
import React, { useState, useRef, useEffect } from 'react';

// ==========================================
// Image Preview Component (Used in HomePage)
// ==========================================

function ImagePreview({ selectedImage }) {

  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // handle mouse wheel zooming in/out
  const handleWheel = e => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => {
      const next = prev * delta;
      return Math.min(Math.max(next, 0.5), 5);
    });
  };

  // start dragging and record the initial mouse position
  const handleMouseDown = e => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  // stop dragging when mouse is released
  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // handle mouse movement to pan the image while dragging
  const handleMouseMove = e => {
    if (!isDragging.current) return;
    e.preventDefault();
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    setTranslate(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  // reset zoom level and position back to default
  const handleReset = () => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  };

  // Container layout styles for the image preview area
  const containerClass = `
    rounded-lg min-h-[500px] lg:min-h-0  flex flex-col flex-1 overflow-y-auto
    border bg-white shadow-lg overflow-hidden
  `;

  // while the user is interacting with the image, don't let the page move
  const disableBodyScroll = () => { document.body.style.overflow = 'hidden'; };
  // restore page scroll when not interacting
  const enableBodyScroll  = () => { document.body.style.overflow = 'auto'; };

  return (
    <div className={containerClass}>
      {selectedImage ? (
        <div
          // ref={containerRef}
          className="
          relative  flex-1 h-full flex overflow-hidden
          image-preview-container
            justify-center items-center
            cursor-grab
            touch-none        /* 禁止触摸默认滚动 */
            overscroll-none   /* 禁止边缘滚动链 */
          "
          // 缩放 & 拖拽
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}

          // 进/出时彻底关/开页面滚动
          onMouseEnter={disableBodyScroll}
          onMouseLeave={e => {
              handleMouseUp();      // 结束拖拽
              enableBodyScroll();   // 恢复页面滚动
            }}          
          onTouchStart={disableBodyScroll}
          onTouchEnd={enableBodyScroll}

          // 触摸滑动也拦截
          onTouchMove={e => e.preventDefault()}
        >
          <img
            src={selectedImage.annotatedUrl || selectedImage.originalUrl || selectedImage.url}
            alt="Selected or Detection Result"
            draggable={false}
            className="w-full h-auto object-contain"
            style={{
              transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
              transition: isDragging.current
                ? 'none'
                : 'transform 0.1s ease-out',
              // maxWidth: '100%',
              // maxHeight: '100%',
              // width: '100%',
              // height: 'auto', 
            }}
          />
          
          <button
            onClick={handleReset}
            className="absolute top-3 right-3 bg-white p-1 rounded shadow hover:bg-gray-100"
            title="Reset"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
            </svg>
          </button>


        </div>
      ) : (
        <div className="flex items-center justify-center h-full p-8">
          <p className="italic text-gray-400">Upload an image to preview it here.</p>
        </div>
      )}
    </div>
  );
}

export default ImagePreview;
