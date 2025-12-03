import azure.functions as func
app = func.FunctionApp()

import json
import base64
import io
import os

import numpy as np
from PIL import Image
import onnxruntime as ort
import cv2

# === Initialize YOLO Model ===
# before running inference in production environment, we need to load the model into a runtime session, after that
# we can run inference and get prediction results

# get the full path of the model file, the model file is a standalone file named yolo.onnx located in the same folder as this script
YOLO_MODEL_PATH = os.path.join(os.path.dirname(__file__), "yolo.onnx")
# load the ONNX model and create an inference session using CPU
yolo_sess = ort.InferenceSession(YOLO_MODEL_PATH, providers=["CPUExecutionProvider"])
# get the name of the input node
yolo_input_name = yolo_sess.get_inputs()[0].name
# only return boxes with confidence score higher than this threshold, suggest to keep it a bit lower and the frontend can filter boxes further if needed
confidence_threshold = 0.25

# === Initialize CNN Model ===
# the same as above, initialize the ellipse classifier model for later use
ELLIPSE_MODEL_PATH = os.path.join(os.path.dirname(__file__), "ellipse_cnn.onnx")
ellipse_sess = ort.InferenceSession(ELLIPSE_MODEL_PATH, providers=["CPUExecutionProvider"])
ellipse_input_name = ellipse_sess.get_inputs()[0].name
# this value controls how much the ellipse classifier affects the final confidence score
# it is used in line 144 below
k = 0.5


def preprocess_ellipse_image(crop_np):
    """separate function to preprocess the cropped image for ellipse classifier, the main function below will call this function"""

    # convert the cropped image to grayscale, because the ellipse classifier focus on shape rather than color
    # keeping only brightness information is more efficient for shape analysis
    gray = cv2.cvtColor(crop_np, cv2.COLOR_RGB2GRAY)

    # enhance the image contrast so it might be easier to identify the shape
    gray = cv2.equalizeHist(gray)

    # resize to 64x64, the model was trained on 64x64 images
    gray = cv2.resize(gray,(64, 64))

    # convert the grayscale image to float32 and normalize pixel values to [0,1]
    arr = gray.astype(np.float32) / 255.0

    # add two more dimensions to the array before sending it to the model
    # batch size (number of images per inference) and number of channels (color depth)
    arr = np.expand_dims(np.expand_dims(arr, axis=0), axis=0)  # shape (1,1,64,64)
    return arr


# === Predict Function ===

@app.function_name(name="predict")
@app.route(route="predict", auth_level=func.AuthLevel.ANONYMOUS, methods=["POST","OPTIONS"])
def predict(req: func.HttpRequest) -> func.HttpResponse:
    # because the frontend and backend are on different domains, the browser will send a preflight options request first
    # to check if the backend allows requests from this frontend domain
    # this code handles that request and tells the frontend it is allowed
    # it seems like i already configured CORS in local.settings.json and Azure portal, so this part might be redundant
    # you can try removing it and see if it still works
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
        # the backend is deployed on Azure Function, which is a serverless environment
        # so it can not handle file uploads directly or easily, using JSON with Base64 is slightly slower than multipart/form-data
        # but it is simpler and more reliable in this environment
        # the frontend will convert the image file into a Base64 string and send it as a JSON payload
        data = req.get_json()
        image_b64 = data.get("image_base64")
        if not image_b64:
            return func.HttpResponse("Missing image_base64", status_code=400)

        # the backend will convert the Base64 string back to binary bytes and then into an image for processing
        # convert the Base64 string into binary bytes
        image_bytes = base64.b64decode(image_b64)
        # convert the bytes into a PIL image, which can be processed directly in memory without saving it as a real file first
        # cause we only need it during this request and no need to keep it after that
        pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        original_pil = pil.copy()

        # every image is preprocessed on the frontend and resized to 608x608 before being sent to the backend
        # assert pil.size == (608, 608), f"Expect 608x608, got {pil.size}"  
        if pil.size != (608, 608):
            raise ValueError(f"Expect 608x608, got {pil.size}")
        
        # convert the PIL image into a numpy array for model inference (because ONNX Runtime only accepts numpy arrays as input)
        arr = np.array(pil).astype(np.float32) / 255.0
        # change the shape to (1,3,608,608). this input shape is the standard format used by most ONNX models (batch, channel, height, width).
        arr = np.transpose(arr, (2, 0, 1))[None, ...]  # shape (1,3,608,608)

        # run the model using the array above as input
        outputs = yolo_sess.run(None, {yolo_input_name: arr})
        # for YOLO detection models, there is only a single output element, which contains all detected boxes information
        preds   = outputs[0]   # shape (M,5+num_classes) or (M,6) if nms=True
        
        # if no boxes detected, return empty result
        if preds is None or preds.shape[0] == 0:
           return func.HttpResponse(
               # dumps is used to convert a python object into a JSON string
               json.dumps({"image": None, "boxes": []}),
               # tell the browser this is a JSON response
               mimetype="application/json"
           )
        # create a list to store all detected boxes information
        boxes_info = []

        # if the model output includes a batch dimension, use squeeze to remove it, so it's easier to process later
        if len(preds.shape) == 3:
            preds = preds.squeeze(0)  

        # extract detected box coordinates from model outputs and filter boxes by confidence threshold
        for idx, row in enumerate(preds):
            # x1, y1, x2, y2, conf, cls = [float(v) for v in row[:6]]
            x1, y1, x2, y2, conf, cls = map(float, row[0:6])
            if conf > confidence_threshold:
                # crop the detected box area from the original image for ellipse classification
                crop = np.array(original_pil)[int(y1):int(y2), int(x1):int(x2)]
                if crop.size == 0:
                    continue

                # call the preprocess function defined above to prepare the cropped image for the ellipse classifier model
                arr_cnn = preprocess_ellipse_image(crop)
                # run the ellipse classifier model, store the output logits
                cnn_output = ellipse_sess.run(None, {ellipse_input_name: arr_cnn})[0]
                # remove unnecessary dimensions from the output
                logits = float(cnn_output.squeeze())  
                # convert logits to probability using sigmoid function
                prob_non_ellipse = 1 / (1 + np.exp(-logits))
                # adjust the original confidence score based on the ellipse probability, range from (conf - k*0.5) to (conf + k*0.5)
                adjusted_conf = conf + (0.5 - prob_non_ellipse) * k
                # store the box information into the list
                boxes_info.append({
                    "bbox": [int(x1), int(y1), int(x2), int(y2)],
                    "confidence": conf,
                    "ellipse_prob": 1 - prob_non_ellipse,
                    "adjusted_confidence": adjusted_conf
                })

        # return boxes info as a json response
        return func.HttpResponse(
            body=json.dumps({
                "boxes": boxes_info
            }),
            mimetype="application/json"
        )

    except Exception as e:
        return func.HttpResponse(f"Predict error: {e}", status_code=500)
    

import upload_image
import upload_boxes