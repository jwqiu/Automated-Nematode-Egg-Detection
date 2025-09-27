# # export_onnx.py
# from ultralytics import YOLO
# import os
# # model = YOLO("best.pt")
# MODEL_PATH = os.path.join(os.path.dirname(__file__), "best.pt")
# model = YOLO(MODEL_PATH)
# model.export(format="onnx", imgsz=608, nms=True)
# print("✅ Exported best.onnx")

# export_onnx.py

from ultralytics import YOLO
import os

MODEL_PATH = os.path.join(os.path.dirname(__file__), "best.pt")
model = YOLO(MODEL_PATH)

model.export(
    format="onnx", 
    imgsz=608, 
    nms=True, 
    opset=12, 
    iou=0.4, 
    agnostic_nms=False,
    simplify=True
    )

print("✅ Exported best.onnx")
