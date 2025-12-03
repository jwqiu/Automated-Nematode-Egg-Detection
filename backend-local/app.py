import os
from dotenv import load_dotenv
from utils_path import resource_path

# load environment variables from .env file, so it can be located correctly after packing
load_dotenv(resource_path(".env"))    

from flask import Flask, request, jsonify
import base64, io, os, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import onnxruntime as ort
from flask_cors import CORS

app = Flask(__name__)

# flask runs as a standalone web server, so we need to manually enable CORS in the code
# For Azure Functions backend, CORS only needs to be configured in the Azure portal or local.settings.json; it works automatically after that.

CORS(app,
     resources={
         r"/predict": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]},
         r"/upload/image": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]},
         r"/upload/boxes": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]},
     },
     supports_credentials=False,
     allow_headers=["Content-Type"],
     methods=["POST", "OPTIONS"])

# if this backend is used in Electron desktop application, os.path,join might fail to find the model file after packaging
# because the model file and the function file are not stored in the same directory after packaging
# therefore, resource_path() is used here instead, it work both in development and after packaging

# RUNTIME_DIR = os.path.join(os.path.dirname(__file__), "runtime_assets")
# MODEL_PATH  = os.path.join(RUNTIME_DIR, "best.onnx")
RUNTIME_DIR = resource_path("runtime_assets")
MODEL_PATH  = resource_path("runtime_assets", "best.onnx")
sess = ort.InferenceSession(MODEL_PATH, providers=["CPUExecutionProvider"])
input_name = sess.get_inputs()[0].name

#-------------------------------------------------------------------------------------------------------------------------------------------
# most of the code below is similar to the azure function backend implementation, for detail comments and explanations, please refer to backend-azure/function_app.py
# this local flask backend is not up to date with the azure function backend, update this file from backend-azure/function_app.py if needed
# for example, the ellipse classifier is not integrated to this local backend yet, and the box drawing part is still done on the backend instead of frontend
#-------------------------------------------------------------------------------------------------------------------------------------------

# in the electron desktop application, the backend service take some time to start up, this endpoint is used by the frontend to check
# whether the backend is ready to accept requests, only when this endpoint responds successfully, the detection button will be clickable on the frontend
@app.get("/health")
def health():
    return {"ok": True}

@app.post("/predict")
def predict():
    try:
        # extract base64 image from request JSON
        data = request.get_json(force=True)
        image_b64 = data.get("image_base64")
        if not image_b64:
            return jsonify({"error": "Missing image_base64"}), 400
        
        # decode base64 to bytes
        image_bytes = base64.b64decode(image_b64)

        # convert bytes to PIL image
        pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        orig_w, orig_h = pil.size
        original_pil = pil.copy()

        # the frontend already resized the image to this size
        assert pil.size == (608, 608), f"Expect 608x608, got {pil.size}"  

        # convert PIL image to numpy array before feeding into model and change the shape to standard format
        arr = np.array(pil).astype(np.float32) / 255.0
        arr = np.transpose(arr, (2, 0, 1))[None, ...]  # shape (1,3,608,608)

        # run the model and store the output predictions
        outputs = sess.run(None, {input_name: arr})
        preds   = outputs[0] if outputs else None  # shape (M,5+num_classes) or (M,6) if nms=True

        if preds is None or (hasattr(preds, "shape") and preds.shape[0] == 0):
            return jsonify({"original_image": None, "annotated_image": None, "boxes": []})

        boxes_info = []

        # remove batch dimension if exists
        if len(preds.shape) == 3:
            preds = preds.squeeze(0)  # 变成 (N, 6)

        # extract boxes with confidence > 0.5
        for row in preds:
            x1, y1, x2, y2, conf, cls = [float(v) for v in row[:6]]
            if conf > 0.5:
                boxes_info.append({
                    "bbox": [int(x1), int(y1), int(x2), int(y2)],
                    "confidence": conf
                })

        # Draw boxes on the image. In the Azure Function backend, this part was removed and the frontend now handles the drawing instead.
        draw = ImageDraw.Draw(pil)
        font = ImageFont.load_default()

        for b in boxes_info:
            x1, y1, x2, y2 = b["bbox"]
            draw.rectangle([x1, y1, x2, y2], outline="red", width=2)

            text = f"{b['confidence']*100:.1f}%"
            tx, ty = x1, max(0, y1 - 12)  

            for dx in [-1, 0, 1]:
                for dy in [-1, 0, 1]:
                    if dx != 0 or dy != 0:
                        draw.text((tx + dx, ty + dy), text, font=font, fill="white")

            draw.text((tx, ty), text, font=font, fill="red")

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

#-------------------------------------------------------------------------------------------------------------
# the following code handles uploading images and drawn boxes to azure blob storage and postgresql database
# This part is basically the same as its counterpart in the Azure Function backend. no change needed.
# for more detailed comments and code explanations, please refer to backend-azure/upload_image.py and backend-azure/upload_boxes.py
#-------------------------------------------------------------------------------------------------------------

# upload drawn boxes to PostgreSQL database
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


# upload image to Azure Blob Storage
from azure.storage.blob import BlobServiceClient

BLOB_CONTAINER = os.environ.get("AZURE_BLOB_CONTAINER", "images")
AZURE_BLOB_CONN_STR = (
    os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    or os.getenv("AzureWebJobsStorage")
)

assert AZURE_BLOB_CONN_STR, "Missing Azure Storage connection string"

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
    app.run(host="127.0.0.1", port=5178)


