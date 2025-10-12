# import azure.functions as func
# import json
# import base64
# import io
# import numpy as np
# from PIL import Image
# import cv2
# import torch
# import os
# from ultralytics import YOLO
# from PIL import ImageDraw, ImageFont

# # 加载模型（确保 `best.pt` 放在根目录或 predict-backend 内）
# WEIGHTS_PATH = os.path.join(os.path.dirname(__file__), "best.pt")

# model = YOLO(WEIGHTS_PATH)

# TASK = 'detect'  # 或 'segment'

# def draw_boxes_on_array(img_array, boxes):
#     image = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
#     for box in boxes:
#         x1, y1, x2, y2 = map(int, box['bbox'])
#         conf = box['confidence']
#         label = f"{conf*100:.1f}%"
#         cv2.rectangle(image, (x1, y1), (x2, y2), color=(0, 255, 128), thickness=2)
#         cv2.putText(image, label, (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX,
#                     fontScale=0.6, color=(0, 255, 128), thickness=2)
#     return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

# # 你所有的函数都定义成 Python 函数，在这里注册
# # app = func.FunctionApp()
# app = func.FunctionApp()



# @app.function_name(name="predict")
# @app.route(route="predict", auth_level=func.AuthLevel.ANONYMOUS, methods=["POST"])
# def predict(req: func.HttpRequest) -> func.HttpResponse:
#     try:
#         data = req.get_json()
#         image_b64 = data.get("image_base64")
#         filename = data.get("filename", "uploaded_image.jpg")

#         if not image_b64:
#             return func.HttpResponse(
#                 "Missing image_base64", status_code=400
#             )

#         image_bytes = base64.b64decode(image_b64)
#         image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
#         img_array = np.array(image)

#         results = model.predict(
#             source=img_array,
#             task=TASK,
#             exist_ok=True,
#             save=False,
#             save_json=False,
#             save_conf=False,
#             verbose=False
#         )

#         if not results:
#             return func.HttpResponse(
#                 json.dumps({"image": None, "boxes": []}),
#                 mimetype="application/json"
#             )

#         r = results[0]
        
#         if r.boxes is None or r.boxes.xyxy is None:
#             coords = []
#             confs = []
#         else:
#             coords = r.boxes.xyxy.cpu().numpy().tolist() # type: ignore
#             confs  = r.boxes.conf.cpu().numpy().tolist() # type: ignore

#         boxes_info = [
#             {"bbox": b, "confidence": c}
#             for b, c in zip(coords, confs)
#             if c > 0.5
#         ]        
        
#         drawn_img_array = draw_boxes_on_array(img_array, boxes_info)

#         output_pil = Image.fromarray(drawn_img_array)
#         buf = io.BytesIO()
#         output_pil.save(buf, format="PNG")
#         result_image_b64 = base64.b64encode(buf.getvalue()).decode()

#         return func.HttpResponse(
#             body=json.dumps({
#                 "image": result_image_b64,
#                 "boxes": boxes_info
#             }),
#             mimetype="application/json"
#         )

#     except Exception as e:
#         return func.HttpResponse(f"Predict error: {e}", status_code=500)

# print("✅ test_addition function loaded.")

# import azure.functions as func

# app = func.FunctionApp()

# @app.function_name(name="test_addition_1")
# @app.route(route="test", auth_level=func.AuthLevel.ANONYMOUS, methods=["GET"])
# def test_addition(req: func.HttpRequest) -> func.HttpResponse:
#     result = 1 + 1
#     return func.HttpResponse(f"The result of 1 + 1 is {result}")

import azure.functions as func

# —— 初始化 FunctionApp —— #
app = func.FunctionApp()

import json
import base64
import io
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFont
import onnxruntime as ort
import cv2

# —— 全局加载 ONNX 模型 —— #
MODEL_PATH = os.path.join(os.path.dirname(__file__), "best.onnx")
sess = ort.InferenceSession(MODEL_PATH, providers=["CPUExecutionProvider"])
input_name = sess.get_inputs()[0].name


@app.function_name(name="predict")
@app.route(route="predict", auth_level=func.AuthLevel.ANONYMOUS, methods=["POST","OPTIONS"])
def predict(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(
            status_code=204,
            headers={
                "Access-Control-Allow-Origin": "*",            # 或者写你的前端域名
                "Access-Control-Allow-Methods": "POST,OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            }
        )

    try:
        # 1. 解析输入
        data = req.get_json()
        image_b64 = data.get("image_base64")
        if not image_b64:
            return func.HttpResponse("Missing image_base64", status_code=400)

        image_bytes = base64.b64decode(image_b64)

        pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        orig_w, orig_h = pil.size
        original_pil = pil.copy()


        # 2. 预处理到 608×608，归一化，NCHW
        # img608 = pil.resize((608, 608))
        assert pil.size == (608, 608), f"Expect 608x608, got {pil.size}"  # 可选但推荐
        arr = np.array(pil).astype(np.float32) / 255.0
        arr = np.transpose(arr, (2, 0, 1))[None, ...]  # shape (1,3,608,608)

        # 3. ONNX 推理
        outputs = sess.run(None, {input_name: arr})
        preds   = outputs[0]   # shape (M,5+num_classes) or (M,6) if nms=True
        
        if preds is None or preds.shape[0] == 0:
           return func.HttpResponse(
               json.dumps({"image": None, "boxes": []}),
               mimetype="application/json"
           )

        boxes_info = []

        # 如果 shape 是 (1, 300, 6)，先 squeeze
        if len(preds.shape) == 3:
            preds = preds.squeeze(0)  # 变成 (300, 6)

        for idx, row in enumerate(preds):
            # print("DEBUG:", [(v, type(v), getattr(v, 'shape', None)) for v in row[:6]])
            # print(f"row {idx}:", row, type(row), getattr(row, "shape", None))
            x1, y1, x2, y2, conf, cls = [float(v) for v in row[:6]]
            if conf > 0.5:
                boxes_info.append({
                    "bbox": [int(x1), int(y1), int(x2), int(y2)],
                    "confidence": conf
                })
        
        # # === OpenCV 椭圆形状判断 ===
        # img_cv = np.array(original_pil)
        # img_gray = cv2.cvtColor(img_cv, cv2.COLOR_RGB2GRAY)

        # for b in boxes_info:
        #     x1, y1, x2, y2 = b["bbox"]
        #     crop = img_gray[y1:y2, x1:x2]

        #     # 二值化
        #     _, thresh = cv2.threshold(crop, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        #     # 查找轮廓
        #     contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        #     if len(contours) == 0:
        #         b["ellipse_score"] = 0.0
        #         continue

        #     # 拟合椭圆（要求至少5个点）
        #     cnt = max(contours, key=cv2.contourArea)
        #     if len(cnt) < 5:
        #         b["ellipse_score"] = 0.0
        #         continue

        #     ellipse = cv2.fitEllipse(cnt)
        #     (xc, yc), (MA, ma), angle = ellipse

        #     # 计算长短轴比（越接近1越圆）
        #     ratio = min(MA, ma) / max(MA, ma)
        #     b["ellipse_score"] = round(float(ratio), 3)

        #     # 可选：根据椭圆度调整置信度（例如轻微加权）
        #     b["adjusted_confidence"] = round(b["confidence"] * (0.5 + 0.8 * ratio), 3)

        # 5. 用 Pillow 在原图上画框和置信度
        draw = ImageDraw.Draw(pil)
        font = ImageFont.load_default()

        for b in boxes_info:
            x1, y1, x2, y2 = b["bbox"]
            draw.rectangle([x1, y1, x2, y2], outline="red", width=2)

            text = f"{b['confidence']*100:.1f}%"
            x, y = x1, y1 - 12  # 上移一点

            # 白色描边（周围一圈）
            for dx in [-1, 0, 1]:
                for dy in [-1, 0, 1]:
                    if dx != 0 or dy != 0:
                        draw.text((x + dx, y + dy), text, font=font, fill="white")

            # 红色文字在正中
            draw.text((x, y), text, font=font, fill="red")


        # 6. 输出 Base64
        # buf = io.BytesIO()
        # pil.save(buf, format="PNG")
        # result_b64 = base64.b64encode(buf.getvalue()).decode()
        # 6.1 带框图
        buf1 = io.BytesIO()
        pil.save(buf1, format="PNG")
        annotated_b64 = base64.b64encode(buf1.getvalue()).decode()

        # 6.2 原图（干净图）
        buf2 = io.BytesIO()
        original_pil.save(buf2, format="PNG")
        original_b64 = base64.b64encode(buf2.getvalue()).decode()


        # return func.HttpResponse(
        #     body=json.dumps({"image": result_b64, "boxes": boxes_info}),
        #     mimetype="application/json"
        # )
        return func.HttpResponse(
            body=json.dumps({
                "original_image": original_b64,
                "annotated_image": annotated_b64,
                "boxes": boxes_info
            }),
            mimetype="application/json"
        )


    except Exception as e:
        return func.HttpResponse(f"Predict error: {e}", status_code=500)
    

import upload_image
import upload_boxes