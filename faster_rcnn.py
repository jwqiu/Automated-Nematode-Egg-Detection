# faster_rcnn_pipeline.py

import os
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader
from PIL import Image
import torchvision
from torchvision.models.detection import fasterrcnn_resnet50_fpn
from torchvision.models.detection import FasterRCNN_ResNet50_FPN_Weights
from torchvision.transforms import functional as F
import xml.etree.ElementTree as ET
import json
import time
from tqdm import tqd
import random

def set_seed(seed=42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)


# -------------------------
# Configuration
# -------------------------
DEVICE = torch.device('mps') if torch.backends.mps.is_available() else torch.device('cuda' if torch.cuda.is_available() else 'cpu')
NUM_CLASSES = 2  # 1 class (nematode egg) + background
CLASS_NAMES = ["__background__", "nematode egg"]
TRAIN_DIR = "dataset/train"
VAL_DIR = "dataset/val"
TEST_DIR = "dataset/test"
PRED_OUTPUT_DIR = "Processed_Images/faster_rcnn/Predictions"

# -------------------------
# Dataset
# -------------------------
class VOCDataset(Dataset):
    def __init__(self, image_dir, annotation_dir, transforms=None):
        self.image_dir = image_dir
        self.annotation_dir = annotation_dir
        self.transforms = transforms
        self.images = sorted([f for f in os.listdir(image_dir) if f.endswith('.tif')])

    def __getitem__(self, idx):
        image_id = self.images[idx]
        img_path = os.path.join(self.image_dir, image_id)
        ann_path = os.path.join(self.annotation_dir, image_id.replace('.tif', '.xml'))
        
        img = Image.open(img_path).convert("RGB")
        boxes, labels = [], []

        tree = ET.parse(ann_path)
        root = tree.getroot()
        for obj in root.findall("object"):
            name = obj.find("name").text
            if name != "nematode egg":
                continue
            bnd = obj.find("bndbox")
            box = [int(bnd.find("xmin").text), int(bnd.find("ymin").text),
                int(bnd.find("xmax").text), int(bnd.find("ymax").text)]
            boxes.append(box)
            labels.append(1)

        # Handle edge cases
        if len(boxes) == 0:
            boxes = torch.zeros((0, 4), dtype=torch.float32)
            labels = torch.zeros((0,), dtype=torch.int64)
        else:
            boxes = torch.tensor(boxes, dtype=torch.float32)
            labels = torch.tensor(labels, dtype=torch.int64)
            if boxes.ndim == 1:
                boxes = boxes.unsqueeze(0)

        target = {
            'boxes': boxes,
            'labels': labels,
            'image_id': torch.tensor([idx]),
            'area': (boxes[:, 3] - boxes[:, 1]) * (boxes[:, 2] - boxes[:, 0]),
            'iscrowd': torch.zeros((len(labels),), dtype=torch.int64)
        }

        if self.transforms:
            img = self.transforms(img)

        return img, target, image_id


    def __len__(self):
        return len(self.images)

# -------------------------
# Loaders
# -------------------------
def get_loader(root, batch_size=2):
    dataset = VOCDataset(
        image_dir=os.path.join(root, "images"),
        annotation_dir=os.path.join(root, "annotations"),
        transforms=F.to_tensor
    )
    return DataLoader(dataset, batch_size=batch_size, shuffle=True, collate_fn=lambda x: tuple(zip(*x)))

# -------------------------
# Training Loop
# -------------------------
def train_model():
    set_seed()

    train_loader = get_loader(TRAIN_DIR)
    val_loader = get_loader(VAL_DIR)

    weights = FasterRCNN_ResNet50_FPN_Weights.DEFAULT
    model = fasterrcnn_resnet50_fpn(weights=weights)    
    in_features = model.roi_heads.box_predictor.cls_score.in_features
    model.roi_heads.box_predictor = torchvision.models.detection.faster_rcnn.FastRCNNPredictor(in_features, NUM_CLASSES)
    model.to(DEVICE)

    if DEVICE.type == "cuda":
        print("✅ Training on GPU")
    else:
        print("⚠️ Training on CPU (check Metal acceleration support if using Mac M1/M2/M3)")

    params = [p for p in model.parameters() if p.requires_grad]
    optimizer = torch.optim.SGD(params, lr=0.005, momentum=0.9, weight_decay=0.0005)

    num_epochs = 10
    best_val_loss = float('inf')

    for epoch in range(num_epochs):
        model.train()
        running_loss = 0.0

        for batch_idx, (images, targets, _) in enumerate(train_loader):
            images = list(img.to(DEVICE) for img in images)
            targets = [{k: v.to(DEVICE) for k, v in t.items()} for t in targets]

            loss_dict = model(images, targets)
            losses = sum(loss for loss in loss_dict.values())

            optimizer.zero_grad()
            losses.backward()
            optimizer.step()

            running_loss += losses.item()
            if batch_idx % 5 == 0:
                print(f"   Batch {batch_idx}, Training Loss: {losses.item():.4f}")

        avg_train_loss = running_loss / len(train_loader)
        print(f"Epoch {epoch+1}, Avg Training Loss: {avg_train_loss:.4f}")

        # --- Validation loop ---
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for images, targets, _ in val_loader:
                images = list(img.to(DEVICE) for img in images)
                targets = [{k: v.to(DEVICE) for k, v in t.items()} for t in targets]

                loss_dict = model(images, targets)
                val_loss += sum(loss for loss in loss_dict.values()).item()
        avg_val_loss = val_loss / len(val_loader)
        print(f"   🔍 Validation Loss: {avg_val_loss:.4f}")

        # --- Save best model ---
        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            torch.save(model.state_dict(), "faster_rcnn_nematode_best.pth")
            print(f"   ✅ New best model saved! (Val Loss: {best_val_loss:.4f})")

    return model


# -------------------------
# Inference & Save Predictions
# -------------------------
def predict_and_save(model, split="test"):
    os.makedirs(os.path.join(PRED_OUTPUT_DIR, split), exist_ok=True)
    loader = get_loader(os.path.join("dataset", split), batch_size=1)
    model.eval()

    with torch.no_grad():
        for imgs, _, names in tqdm(loader, desc=f"Inference on {split} set"):
            img = imgs[0].to(DEVICE)
            output = model([img])[0]

            boxes = output['boxes'].cpu().numpy().tolist()
            scores = output['scores'].cpu().numpy().tolist()

            # Keep predictions with confidence >= 0.5
            keep = [i for i, s in enumerate(scores) if s >= 0.5]
            filtered_boxes = [boxes[i] for i in keep]
            filtered_scores = [scores[i] for i in keep]

            # Save both boxes and their confidence scores
            pred_json = {
                "boxes": [[int(x) for x in box] for box in filtered_boxes],
                "scores": [round(float(s), 4) for s in filtered_scores]
            }

            out_path = os.path.join(PRED_OUTPUT_DIR, split, names[0].replace(".tif", ".json"))
            with open(out_path, 'w') as f:
                json.dump(pred_json, f, indent=2)


# -------------------------
# Main
# -------------------------
if __name__ == "__main__":
    start_time = time.time()

    print("Starting training...")
    model = train_model()

    for split in ["test", "val", "train"]:
        print(f"\nRunning inference on {split} set...")
        predict_and_save(model, split=split)

    total_time = time.time() - start_time
    print(f"\nDone! Total runtime: {total_time:.2f} seconds.")

