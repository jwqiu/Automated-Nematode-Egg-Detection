from ultralytics import YOLO
import os

# this code is basically the same as backend-azure/export_yolo_onnx.py
# One difference is that you need to move the exported ONNX model to the runtime_assets folder in backend-local after exporting.
# the local backend will load the model from there

BASE_DIR = os.path.dirname(__file__)  
MODEL_PATH = os.path.join(BASE_DIR, "best.pt")

model = YOLO(MODEL_PATH)
model.export(
    format="onnx", 
    imgsz=608, 
    nms=True, 
    opset=12, 
    iou=0.2, 
    agnostic_nms=False,
    simplify=True
    )

print("✅ Exported best.onnx to current folder")

# 