import os
import time
import logging
from ultralytics import YOLO
import cv2
import numpy as np
import glob

EXP_ROOT = "model_pipeline/Trained_Models_New/YOLO"

def predict_model(weight_path: str, config_name: str, task: str, source: str):
    model = YOLO(weight_path)
    # 从 source 路径里取最后的目录名当作 run 名称
    tag = os.path.basename(os.path.normpath(source))

    model.predict(
        source=source,
        task=task,
        project=f"{EXP_ROOT}/{config_name}",
        name=f"predict_{tag}_val",   # 输出文件夹带上来源名字
        exist_ok=True,
        save_json=True,
        save_txt=True,
        save_conf=True,
        agnostic_nms=False, # 与 ONNX 导出一致
        verbose=True,
        iou=0.6,
        conf=0.01 
    )

def load_all_images(test_root):
    image_paths = {}
    for sub in os.listdir(test_root):
        sub_path = os.path.join(test_root, sub)
        if not os.path.isdir(sub_path):
            continue
        for f in os.listdir(sub_path):
            file_path = os.path.join(sub_path, f)
            if not os.path.isfile(file_path):
                continue
            parent  = os.path.basename(os.path.dirname(file_path))   # e.g. data_from_Denise_828
            stem    = os.path.splitext(os.path.basename(file_path))[0]  # e.g. img001
            filename = f"{parent}/{stem}"    # key
            image_paths[filename] = file_path
    return image_paths

def load_all_labels(config_name):
    label_paths = {}
    base = f"model_pipeline/Trained_Models_New/YOLO/{config_name}"

    for label_file in glob.glob(f"{base}/predict_*_val/labels/*.txt"):
        parent  = os.path.basename(os.path.dirname(os.path.dirname(label_file)))  # e.g. predict_data_from_Denise_828_val
        parent  = parent.replace("predict_", "").replace("_val", "")              # 还原为 data_from_Denise_828
        stem    = os.path.splitext(os.path.basename(label_file))[0]               # e.g. img001
        filename = f"{parent}/{stem}"                                             # key
        label_paths[filename] = label_file
    return label_paths

import cv2, numpy as np

def analyze_and_write_ellipse(img_path, label_path):
    img = cv2.imread(img_path, 0)
    if img is None:
        return
    H, W = img.shape[:2]

    new_lines = []
    for line in open(label_path):
        parts = line.strip().split()
        if len(parts) < 6:
            continue
        cls, xc, yc, w, h, conf = map(float, parts)
        x1, y1 = int((xc - w/2)*W), int((yc - h/2)*H)
        x2, y2 = int((xc + w/2)*W), int((yc + h/2)*H)
        crop = img[y1:y2, x1:x2]

        ratio = 0
        if crop.size > 0:
            crop = cv2.equalizeHist(crop)
            _, th = cv2.threshold(crop, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            cts, _ = cv2.findContours(th, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if cts and len(max(cts, key=cv2.contourArea)) >= 5:
                (x, y), (MA, ma), ang = cv2.fitEllipse(max(cts, key=cv2.contourArea))
                ratio = round(min(MA, ma)/max(MA, ma), 3)

        if crop.size > 0:
            # === 保存所有裁图，区分 ratio 是否为 0 ===
            base_debug_dir = os.path.join("model_pipeline/YOLO/ellipse", "debug_crops")
            subdir = "zero" if ratio == 0 else "nonzero"
            debug_dir = os.path.join(base_debug_dir, subdir)
            os.makedirs(debug_dir, exist_ok=True)

            crop_name = f"{os.path.basename(img_path).split('.')[0]}_{int(x1)}_{int(y1)}_{ratio:.3f}.png"
            cv2.imwrite(os.path.join(debug_dir, crop_name), crop)

        if ratio == 0:
            factor = 1
        elif 0.5 <= ratio <= 0.85:
            factor = 1.5
        else:
            factor = 0.5
        adj = round(conf * factor, 3)
        new_lines.append(f"{int(cls)} {xc:.6f} {yc:.6f} {w:.6f} {h:.6f} {conf:.6f} {ratio:.3f} {adj:.3f}\n")

    open(label_path, "w").writelines(new_lines)
    print(f"✅ updated {label_path}")


if __name__ == "__main__":

    weight_path = "model_pipeline/Trained_Models_New/YOLO/yolov8s_sgd_lr0001_max_E200P20_AD_0914/train/weights/best.pt"
    config_name = "yolov8s_sgd_lr0001_max_E200P20_AD_0914"
    task = "detect"

    test_root = "dataset/val/images"
    all_images = load_all_images(test_root)

    for sub in os.listdir(test_root):
        sub_path = os.path.join(test_root, sub)
        if os.path.isdir(sub_path):
            predict_model(weight_path, config_name, task, sub_path)

    label_files = load_all_labels(config_name)

    for key in all_images:
        if key in label_files:
            analyze_and_write_ellipse(all_images[key], label_files[key])