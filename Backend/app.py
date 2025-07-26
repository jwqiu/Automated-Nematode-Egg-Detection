import os
import sys
import glob
import uuid
import io
import json
import base64
import cv2           # 新增
import numpy as np    # 新增
from flask import Flask, request, send_file, jsonify
from werkzeug.utils import secure_filename
from flask_cors import CORS
from ultralytics import YOLO
from PIL import Image


app = Flask(__name__)
CORS(app)


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
OUTPUT_FOLDER = os.path.join(BASE_DIR, 'outputs')
WEIGHTS_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "ModelPipeline", "Trained_Models", "YOLO", "yolov8s_sgd_lr0001_max", "weights", "best.pt")
)

CONFIG_NAME = "web_predict"
TASK = "detect"

model = YOLO(WEIGHTS_PATH)

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)


@app.route('/upload', methods=['GET', 'POST'])
def upload_image():
    if request.method == 'GET':
        return "Upload route is ready. Use POST to upload images."
    
    if 'image' not in request.files:
        return {"error": "No image uploaded"}, 400

    file = request.files['image']
    if not file or not file.filename:
        return {"error": "No file or filename provided."}

    filename = secure_filename(file.filename)
    uid = uuid.uuid4().hex[:8]

    # 保存路径
    temp_input_dir = os.path.join(UPLOAD_FOLDER, uid)
    os.makedirs(temp_input_dir, exist_ok=True)
    saved_path = os.path.join(temp_input_dir, filename)
    file.save(saved_path)

    # 返回图片路径或标识
    return {"uid": uid, "filename": filename}, 200


@app.route('/delete', methods=['DELETE'])
def delete_image():
    """
    前端传来 JSON：{ "uid": "...", "filename": "xxx.png" }
    后端删除 uploads/uid/filename 文件，并在目录空时删除该 uid 目录。
    """
    data = request.get_json() or {}
    uid = data.get('uid')
    filename = data.get('filename')
    if not uid or not filename:
        return jsonify(error="Missing uid or filename"), 400

    # 目标路径
    target_dir = os.path.join(UPLOAD_FOLDER, uid)
    target_path = os.path.join(target_dir, filename)

    if not os.path.isfile(target_path):
        return jsonify(error="File not found"), 404

    try:
        os.remove(target_path)
        # 如果该 uid 目录下没有其它文件，就把目录删了
        if not os.listdir(target_dir):
            os.rmdir(target_dir)
    except Exception as e:
        return jsonify(error=f"Delete failed: {e}"), 500

    return jsonify(status="success"), 200


def draw_boxes_on_image(image_path, boxes):
    """在图片上绘制预测框，并返回 RGB ndarray"""
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError(f"Cannot load image: {image_path}")
    
    for idx, box in enumerate(boxes):
        x1, y1, x2, y2 = map(int, box['bbox'])  # 坐标
        conf = box['confidence']
        label = f"{conf*100:.1f}%"

        # 绿色框
        cv2.rectangle(image, (x1, y1), (x2, y2), color=(0, 255, 128), thickness=2)
        cv2.putText(image, label, (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX,
                    fontScale=0.6, color=(0, 255, 128), thickness=2)

    # OpenCV 是 BGR，需要转成 RGB
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    return image_rgb

@app.route('/predict', methods=['POST'])
def predict():
    data     = request.get_json() or {}
    uid      = data.get("uid")
    filename = data.get("filename")
    if not uid or not filename:
        return jsonify(error="Missing uid or filename"), 400

    input_path = os.path.join(UPLOAD_FOLDER, uid, filename)
    if not os.path.exists(input_path):
        return jsonify(error="Image not found"), 404

    try:
        # 内存中推理，不写任何中间文件
        results = model.predict(
            source=input_path,
            task=TASK,
            exist_ok=True,
            save=False,
            save_json=False,
            save_conf=False,
            verbose=False
        )
    except Exception as e:
        app.logger.error(f"Predict error: {e}")
        return jsonify(error="Internal prediction error"), 500
    
    img_b64 = None 
    if not results:
        return jsonify(image=img_b64, boxes=[]), 200
    
    r = results[0]
    # 提取坐标和置信度
    
    coords = r.boxes.xyxy.cpu().numpy().tolist() # type: ignore
    confs  = r.boxes.conf.cpu().numpy().tolist() # type: ignore

    boxes_info = [
        {"bbox": b, "confidence": c}
        for b, c in zip(coords, confs)
    ]

    img_array = draw_boxes_on_image(input_path, boxes_info)
    image_pil = Image.fromarray(img_array)
    buf = io.BytesIO()
    image_pil.save(buf, format="PNG")  # PNG 颜色更稳定
    img_b64 = base64.b64encode(buf.getvalue()).decode()

  
    return jsonify({
        "image": img_b64,
        "boxes": boxes_info
    })

if __name__ == '__main__':
    # 监听所有接口，端口改为 5001
    app.run(host='0.0.0.0', port=5001, debug=True)
