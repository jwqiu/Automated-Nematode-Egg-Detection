import os
import time
import logging
from ultralytics import YOLO

EXP_ROOT = "modelpipeline/Trained_Models_Legacy/YOLO"

def predict_model(weight_path: str, config_name: str, task: str, source: str):
    model = YOLO(weight_path)
    # 从 source 路径里取最后的目录名当作 run 名称
    tag = os.path.basename(os.path.normpath(source))

    model.predict(
        source=source,
        task=task,
        project=f"{EXP_ROOT}/{config_name}",
        name=f"predict_{tag}",   # 输出文件夹带上来源名字
        exist_ok=True,
        save_json=True,
        save_txt=True,
        save_conf=True,
        verbose=True
    )

if __name__ == "__main__":

    weight_path = "modelpipeline/Trained_Models_Legacy/YOLO/yolov8s_sgd_lr0001_max/weights/best.pt"
    config_name = "yolov8s_sgd_lr0001_max"
    task = "detect"

    test_root = "dataset/test/images"
    for sub in os.listdir(test_root):
        sub_path = os.path.join(test_root, sub)
        if os.path.isdir(sub_path):
            predict_model(weight_path, config_name, task, sub_path)