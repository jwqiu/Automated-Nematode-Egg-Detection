from ultralytics import YOLO
import os

# --------------------------------------------------------------------------------------------------
# this script exports the trained YOLO model to ONNX format for use in Azure Function backend
# --------------------------------------------------------------------------------------------------

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
