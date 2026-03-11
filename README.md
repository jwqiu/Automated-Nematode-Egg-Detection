## 1. Project Overview

### 1.1 Background

Parasite infections are a major problem for farm animals and can cause significant losses for farmers.
To evaluate infection severity, technicians typically examine fecal samples under a microscope, manually identify parasite eggs, and count the number of eggs in each sample.

<img width="360" height="270" alt="image" src="https://github.com/user-attachments/assets/cff5b22e-66b4-42a0-a2b7-c2a87885afd6" />

### 1.2 Problem

Manual egg counting is highly repetitive and time-consuming, which can become a bottleneck in parasite research and routine animal health monitoring.

### 1.3 Solution

This project builds an AI-powered web system for automated parasite egg detection and counting. Users can upload folders of microscope images (each folder representing one slide). The system automatically detects parasite eggs in each image and calculates the total egg count. The detection pipeline combines a YOLOv8 detector with a CNN-based ellipse classifier to improve accuracy.

### 1.4 Previous Work

This project builds upon the work of [**shion92**](https://github.com/shion92), who developed the original model training pipeline including DeepLab, Faster R-CNN, YOLO, and supporting training and evaluation utilities.

Based on this foundation, I extended the project by:
- improving overall detection performance by introducing post-detection processing to refine detection confidence and better aligning the dataset with real-world usage
- designing and building a full web application from scratch for end-to-end use


## 2. Live Demo

### 2.1 Screenshot

![HomePage Screenshot](/docs/home_screenshot.png)

<img width="1436" height="817" alt="image" src="https://github.com/user-attachments/assets/ece4a404-0b56-408e-9ad1-68e4b6f33956" />

### 2.2 Live Site

👉 Try it out here:  
[**https://jwqiu.github.io/Automated-Nematode-Egg-Detection/**](https://jwqiu.github.io/Automated-Nematode-Egg-Detection/)


## 3. System Design and Implementation

### 3.1 System Overview

The system consists of a React frontend deployed on GitHub Pages, a Python backend deployed on Azure Functions, a YOLOv8-based detection pipeline with CNN-based confidence refinement, and a storage layer using PostgreSQL and Azure Blob Storage.

![System Architecture](/docs/system_overview.jpeg)

### 3.2 Tech Stack for this Project

- **Frontend:** React, Tailwind CSS, Vite 
- **Backend :** Python, Azure Function
- **Machine Learning & AI:** YOLO, CNN, PyTorch, ONNX Runtime
- **Database & Storage:** Azure Blob Storage + Azure Database for PostgreSQL Flexible Server
- **Deployment:** GitHub Pages(Frontend), Azure Function(Backend)

### 3.3 Model Components

#### 1) Model Overview

There are two models used in this project:
-  The main model is YOLOv8s, which identifies candidate egg objects. it takes the user-uploaded images(after preprocessing) as input and outputs the bounding-box coordinates and detection confidence for all detected objects
-  The second model is a CNN-Based classifier, which evaluates each candidate egg based on its shape (most typical egg have an elliptical appearance) and adjusts YOLO's detection confidence accordingly. Before running this model, each candidate region is cropped from the original image and processed into a 64×64 grayscale image. The CNN takes this small image as input and outputs logits.
The backend then uses these logits to recalculate the final detection confidence before returning the results to the frontend

#### 2) Final Model Performance

The main metrics used to model performance in this project are F1 score and mAP50, the table below shows the overall performance of the integrated two-model system.

| Model           | Test F1 | Test mAP50 | Validation F1 | Validation mAP50 | Comment               |
|-----------------|---------|------------|----------------|------------------|------------------------|
| yolov8s_sgd_lr0001_max_E200P20_AD_0914 + CNN Ellipse Classifier | 99.1%  | 99.8%     | 96.15%         | 90.91%           | Lower validation performance because the validation set intentionally contains more difficult cases.|


## 4. Dataset

The dataset used in this project comes from two main sources: 
- First, lab-captured images provided by an industry client — the amount of this data is limited, but it reflects real-world cases. 
- Second, open-source images collected from the internet — this dataset is much larger, but it may not fully represent real-world scenarios

| Stage          | Dataset Source     | Test | Validation | Training | Other |
|----------------|---------------------|------|------------|----------|--------|
| Project Start  | Lab-captured images | 17   | 17         | 79       | 0      |
|                | Open-source images  | 0    | 0          | 0        | 0      |
| Currently      | Lab-captured images | 66   | 66         | 225      | 55     |
|                | Open-source images  | 0    | 0          | 68       | 21013  |


## 5. Folder Structure & Modules

```bash
AUTOMATED-NEMATODE-EGG-DETECTION/
├── backend-azure/        # Azure Functions backend for ONNX model inference and API deployment
├── backend-local/        # Local backend for development/testing (e.g. Flask or raw Python)
├── frontend/             # React + Tailwind CSS frontend for UI interaction, image upload, and inference result rendering
├── ModelPipeline/        # Core model code: YOLO, DeepLab, Faster R-CNN, helpers, pretrained weights
├── docs/                 # Project documentation and screenshots
├── Dataset/              # Optional training/evaluation datasets (may not be tracked in Git)
├── node_modules/         # Frontend dependencies (not tracked by Git)
├── venv/                 # Python virtual environment (excluded from Git)
├── README.md             # Project documentation (you are here)
├── requirements.txt      # Python dependencies for backend + model
├── .gitignore            # Git ignore rules
├── package.json          # Frontend config for npm
└── package-lock.json     # Exact npm dependency versions
```
