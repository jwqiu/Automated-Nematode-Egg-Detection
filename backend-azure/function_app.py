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

# get the full path of the model file
YOLO_MODEL_PATH = os.path.join(os.path.dirname(__file__), "yolo.onnx")
# before running inference, you need to load the model into a runtime environment before you can make predictions
# load the ONNX model and create an inference session using CPU
sess = ort.InferenceSession(YOLO_MODEL_PATH, providers=["CPUExecutionProvider"])
# get the name of the input node
input_name = sess.get_inputs()[0].name
# Display only boxes with confidence scores above the defined threshold.
confidence_threshold = 0.5

@app.function_name(name="predict")
@app.route(route="predict", auth_level=func.AuthLevel.ANONYMOUS, methods=["POST","OPTIONS"])
def predict(req: func.HttpRequest) -> func.HttpResponse:
    # because the frontend and backend are on different domains, the browser will send a preflight options request first
    # to check if the backend allows requests from this frontend domain
    # this code handles that request and tells the frontend it is allowed
    if req.method == "OPTIONS":
        return func.HttpResponse(
            status_code=204,
            headers={
                "Access-Control-Allow-Origin": "*",            
                "Access-Control-Allow-Methods": "POST,OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            }
        )

    try:
        # this backend is deployed on Azure Function, which is a serverless environment, so uploading images using Base64 is a bit slower but much simpler and more realiable.
        # using multipart/form-data is a more common way to upload images, but it is more complex to handle in Azure Function
        data = req.get_json()
        image_b64 = data.get("image_base64")
        if not image_b64:
            return func.HttpResponse("Missing image_base64", status_code=400)

        # convert the Base64 string into binary bytes
        image_bytes = base64.b64decode(image_b64)
        # convert the bytes into a PIL image, which can be processed directly in memory without saving it as a real file first
        pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        original_pil = pil.copy()

        # every image is preprocessed on the frontend and resized to 608x608 before being sent to the backend
        # assert pil.size == (608, 608), f"Expect 608x608, got {pil.size}"  
        if pil.size != (608, 608):
            raise ValueError(f"Expect 608x608, got {pil.size}")
        
        # convert the PIL image into a numpy array for model inference (because ONNX Runtime only accepts numpy arrays as input)
        arr = np.array(pil).astype(np.float32) / 255.0
        arr = np.transpose(arr, (2, 0, 1))[None, ...]  # shape (1,3,608,608)

        # run the model to get model outputs
        outputs = sess.run(None, {input_name: arr})
        preds   = outputs[0]   # shape (M,5+num_classes) or (M,6) if nms=True
        
        if preds is None or preds.shape[0] == 0:
           return func.HttpResponse(
               # dumps is used to convert a python object into a JSON string
               json.dumps({"image": None, "boxes": []}),
               # tell the browser this is a JSON response
               mimetype="application/json"
           )

        boxes_info = []

        # if the model output includes a batch dimension, use squeeze to remove it, so it's easier to process later
        if len(preds.shape) == 3:
            preds = preds.squeeze(0)  

        # extract detected box coordinates from model outputs and filter boxes by confidence threshold
        for idx, row in enumerate(preds):
            x1, y1, x2, y2, conf, cls = [float(v) for v in row[:6]]
            if conf > confidence_threshold:
                boxes_info.append({
                    "bbox": [int(x1), int(y1), int(x2), int(y2)],
                    "confidence": conf
                })

        # use PIL to draw boxes and confidence scores on the image
        # a more common practice is to draw boxes on the frontend, the backend only returns the box coordinates and confidence scores
        # could move this part to frontend if needed
        draw = ImageDraw.Draw(pil)
        font = ImageFont.load_default()
        
        for b in boxes_info:
            x1, y1, x2, y2 = b["bbox"]
            # draw a red rectangle around the detected object and put the confidence score above it
            draw.rectangle([x1, y1, x2, y2], outline="red", width=2)
            text = f"{b['confidence']*100:.1f}%"
            x, y = x1, y1 - 12  

            # draw a white outline (shadow) around the red text, to make it more visible on different backgrounds
            for dx in [-1, 0, 1]:
                for dy in [-1, 0, 1]:
                    if dx != 0 or dy != 0:
                        draw.text((x + dx, y + dy), text, font=font, fill="white")
            draw.text((x, y), text, font=font, fill="red")

        # convert the annotated image with boxes and the original image back to base64 strings to send back to the frontend
        # encode annotated image with boxes
        buf1 = io.BytesIO()
        pil.save(buf1, format="PNG")
        annotated_b64 = base64.b64encode(buf1.getvalue()).decode()
        # encode original image without boxes
        buf2 = io.BytesIO()
        original_pil.save(buf2, format="PNG")
        original_b64 = base64.b64encode(buf2.getvalue()).decode()

        # return the annotated image, original image, and boxes info as a json response
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