## 1. Project Overview

### 1.1 Background

Parasite infections are a major problem for farm animals and can cause significant losses for farmers.
To evaluate infection severity, technicians typically examine fecal samples under a microscope, manually identify parasite eggs, and count the number of eggs in each sample.

<img width="360" height="270" alt="image" src="https://github.com/user-attachments/assets/cff5b22e-66b4-42a0-a2b7-c2a87885afd6" />

### 1.2 Problem

Manual egg counting is highly repetitive and time-consuming, which can become a bottleneck in parasite research and routine animal health monitoring.

### 1.3 Solution

This project builds an AI-powered web system for automated parasite egg detection and counting. Users can upload folders of microscope images (each folder representing one slide). The system automatically detects parasite eggs in each image and calculates the total egg count. 

### 1.4 Previous Work

This project builds upon the work of [**shion92**](https://github.com/shion92), who developed the original model training pipeline including DeepLab, Faster R-CNN, YOLO, and supporting training and evaluation utilities.

Based on this foundation, I extended the project by focusing on two aspects:

- improving overall detection performance through post-detection processing to refine detection confidence and better align the dataset with real-world usage
- transforming the trained models into a usable web prototype by designing and building a full-stack web application and integrating the detection pipeline


## 2. Live Demo

### 2.1 Screenshot

![HomePage Screenshot](/docs/home_screenshot.png)

<img width="1436" height="817" alt="image" src="https://github.com/user-attachments/assets/ece4a404-0b56-408e-9ad1-68e4b6f33956" />

### 2.2 Live Site

👉 Try it out here:  
[**https://jwqiu.github.io/Automated-Nematode-Egg-Detection/**](https://jwqiu.github.io/Automated-Nematode-Egg-Detection/)


## 3. System Design and Implementation

### 3.1  Overview

The system consists of a React frontend deployed on GitHub Pages, a Python backend deployed on Azure Functions, a YOLOv8-based detection pipeline with CNN-based confidence refinement, and a storage layer using PostgreSQL and Azure Blob Storage.

![System Architecture](/docs/system_overview.jpeg)

### 3.2 Tech Stack for this Project

- **Frontend:** React, Tailwind CSS, Vite 
- **Backend :** Python (Azure Functions)
- **Machine Learning & AI:** YOLO, CNN classifier, PyTorch, ONNX Runtime
- **Database & Storage:** Azure Blob Storage · Azure PostgreSQL (Flexible Server)
- **Deployment:** GitHub Pages(Frontend), Azure Function(Backend)

### 3.3 Model Components

#### 1) Main Model

The main model used in this project is YOLOv8s, which detects candidate egg objects. It takes the user-uploaded images (after preprocessing) as input and outputs bounding boxes and detection confidence for all detected objects.

#### 2) Examples of Detection Results and Errors

However, the main detection model can still make mistakes. The Image below shows examples of accurate detections and common errors.

![Examples of Detection Results and Errors](/docs/Detection_Examples.jpeg)

#### 3) How I Address the Errors

To address the problematic cases mentioned above, I introduced a post-processing step. This step uses a CNN-based classifier that classify each candidate object based on its shape, since most parasite eggs typically have an elliptical shape.

If the candidate object has an elliptical shape, the detection confidence is increased; otherwise, it is decreased. The classifier outputs a probability that is used to adjust YOLO’s detection confidence.

![Classification Examples](/docs/Classificaiton_Samples.png)

#### 4) Model Performance Improvements

The following table summarizes the model performance improvements (F1 score and mAP50 on both the test set and validation set) after introducing the post-processing refinement (CNN classifier).

| Model                         | Test F1 | Test mAP50 | Val F1 | Val mAP50 | 
|-------------------------------|---------|------------|---------------|------------------|
| Baseline YOLO Detection Model | 98.21% | 99.54% | 94.44% | 90.57% |
| YOLO + Post-Processing Refinement (CNN Classifier) | 99.12%(+0.91%) | 99.84%(+0.30%) | 96.15%(+1.71%) | 90.91%(+0.34%) |

Validation performance is lower because the validation set intentionally contains more difficult cases.

## 4. Dataset

### 4.1 Dataset Overview

The following table summarises the dataset used at the beginning of the project and the final dataset when the project was completed.

<table>
<tr>
<th>Stage</th>
<th>Dataset Source</th>
<th>Test</th>
<th>Validation</th>
<th>Training</th>
<th>Unused</th>
</tr>

<tr>
<td rowspan="2">Project Start</td>
<td>Lab-captured images</td>
<td>17</td>
<td>17</td>
<td>79</td>
<td>0</td>
</tr>

<tr>
<td>Open-source images</td>
<td>0</td>
<td>0</td>
<td>0</td>
<td>0</td>
</tr>

<tr>
<td rowspan="2">Current</td>
<td>Lab-captured images</td>
<td>66</td>
<td>66</td>
<td>225</td>
<td>55</td>
</tr>

<tr>
<td>Open-source images</td>
<td>0</td>
<td>0</td>
<td>68</td>
<td>21013</td>
</tr>
</table>

The dataset used in this project comes from two main sources: 
- First, lab-captured images provided by an industry client — the amount of this data is limited, but it reflects real-world cases. 
- Second, open-source images collected from the internet — this dataset is much larger, but it may not fully represent real-world scenarios

### 4.2 Dataset Coverage Improvement

During the development of this project, the dataset was expanded to better represent real-world microscope samples.  
Through iterative data collection and dataset diversification, the estimated coverage of real-world sample variations was significantly improved.

| Dataset Version | Estimated Real-World Sample Coverage |
|---|---|
| Initial Dataset | ~70% |
| Final Dataset | ~95% |

The coverage estimate reflects how well the dataset represents the variations observed in real-world microscope samples.



## 5. Folder Structure & Modules

```bash
AUTOMATED-NEMATODE-EGG-DETECTION/
├── backend-azure/        # Azure Functions backend for ONNX model inference and API deployment
├── backend-local/        # Local backend for development/testing (e.g. Flask or raw Python)
├── docs/                 # Project documentation and screenshots
├── electron/             # Electron wrapper used to package the React web app as an offline desktop application
├── frontend/             # React + Tailwind CSS frontend for UI interaction, image upload, and inference result rendering
├── model_pipeline/       # Core model code: YOLO, DeepLab, Faster R-CNN, helpers, pretrained weights
├── dataset/              # Optional training/evaluation datasets (may not be tracked in Git)
├── node_modules/         # Frontend dependencies (not tracked by Git)
├── venv/                 # Python virtual environment (excluded from Git)
├── README.md             # Project documentation (you are here)
├── requirements.txt      # Python dependencies for backend + model
├── .gitignore            # Git ignore rules
├── package.json          # Frontend config for npm
└── package-lock.json     # Exact npm dependency versions
```
