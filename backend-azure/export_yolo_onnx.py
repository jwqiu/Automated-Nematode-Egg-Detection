from ultralytics import YOLO
import os

# ----------------------------------------------------------------------------------------------------
# run this script to export the YOLO model (.pt file) to ONNX format for use in Azure Function backend
# before running this script, copy the trained YOLO model file (best.pt) from model_pipeline to this folder and rename it to yolo.pt
# ----------------------------------------------------------------------------------------------------


MODEL_PATH = os.path.join(os.path.dirname(__file__), "yolo.pt")
model = YOLO(MODEL_PATH)

model.export(
    format="onnx", 
    imgsz=608, 
    nms=True,  #  include built-in NMS to remove overlapping boxes and keep the one with highest confidence score
    opset=12, 
    iou=0.2, # if two boxes overlap more than this threshold, they are considered the same box and remove the lower confidence one
    agnostic_nms=False, # ignore classes and apply NMS to all overlapping boxes
    simplify=True
    )

print("✅ Exported yolo.onnx")
