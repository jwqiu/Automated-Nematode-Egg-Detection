# Automated Nematode Egg Detection and Counting

## 1. Project Overview

A computer vision pipeline that detects parasite eggs in microscope images and automates slide-level counting and review.

The system combines a **YOLOv8s object detector**, a **CNN-based shape classifier**, and a **folder-to-count workflow**. A user can provide folders of microscope images, run detection across every image, and receive image-level predictions and an aggregated egg count for each slide.

<img width="1436" height="817" alt="Folder-based automated detection workflow" src="https://github.com/user-attachments/assets/ece4a404-0b56-408e-9ad1-68e4b6f33956" />

## 2. Problem

Assessing parasite infection severity often requires technicians to examine faecal samples under a microscope and manually identify and count parasite eggs.

This process is repetitive and time-consuming, creating a bottleneck in parasite research and routine animal health monitoring.

## 3. Solution

This project uses computer vision to automatically detect and count parasite eggs. For digital analysis, each microscope slide is captured as a series of images. The system detects eggs in every image, refines the predictions using shape information, and combines the results into one slide-level count.

### End-to-end automated workflow

Images from the same slide are grouped in one folder. The user can upload one or more folders and start detection once; the system then processes every image and calculates the total egg count for each folder automatically.

```text
Slide folders
    -> image conversion, resizing, and padding
    -> YOLOv8s candidate detection
    -> CNN shape-based confidence refinement
    -> confidence filtering and egg counting
    -> per-image and per-slide aggregation
    -> low-confidence / no-detection review
    -> optional manual count correction
```

### Automated processing

1. **Folder ingestion** — images are grouped by their top-level folder so results remain associated with the correct slide.
2. **Preprocessing** — TIFF images are converted when necessary, then every image is resized and padded to `608 x 608`.
3. **Queued inference** — the system processes each unprocessed image and tracks progress across the complete queue.
4. **Count aggregation** — detections above the selected confidence threshold are counted per image and summed for the folder.

### Review assistance

Automation does not remove the need for quality control. After inference, the interface can place low-confidence results or images with no detected eggs first. A reviewer can inspect the bounding boxes and manually correct an image count when needed.

## 4. Computer Vision Approach

### 4.1 Candidate detection with YOLOv8s

The production detector is YOLOv8s. It receives a preprocessed microscope image and outputs candidate egg bounding boxes with detection confidence scores. The repository also retains training and evaluation pipelines for Faster R-CNN and DeepLabV3+ from the earlier research project.

### 4.2 Observed failure modes

The detector performs well on clear examples, but difficult backgrounds and egg-like structures can still produce false positives or uncertain predictions.

![Examples of correct detections and common errors](/docs/Detection_Examples.jpeg)

### 4.3 Shape-aware confidence refinement

Many problematic detections can be distinguished using shape. For every YOLO candidate, the system crops the predicted region, converts it to grayscale, enhances its contrast, and sends it to a binary CNN classifier trained to distinguish elliptical from non-elliptical objects.

![Ellipse and non-ellipse classification samples](/docs/Classificaiton_Samples.png)

The classifier does not replace YOLO or produce new bounding boxes. Instead, its probability adjusts the detector's original confidence:

```text
adjusted confidence = YOLO confidence + k * (0.5 - non-ellipse probability)
```

An egg-like shape raises the score, while a non-elliptical shape lowers it. The adjusted score can then be used for thresholding, display, and counting.

## 5. Model Results

Adding shape-aware confidence refinement improved both F1 and mAP50 on the held-out test and validation sets. The largest gain was on the more difficult validation set, where F1 increased from **94.44% to 96.15%**.

| Model | Test F1 | Test mAP50 | Validation F1 | Validation mAP50 |
|---|---:|---:|---:|---:|
| Baseline YOLOv8s | 98.21% | 99.54% | 94.44% | 90.57% |
| **YOLOv8s + CNN confidence refinement** | **99.12% (+0.91 pp)** | **99.84% (+0.30 pp)** | **96.15% (+1.71 pp)** | **90.91% (+0.34 pp)** |

F1 was evaluated using a confidence threshold of `0.5` and a matching IoU threshold of `0.5`. Greedy non-maximum suppression used an IoU threshold of `0.2`. The validation set intentionally contains more difficult cases, which explains its lower absolute performance.

## 6. Dataset and Experiment Design

The project uses two complementary sources of data:

- **Lab-captured images** provided by an industry client. This set is limited in size but represents the real microscope samples the system is intended to process.
- **Open-source images** collected to expand visual diversity. Because their distribution may differ from the target environment, only a selected subset was used for training.

| Project stage | Data source | Test | Validation | Training | Available but not used |
|---|---|---:|---:|---:|---:|
| Initial | Lab-captured images | 17 | 17 | 79 | 0 |
| Initial | Open-source images | 0 | 0 | 0 | 0 |
| Final | Lab-captured images | 66 | 66 | 225 | 55 |
| Final | Open-source images | 0 | 0 | 68 | 21,013 |

The final dataset places real lab images in every split and uses selected open-source examples only in training. The validation set was designed to contain more challenging cases so that model changes could be tested against realistic failure modes rather than only clean examples.

## 7. Demo

The deployed demo opens in **Folder Mode**, which demonstrates the complete automated workflow. Upload a folder of microscope images or select **Load default folder**, then start detection to see progress, image-level boxes, and the aggregated folder count.

[Try the live demo](https://jwqiu.github.io/Automated-Nematode-Egg-Detection/)

The interface also includes an Image Mode for inspecting individual images.

## 8. Operational Inference and Deployment

The trained PyTorch models are exported to ONNX and executed with ONNX Runtime on CPU. A Python inference service runs the YOLO detector and CNN refinement pipeline, while a lightweight React interface manages folder ingestion, progress, counting, and result review. The project supports an Azure Functions deployment for the web demo and an Electron wrapper for local desktop packaging.

These components make the computer vision workflow usable outside a training notebook; they are supporting infrastructure rather than the main focus of the project.

## 9. Repository Structure

```text
Automated-Nematode-Egg-Detection/
├── model_pipeline/   # Data preparation, training, inference, and evaluation
├── backend-azure/    # ONNX inference through Azure Functions
├── backend-local/    # Local ONNX inference service
├── frontend/         # Folder automation and result-review interface
├── electron/         # Offline desktop packaging
└── docs/             # Figures, screenshots, and supporting notes
```

## 10. Attribution

This project builds on the original work by [shion92](https://github.com/shion92), which established model training and evaluation pipelines for DeepLabV3+, Faster R-CNN, and YOLO.

The work added in this repository focuses on:

- expanding and restructuring the dataset around real-world microscope samples;
- evaluating and improving the YOLO detection pipeline;
- training and integrating the CNN-based shape refinement stage;
- comparing original and adjusted confidence scores;
- automating folder-level preprocessing, inference, counting, and review; and
- operationalising the models through ONNX-based web and desktop inference.
