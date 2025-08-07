# 🥚 Automated Nematode Egg Detection

**Automated-Nematode-Egg-Detection** is an AI-powered web application that detects nematode eggs in microscopic images using deep learning. It combines image preprocessing, model inference, and a user-friendly frontend to streamline the detection and analysis process for agricultural or biological research. This unified system facilitates easy and accurate nematode egg detection, aiming to bridge research and practical applications in agriculture.

![Nematode Egg Detection](./docs/image.png)

This project inherits and builds upon the work of [**shion92**](https://github.com/shion92), who created the original model training pipeline, including **DeepLab**, **Faster R-CNN**, **YOLO**, and various helper functions for training and evaluation.

The current version extends the original work by integrating a browser-based frontend (deployed via GitHub Pages), refactoring the backend for ONNX-based inference, and deploying the API via Azure Functions.

## 🔗 Live Demo

![HomePage Screenshot](/docs/home_screenshot.png)

👉 Try it out here:  
[**https://jwqiu.github.io/Automated-Nematode-Egg-Detection/**](https://jwqiu.github.io/Automated-Nematode-Egg-Detection/)

## 🔧 Ongoing Improvements

Moving forward, the focus will be on improving detection effectiveness in real-world scenarios. This includes building a more professional and representative test set, incorporating additional training samples from public datasets, and fine-tuning the detection models to better handle challenging cases such as blurred images, overlapping eggs, or low-contrast conditions. These improvements aim to enhance the overall reliability and robustness of the system.

---

## 🧩 Project Structure & Modules

AUTOMATED-NEMATODE-EGG-DETECTION/
├── backend-azure/        # Azure Functions backend for ONNX model inference and API deployment
├── backend-local/        # Local backend for development/testing (e.g. Flask or raw Python)
├── frontend/             # React + Tailwind CSS frontend for UI interaction, image upload, and inference result rendering
├── ModelPipeline/        # Core model code: YOLO, DeepLab, Faster R-CNN, helpers, pretrained weights
├── docs/                 # Project documentation and screenshots
├── Dataset/              # Optional training/evaluation datasets (may not be tracked in Git)
├── node_modules/         # Frontend dependencies managed via npm (excluded from Git)
├── venv/                 # Python virtual environment (excluded from Git)
├── README.md             # Project documentation (you are here)
├── requirements.txt      # Python dependencies for backend + model
├── .gitignore            # Git ignore rules
├── package.json          # Frontend config for npm
└── package-lock.json     # Exact npm dependency versions

---

## 🛠️ Tech Stack

- **Frontend:** React + Tailwind CSS + Vite
- **Backend (Cloud):** Azure Functions (Python, ONNX Runtime)
- **Backend (Local):** Flask (for development/testing)
- **Model Frameworks:** YOLO, DeepLab, Faster R-CNN (PyTorch-based)
