# export_onnx.py
from ultralytics import YOLO
model = YOLO("best.pt")
model.export(format="onnx", imgsz=608, nms=True)
print("✅ Exported best.onnx")