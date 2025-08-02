// frontend/src/App.jsx
// @ts-ignore
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// @ts-ignore
import Homepage from './pages/Homepage';
// @ts-ignore
import BatchModePage from './pages/Batchmodepage';
// @ts-ignore
import { ImageProvider } from './context/ImageContext';


function App() {
  return (
    <ImageProvider>
      <Router basename="/Automated-Nematode-Egg-Detection">
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/batch" element={<BatchModePage />} />
        </Routes>
      </Router>
    </ImageProvider>
  );
}

export default App;

