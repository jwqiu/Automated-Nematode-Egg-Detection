from ultralytics import YOLO
import os

MODEL_PATH = os.path.join(os.path.dirname(__file__), "yolo.pt")
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

print("✅ Exported yolo.onnx")
