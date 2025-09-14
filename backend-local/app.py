# import os
# import sys
# import glob
# import uuid
# import io
# import json
# import base64
# import cv2           # 新增
# import numpy as np    # 新增
# from flask import Flask, request, send_file, jsonify
# from werkzeug.utils import secure_filename
# from flask_cors import CORS
# from ultralytics import YOLO
# from PIL import Image


# app = Flask(__name__)
# CORS(app)


# BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
# OUTPUT_FOLDER = os.path.join(BASE_DIR, 'outputs')
# WEIGHTS_PATH = os.path.abspath(
#     os.path.join(os.path.dirname(__file__), "..", "ModelPipeline", "Trained_Models", "YOLO", "yolov8s_sgd_lr0001_max", "weights", "best.pt")
# )

# CONFIG_NAME = "web_predict"
# TASK = "detect"

# model = YOLO(WEIGHTS_PATH)

# os.makedirs(UPLOAD_FOLDER, exist_ok=True)
# os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# def draw_boxes_on_array(img_array, boxes):
#     """在 numpy 数组图像上绘制预测框，并返回 RGB ndarray"""

#     # OpenCV 处理的是 BGR，因此如果输入是 RGB，则先转为 BGR
#     image = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)

#     for idx, box in enumerate(boxes):
#         x1, y1, x2, y2 = map(int, box['bbox'])
#         conf = box['confidence']
#         label = f"{conf*100:.1f}%"

#         cv2.rectangle(image, (x1, y1), (x2, y2), color=(0, 255, 128), thickness=2)
#         cv2.putText(image, label, (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX,
#                     fontScale=0.6, color=(0, 255, 128), thickness=2)

#     # 转回 RGB 返回
#     image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
#     return image_rgb


# @app.route('/predict', methods=['POST'])
# def predict():
#     data = request.get_json()
#     image_b64 = data.get("image_base64")
#     filename  = data.get("filename", "uploaded_image.jpg")

#     if not image_b64:
#         return jsonify(error="Missing image_base64"), 400

#     try:

#       # 解码 base64
#         image_bytes = base64.b64decode(image_b64)
#         image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

#         # 临时转换成 numpy 数组传给模型
#         img_array = np.array(image)
#         # 内存中推理，不写任何中间文件
#         results = model.predict(
#             source=img_array,
#             task=TASK,
#             exist_ok=True,
#             save=False,
#             save_json=False,
#             save_conf=False,
#             verbose=False
#         )
#     except Exception as e:
#         app.logger.error(f"Predict error: {e}")
#         return jsonify(error="Internal prediction error"), 500
    
#     if not results:
#         return jsonify(image=None, boxes=[]), 200
    
#     r = results[0]
#     # 提取坐标和置信度
    
#     coords = r.boxes.xyxy.cpu().numpy().tolist() # type: ignore
#     confs  = r.boxes.conf.cpu().numpy().tolist() # type: ignore

#     boxes_info = [
#         {"bbox": b, "confidence": c}
#         for b, c in zip(coords, confs)
#         if c > 0.5
#     ]        

#     # 把框画在原图上
#     drawn_img_array = draw_boxes_on_array(img_array, boxes_info)  # 注意你可能要改一下 draw 函数的输入
#     output_pil = Image.fromarray(drawn_img_array)
#     buf = io.BytesIO()
#     output_pil.save(buf, format="PNG")
#     result_image_b64 = base64.b64encode(buf.getvalue()).decode()

#     return jsonify({
#         "image": result_image_b64,
#         "boxes": boxes_info
#     })

# if __name__ == '__main__':
#     # 监听所有接口，端口改为 5001
#     app.run(host='0.0.0.0', port=5001, debug=True)


# @app.route('/upload', methods=['GET', 'POST'])
# def upload_image():
#     if request.method == 'GET':
#         return "Upload route is ready. Use POST to upload images."
    
#     if 'image' not in request.files:
#         return {"error": "No image uploaded"}, 400

#     file = request.files['image']
#     if not file or not file.filename:
#         return {"error": "No file or filename provided."}

#     filename = secure_filename(file.filename)
#     uid = uuid.uuid4().hex[:8]

#     # 保存路径
#     temp_input_dir = os.path.join(UPLOAD_FOLDER, uid)
#     os.makedirs(temp_input_dir, exist_ok=True)
#     saved_path = os.path.join(temp_input_dir, filename)
#     file.save(saved_path)

#     # 返回图片路径或标识
#     return {"uid": uid, "filename": filename}, 200


# @app.route('/delete', methods=['DELETE'])
# def delete_image():
#     """
#     前端传来 JSON：{ "uid": "...", "filename": "xxx.png" }
#     后端删除 uploads/uid/filename 文件，并在目录空时删除该 uid 目录。
#     """
#     data = request.get_json() or {}
#     uid = data.get('uid')
#     filename = data.get('filename')
#     if not uid or not filename:
#         return jsonify(error="Missing uid or filename"), 400

#     # 目标路径
#     target_dir = os.path.join(UPLOAD_FOLDER, uid)
#     target_path = os.path.join(target_dir, filename)

#     if not os.path.isfile(target_path):
#         return jsonify(error="File not found"), 404

#     try:
#         os.remove(target_path)
#         # 如果该 uid 目录下没有其它文件，就把目录删了
#         if not os.listdir(target_dir):
#             os.rmdir(target_dir)
#     except Exception as e:
#         return jsonify(error=f"Delete failed: {e}"), 500

#     return jsonify(status="success"), 200



# app.py  —— 本地推理后端（Flask 版）
# 目录结构建议：
# backend-local/
# ├─ app.py
# ├─ requirements.txt
# └─ runtime_assets/
#    └─ best.onnx

import os
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))  # 或：load_dotenv(dotenv_path=os.path.join(BASE_DIR, ".env"), override=False)


from dotenv import load_dotenv
from flask import Flask, request, jsonify
import base64, io, os, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import onnxruntime as ort
from flask_cors import CORS


app = Flask(__name__)
# CORS(app, resources={r"/predict": {"origins": ["http://localhost:5173"]}},
#      supports_credentials=False, allow_headers=["Content-Type"], methods=["POST", "OPTIONS"])

CORS(app,
     resources={
         r"/predict": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]},
         r"/upload/image": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]},
         r"/upload/boxes": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]},
     },
     supports_credentials=False,
     allow_headers=["Content-Type"],
     methods=["POST", "OPTIONS"])


# —— 全局加载 ONNX 模型 —— #
RUNTIME_DIR = os.path.join(os.path.dirname(__file__), "runtime_assets")
MODEL_PATH  = os.path.join(RUNTIME_DIR, "best.onnx")
sess = ort.InferenceSession(MODEL_PATH, providers=["CPUExecutionProvider"])
input_name = sess.get_inputs()[0].name

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/predict")
def predict():
    try:
        # 1. 解析输入
        data = request.get_json(force=True)
        image_b64 = data.get("image_base64")
        if not image_b64:
            return jsonify({"error": "Missing image_base64"}), 400

        image_bytes = base64.b64decode(image_b64)

        pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        orig_w, orig_h = pil.size
        original_pil = pil.copy()

        # 2. 预处理到 608×608，归一化，NCHW
        img608 = pil.resize((608, 608))
        arr = np.array(img608).astype(np.float32) / 255.0
        arr = np.transpose(arr, (2, 0, 1))[None, ...]  # shape (1,3,608,608)

        # 3. ONNX 推理
        outputs = sess.run(None, {input_name: arr})
        preds   = outputs[0] if outputs else None  # shape (M,5+num_classes) or (M,6) if nms=True

        if preds is None or (hasattr(preds, "shape") and preds.shape[0] == 0):
            return jsonify({"original_image": None, "annotated_image": None, "boxes": []})

        boxes_info = []

        # 如果 shape 是 (1, 300, 6)，先 squeeze
        if len(preds.shape) == 3:
            preds = preds.squeeze(0)  # 变成 (N, 6)

        for row in preds:
            x1, y1, x2, y2, conf, cls = [float(v) for v in row[:6]]
            if conf > 0.5:
                boxes_info.append({
                    "bbox": [int(x1), int(y1), int(x2), int(y2)],
                    "confidence": conf
                })

        # 5. 用 Pillow 在原图上画框和置信度
        draw = ImageDraw.Draw(pil)
        font = ImageFont.load_default()

        for b in boxes_info:
            x1, y1, x2, y2 = b["bbox"]
            draw.rectangle([x1, y1, x2, y2], outline="red", width=2)

            text = f"{b['confidence']*100:.1f}%"
            tx, ty = x1, max(0, y1 - 12)  # 上移一点且不小于 0

            # 白色描边（周围一圈）
            for dx in [-1, 0, 1]:
                for dy in [-1, 0, 1]:
                    if dx != 0 or dy != 0:
                        draw.text((tx + dx, ty + dy), text, font=font, fill="white")

            # 红色文字在正中
            draw.text((tx, ty), text, font=font, fill="red")

        # 6. 输出 Base64（带框 + 原图）
        buf1 = io.BytesIO()
        pil.save(buf1, format="PNG")
        annotated_b64 = base64.b64encode(buf1.getvalue()).decode()

        buf2 = io.BytesIO()
        original_pil.save(buf2, format="PNG")
        original_b64 = base64.b64encode(buf2.getvalue()).decode()

        return jsonify({
            "original_image": original_b64,
            "annotated_image": annotated_b64,
            "boxes": boxes_info
        })

    except Exception as e:
        return jsonify({"error": f"Predict error: {e}"}), 500




# ===== 上传标注框到 PostgreSQL =====
import psycopg2
from datetime import datetime

DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "port": int(os.getenv("DB_PORT", "5432")),
    "dbname": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "sslmode": os.getenv("DB_SSLMODE", "require"),
}

@app.post("/upload/boxes")
def upload_boxes():
    try:
        data = request.get_json(force=True)
        filename = data.get("filename")
        boxes = data.get("boxes")
        if not filename or not boxes:
            return jsonify({"error": "Missing filename or boxes"}), 400

        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        upload_date = datetime.utcnow().date()

        # 期待表结构：boxes(image_name text, x_left int, y_left int, x_right int, y_right int, confidence float, upload_date date)
        for box in boxes:
            x1, y1, x2, y2 = box["bbox"]
            confidence = float(box.get("confidence", 1.0))
            cur.execute(
                """
                INSERT INTO boxes (image_name, x_left, y_left, x_right, y_right, confidence, upload_date)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (filename, x1, y1, x2, y2, confidence, upload_date)
            )

        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"ok": True, "message": "Boxes uploaded successfully"})
    except Exception as e:
        return jsonify({"error": f"Error uploading boxes: {e}"}), 500


# ===== 上传原始图片到 Azure Blob =====
from azure.storage.blob import BlobServiceClient

BLOB_CONTAINER = os.environ.get("AZURE_BLOB_CONTAINER", "images")
AZURE_BLOB_CONN_STR = (
    os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    or os.getenv("AzureWebJobsStorage")
)

blob_service_client = BlobServiceClient.from_connection_string(AZURE_BLOB_CONN_STR)


@app.route("/upload/image", methods=["POST", "OPTIONS"])
def upload_image():
    # 预检：直接 204
    if request.method == "OPTIONS":
        return ("", 204)

    try:
        # 二进制体
        image_data = request.get_data(cache=False, as_text=False)

        # 文件名：query 优先，否则生成一个
        filename = request.args.get("filename")
        if not filename:
            filename = f"image_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.png"

        # 上传
        blob_client = blob_service_client.get_blob_client(
            container=BLOB_CONTAINER, blob=filename
        )
        blob_client.upload_blob(image_data, overwrite=True)

        # 返回 URL
        url = f"https://{blob_client.account_name}.blob.core.windows.net/{BLOB_CONTAINER}/{filename}"
        return jsonify({"ok": True, "filename": filename, "url": url})

    except Exception as e:
        return jsonify({"error": f"Upload failed: {e}"}), 500


if __name__ == "__main__":
    # 5178 只是建议端口；与 Electron 里保持一致即可
    app.run(host="127.0.0.1", port=5178)
