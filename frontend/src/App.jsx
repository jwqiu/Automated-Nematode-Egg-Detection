// @ts-ignore
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
// @ts-ignore
import Homepage from './pages/Homepage';
// @ts-ignore
import BatchModePage from './pages/Batchmodepage';
// @ts-ignore
import BatchResultPage from './pages/BatchResultPage';
// @ts-ignore
import FolderModePage from './pages/Foldermodepage';
// @ts-ignore
import { ImageProvider } from './context/ImageContext';
// @ts-ignore
import { API_BASE, isElectron, IS_ELECTRON } from './apiBase';
// @ts-ignore
import React, { useState, useEffect } from 'react';


function App() {

  const [ready, setReady] = useState(!IS_ELECTRON);

  // when this application is running in electron, we need to check if the backend is ready
  useEffect(() => {
    if (!IS_ELECTRON) return; 

    const check = async () => {
      const base = API_BASE;
      const start = Date.now();
      let interval = 300;

      // this code repeatedly calls the backend /health endpoint( with an increasing interval starting at 300ms) until the server responds ok and set ready to true
      while (Date.now() - start < 30000) {
        try {
          const r = await fetch(`${base}/health`, { cache: 'no-store' });
          if (r.ok) {
            setReady(true);
            return;
          }
        } catch {}
        await new Promise(r => setTimeout(r, interval));
        interval = Math.min(interval + 300, 1500);
      }
      setReady(false); 
    };

    check();
  }, []);

  return (
    <ImageProvider>
      {/* <Router basename="/Automated-Nematode-Egg-Detection"> */}
      <Router>
        <Routes>
          <Route path="/" element={<Homepage ready={ready} />} />
          <Route path="/batch" element={<BatchModePage ready={ready} />} />
          <Route path="/batch/result" element={<BatchResultPage />} />
          <Route path="/folder" element={<FolderModePage ready={ready} />} />

        </Routes>
      </Router>
    </ImageProvider>
  );
}

export default App;

