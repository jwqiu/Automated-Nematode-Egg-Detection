# export_onnx.py
from ultralytics import YOLO
import os
# model = YOLO("best.pt")
MODEL_PATH = os.path.join(os.path.dirname(__file__), "best.pt")
model = YOLO(MODEL_PATH)
model.export(format="onnx", imgsz=608, nms=True)
print("✅ Exported best.onnx")