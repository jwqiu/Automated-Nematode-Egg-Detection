# export_onnx.py
from ultralytics import YOLO
import os

# 定义路径
BASE_DIR = os.path.dirname(__file__)  
MODEL_PATH = os.path.join(BASE_DIR, "best.pt")

# runtime_assets 文件夹路径
EXPORT_DIR = os.path.join(BASE_DIR, "runtime_assets")
os.makedirs(EXPORT_DIR, exist_ok=True)

# 导出模型
model = YOLO(MODEL_PATH)
export_path = os.path.join(EXPORT_DIR, "best.onnx")

model.export(
    format="onnx", 
    imgsz=608, 
    nms=True, 
    opset=12, 
    iou=0.4, 
    agnostic_nms=False,
    simplify=True
    )

# YOLO 的 export 默认会把 best.onnx 放到当前目录，
# 所以我们手动移动到 runtime_assets 里
if os.path.exists("best.onnx"):
    os.replace("best.onnx", export_path)

print(f"✅ Exported best.onnx to {export_path}")