from flask import Flask, render_template, request, send_from_directory, redirect, url_for
from ultralytics import YOLO
import cv2
import os
import uuid

app = Flask(__name__)

UPLOADS_FOLDER = 'static/uploads'
os.makedirs(UPLOADS_FOLDER, exist_ok=True)

RESULTS_FOLDER = 'static/results'
os.makedirs(RESULTS_FOLDER, exist_ok=True)

model = YOLO("yolov8n.pt")

def get_image_list():
    # 只显示图片文件
    return [f for f in os.listdir(UPLOADS_FOLDER) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp'))]

@app.route('/')
def index():
    images = get_image_list()
    # 获取用户选择的图片，如果没有则默认选中第一个
    selected = request.args.get('selected_image', images[0] if images else None)
    return render_template(
        'detect_cat.html',
        images=images,
        selected_image=selected,
        num_cats=None,
        result_image=None
    )

@app.route('/upload', methods=['POST'])
def upload():
    file = request.files.get('image')
    if file:
        filename = f"{uuid.uuid4().hex}.jpg"
        filepath = os.path.join(UPLOADS_FOLDER, filename)
        file.save(filepath)
        # 将新上传的图片设置为默认选中
        return redirect(url_for('index', selected_image=filename))
    return redirect(url_for('index'))


@app.route('/detect', methods=['POST'])
def detect():
    image_name = request.form.get('selected_image')
    if not image_name:
        return redirect(url_for('index'))
    image_path = os.path.join(UPLOADS_FOLDER, image_name)
    results = model(image_path, imgsz=320)
    cat_count = sum(int(box.cls[0]) == 15 for box in results[0].boxes)
    annotated = results[0].plot()
    output_name = f"result_{uuid.uuid4().hex}.jpg"
    output_path = os.path.join(RESULTS_FOLDER, output_name)
    cv2.imwrite(output_path, annotated)
    return render_template(
        'detect_cat.html',
        images=get_image_list(),
        selected_image=image_name,
        num_cats=cat_count,
        result_image=output_name
    )


@app.route('/static/<folder>/<filename>')
def serve_file(folder, filename):
    if folder == "uploads":
        return send_from_directory(UPLOADS_FOLDER, filename)
    elif folder == "results":
        return send_from_directory(RESULTS_FOLDER, filename)
    else:
        return "Invalid folder", 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
