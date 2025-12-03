import time
import logging
from ultralytics import YOLO
import cv2, numpy as np
import glob
import torch
from PIL import Image
from torchvision import transforms
import sys, os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from model_pipeline.YOLO.ellipse.train_cnn_classifier import EllipseCNN, SquarePad

# get prediction for existing model, save the results to a folder named predict_for_{data_type} under the model folder
def predict_model(weight_path: str, config_name: str, task: str, source: str, data_type: str = "test"):
    model = YOLO(weight_path)
    tag = os.path.basename(os.path.normpath(source))

    model.predict(
        source=source,
        task=task,
        # project=f"{EXP_ROOT}/{config_name}",
        # name=f"predict_{tag}_test",   
        project=f"{EXP_ROOT}/{config_name}/predict_for_{data_type}",
        name=tag,
        exist_ok=True,
        save_json=True,
        save_txt=True,
        save_conf=True,
        agnostic_nms=False, # 与 ONNX 导出一致
        verbose=True,
        iou=0.2,
    )

# load all images from test root, these images will be used to crop patches for ellipse classification
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

# load all label files from prediction folder, these labels will be used to crop patches for ellipse classification
def load_all_labels(config_name, data_type="test"):
    label_paths = {}
    base = f"model_pipeline/Trained_Models_New/YOLO/{config_name}"

    # for label_file in glob.glob(f"{base}/predict_*test/labels/*.txt"):
    for label_file in glob.glob(f"{base}/predict_for_{data_type}/*/labels/*.txt"): # loop through all txt files in the labels folder
        parent  = os.path.basename(os.path.dirname(os.path.dirname(label_file)))  
        # parent  = parent.replace("predict_", "").replace("_test", "")            
        stem    = os.path.splitext(os.path.basename(label_file))[0]               
        filename = f"{parent}/{stem}"                                             
        label_paths[filename] = label_file
    return label_paths

# specify device for ellipse classification model
device = 'cuda' if torch.cuda.is_available() else 'cpu'

# load ellipse classification model(from train_cnn_classifier) and set to eval mode
ellipse_model_path = "model_pipeline/YOLO/ellipse/ellipse_cnn.pt"  
ellipse_model = EllipseCNN(input_size=64, use_sigmoid_in_model=False,
                           extra_conv_layers=2, use_gap=False)
ellipse_model.load_state_dict(torch.load(ellipse_model_path, map_location=device))
ellipse_model.to(device)
ellipse_model.eval()

# because EllipseCNN is a standalone classifier, it doesn't have built-in preprocessing like YOYO does, so we need to
# manually define how to convert each cropped image into right format before feeding it into the model
val_tf = transforms.Compose([
    transforms.Grayscale(1),
    SquarePad(),
    transforms.Resize(64),
    transforms.ToTensor(),
])


@torch.no_grad()
def classify_crop(crop_np):
    """classify a cropped image patch(numpy array), return the probability of being non-ellipse"""

    # preprocess the crop before inference 
    crop_np = cv2.equalizeHist(crop_np)
    pil = Image.fromarray(crop_np).convert("L")  
    t = val_tf(pil).unsqueeze(0).to(device)      # [1,1,H,W]

    # get logits value from model, then use sigmoid to convert to probability
    logits = ellipse_model(t).squeeze()          
    prob_non_ellipse = torch.sigmoid(logits).item()  
    return prob_non_ellipse


def analyze_and_write_ellipse(img_path, label_path, k=0.5):
    # load the image in grayscale mode and get its height and width
    img = cv2.imread(img_path, 0)
    if img is None:
        return
    H, W = img.shape[:2]

    # read label file line by line, analyze each bounding box, classify the cropped patch
    new_lines = []
    with open(label_path, "r") as f:
        lines = f.readlines()

    for line in lines:
        parts = line.strip().split()
        if len(parts) < 6:
            continue

        cls, xc, yc, w, h, conf = map(float, parts)
        x1, y1 = int((xc - w/2)*W), int((yc - h/2)*H)
        x2, y2 = int((xc + w/2)*W), int((yc + h/2)*H)
        x1c, y1c = max(0, x1), max(0, y1)
        x2c, y2c = min(W, x2), min(H, y2)

        crop = img[y1c:y2c, x1c:x2c]
        if crop.size == 0:
            new_lines.append(f"{int(cls)} {xc:.6f} {yc:.6f} {w:.6f} {h:.6f} {conf:.6f} 0.500 {conf:.6f}\n")
            continue
        
        # use the ellipse classifier to get probability of being non-ellipse
        prob_non_ellipse = classify_crop(crop)
        
        # adjust the original confidence score based on the probability and weight k
        conf_final = conf + (0.5 - prob_non_ellipse) * k
        conf_final = float(np.clip(conf_final, 0.0, 1.0))

        # write back the updated and adjusted confidence scores 
        new_lines.append(
            f"{int(cls)} {xc:.6f} {yc:.6f} {w:.6f} {h:.6f} "
            f"{conf:.6f} {prob_non_ellipse:.3f} {conf_final:.3f}\n"
        )

    with open(label_path, "w") as f:
        f.writelines(new_lines)
    print(f"✅ updated {label_path}")

# -------------------------
# Configuration
# -------------------------

EXP_ROOT = "model_pipeline/Trained_Models_New/YOLO"
DATA_TYPE = "val"  # change as needed
test_root = f"dataset/{DATA_TYPE}/images"
k = 0.5  # weight for confidence adjustment
config_name = "yolov8s_sgd_lr0001_max_E200P20_AD_0914_brightness_0.1"
weight_path = f"model_pipeline/Trained_Models_New/YOLO/{config_name}/train/weights/best.pt"
task = "detect"

# -------------------------
# Main
# -------------------------

if __name__ == "__main__":

    all_images = load_all_images(test_root)

    # run prediction for each subfolder under test_root
    for sub in os.listdir(test_root):
        sub_path = os.path.join(test_root, sub)
        if os.path.isdir(sub_path):
            predict_model(weight_path, config_name, task, sub_path, data_type=DATA_TYPE)

    label_files = load_all_labels(config_name, data_type=DATA_TYPE)

    # for each image and its corresponding label file, crop patches and analyze with ellipse classifier
    for key in all_images:
        if key in label_files:
            analyze_and_write_ellipse(all_images[key], label_files[key], k=k)