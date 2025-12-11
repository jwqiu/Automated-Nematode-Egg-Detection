## 1. Introduction

### 1.1 Background

Parasite infections are a major problem for farm animals and can cause significant losses for farmers. The most common way to evaluate how serious the infection is by checking fecal samples under a microscope. More specifically, The technician need to identify all the parasite eggs in the sample and counts the total number, the counting result is an indicator that shows how serious the infection is and determines what treatment should be taken next.

<img width="360" height="270" alt="image" src="https://github.com/user-attachments/assets/cff5b22e-66b4-42a0-a2b7-c2a87885afd6" />

### 1.2 Problem

The current manual egg-counting process is highly repetitive and time-consuming, which can be a serious bottleneck in parasite research and in regular animal health monitoring.

### 1.3 Solution

#### 1.3.1 Overview

Building an automated way to identify and count the eggs, make the process faster, and reduces the amount of human effort required. 

#### 1.3.2 Process Design

The diagram below shows the difference between the current manual egg-counting process and the automated process I designed. 

<img width="469" height="439" alt="image" src="https://github.com/user-attachments/assets/4b2b2751-79eb-4730-b8d0-115f6e701f4c" />

#### 1.3.3 Key Feature

This project forms a key part of that automated process, **allowing users to upload folders of images - each folder represent images captured from a single slide - and use AI models to detect parasite eggs in every image and automatically count the total eggs identified per folder(slide)**

### 1.4 Previous Work

#### 1.4.1 Project Foundation

This project inherits and builds upon the work of [**shion92**](https://github.com/shion92), who created the original model training pipeline, including DeepLab, Faster R-CNN, YOLO, and various helper functions for training and evaluation. The previous work laid a solid foundation with powerful model training tools and provided some baseline models to start with. 

#### 1.4.2 What I added to this Project

I extended it by developing a full web application, increasing the dataset's diversity, improving the model's performance, and adding post detection process to further enhance system accuracy.

## 2. System Design and Implementation

### 2.1 System Design

The following diagram summarizes the architecture of the Automated Egg Counting system, it illustrates the complete workflow - from uploading folders/images, preproessing, model inference, and post-detection processing, to visualizing results and storing relabel results.

![System Architecture](/docs/system_architecture.png)

### 2.2 Tech Stack for this Project

- **Frontend:** React, Tailwind CSS, Vite 
- **Backend :** Python, Flask
- **Machine Learning & AI:** YOLO, CNN, PyTorch, ONNX Runtime
- **Database & Storage:** Azure Blob Storage + Azure Database for PostgreSQL Flexible Server
- **Deployment:** GitHub Pages(Frontend), Azure Function(Backend)

### 2.3 Model Components

#### 2.3.1 Model Overview

There are two models used in this project:
-  The main model is YOLOv8s, which identifies candidate egg objects. it takes the user-uploaded images(after preprocessing) as input and outputs the bounding-box coordinates and detection confidence for all detected objects
-  The second model is a CNN-Based classifier, which evaluates each candidate egg based on its shape (most typical egg have an elliptical appearance) and adjusts YOLO's detection confidence accordingly. Before running this model, each candidate region is cropped from the original image and processed into a 64×64 grayscale image. The CNN takes this small image as input and outputs logits.
The backend then uses these logits to recalculate the final detection confidence before returning the results to the frontend

#### 2.3.2 Final Model Performance

The main metrics used to model performance in this project are F1 score and mAP50, the table below shows the overall performance of the integrated two-model system.

| Model           | Test F1 | Test mAP50 | Validation F1 | Validation mAP50 | Comment               |
|-----------------|---------|------------|----------------|------------------|------------------------|
| yolov8s_sgd_lr0001_max_E200P20_AD_0914 + CNN Ellipse Classifier | 99.1%  | 99.8%     | 96.15%         | 90.91%           | 1. Best-performing model this semester.<br>2. Lower validation performance due to more difficult cases. |

## 3. Dataset

The dataset used in this project comes from two main sources: 
- First, lab-captured images provided by an industry client — the amount of this data is limited, but it reflects real-world cases. 
- Second, open-source images collected from the internet — this dataset is much larger, but it may not fully represent real-world scenarios

| Stage          | Dataset Source     | Test | Validation | Training | Other |
|----------------|---------------------|------|------------|----------|--------|
| Project Start  | Lab-captured images | 17   | 17         | 79       | 0      |
|                | Open-source images  | 0    | 0          | 0        | 0      |
| Currently      | Lab-captured images | 66   | 66         | 225      | 55     |
|                | Open-source images  | 0    | 0          | 68       | 21013  |


## 4. Live Demo

### 4.1 Screenshot

![HomePage Screenshot](/docs/home_screenshot.png)

<img width="1436" height="817" alt="image" src="https://github.com/user-attachments/assets/ece4a404-0b56-408e-9ad1-68e4b6f33956" />

### 4.2 Live Site

👉 Try it out here:  
[**https://jwqiu.github.io/Automated-Nematode-Egg-Detection/**](https://jwqiu.github.io/Automated-Nematode-Egg-Detection/)

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
