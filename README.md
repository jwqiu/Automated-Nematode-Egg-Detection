## 1. Introduction

### 1.1 Background

Parasite infections are a major problem for farm animals and can cause significant losses for farmers. The most common way to evaluate how serious the infection is by checking fecal samples under a microscope. More specifically, The technician need to identify all the parasite eggs in the sample and counts the total number, the counting result is an indicator that shows how serious the infection is and determines what treatment should be taken next.

<img width="360" height="270" alt="image" src="https://github.com/user-attachments/assets/cff5b22e-66b4-42a0-a2b7-c2a87885afd6" />


### 1.2 Problem

The current manual egg-counting process is highly repetitive and time-consuming, which can be a serious bottleneck in parasite research and in animal health monitoring.

### 1.3 Solution

Building an automated way to identify and count the eggs, make the process faster, and reduces the amount of human effort required. The diagram below shows the difference between the current manual egg-counting process and the automated process I designed. This project forms a key part of that automated process

<img width="469" height="439" alt="image" src="https://github.com/user-attachments/assets/4b2b2751-79eb-4730-b8d0-115f6e701f4c" />

### 1.4 Previous Work

This project inherits and builds upon the work of [**shion92**](https://github.com/shion92), who created the original model training pipeline, including **DeepLab**, **Faster R-CNN**, **YOLO**, and various helper functions for training and evaluation.

The original work laid a solid foundation with powerful model training tools. I extended it by developing a full web application, expanding the dataset, and further improving the model’s performance

## 2. System Architecture & Tech Stack

### 2.1 Overview

![System Architecture](/docs/System%20Architecture.png)

### 2.2 Tech Stack for this Project

- **Frontend:** React, Tailwind CSS, Vite — deployed via GitHub Pages
- **Backend (Cloud):** Azure Functions (Python, ONNX Runtime)
- **Backend (Local):** Flask — for development and testing
- **Model Frameworks:** YOLO, DeepLab, and Faster R-CNN — all based on PyTorch
- **Database & Storage:** Azure Blob Storage + Azure Database for PostgreSQL Flexible Server

## 3. Model Details & Evaluation Results

Details will be added soon.

## 4. Dataset

The dataset used in this project comes from two main sources. First, lab-captured images provided by an industry client — the amount of this data is limited, but it reflects real-world cases. Second, open-source images collected from the internet — this dataset is much larger, but it may not fully represent real-world scenarios

| Stage          | Dataset Source     | Test | Validation | Training | Other |
|----------------|---------------------|------|------------|----------|--------|
| Project Start  | Lab-captured images | 17   | 17         | 79       | 0      |
|                | Open-source images  | 0    | 0          | 0        | 0      |
| Currently      | Lab-captured images | 66   | 66         | 225      | 55     |
|                | Open-source images  | 0    | 0          | 68       | 21013  |


## 5. Live Demo

### 5.1 Screenshot

![HomePage Screenshot](/docs/home_screenshot.png)

<img width="1436" height="817" alt="image" src="https://github.com/user-attachments/assets/ece4a404-0b56-408e-9ad1-68e4b6f33956" />

### 5.2 Live Site

👉 Try it out here:  
[**https://jwqiu.github.io/Automated-Nematode-Egg-Detection/**](https://jwqiu.github.io/Automated-Nematode-Egg-Detection/)

## 6. Folder Structure & Modules

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
