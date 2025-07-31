import { createContext, useState } from 'react';

export const ImageContext = createContext();

export function ImageProvider({ children }) {
  const [menuTitle, setMenuTitle] = useState('Image Mode');
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);

  return (
    <ImageContext.Provider value={{
      menuTitle, setMenuTitle,
      images, setImages,
      selectedImage, setSelectedImage,
    }}>
      {children}
    </ImageContext.Provider>
  );
}