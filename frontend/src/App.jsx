// frontend/src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Homepage from './pages/Homepage';
import BatchModePage from './pages/Batchmodepage';
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

