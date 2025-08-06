import azure.functions as func
import psycopg2
import json
import os
from datetime import datetime

from function_app import app  # 👈 保证 function_app/__init__.py 里定义了 app

# PostgreSQL 连接配置
DB_CONFIG = {
    "host": os.environ["DB_HOST"],       # 设置成你的 PostgreSQL Server 地址
    "port": 5432,
    "dbname": os.environ["DB_NAME"],     # 你创建的 database 名
    "user": os.environ["DB_USER"],
    "password": os.environ["DB_PASSWORD"],
    "sslmode": "require",
}

@app.function_name(name="upload_boxes")
@app.route(route="upload_boxes", methods=["POST"], auth_level=func.AuthLevel.ANONYMOUS)
def upload_boxes(req: func.HttpRequest) -> func.HttpResponse:
    try:
        data = req.get_json()
        filename = data.get("filename")
        boxes = data.get("boxes")

        if not filename or not boxes:
            return func.HttpResponse("Missing filename or boxes", status_code=400)

        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        upload_date = datetime.now().date()

        for box in boxes:
            x1, y1, x2, y2 = box["bbox"]
            confidence = box.get("confidence", 1.0)

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

        return func.HttpResponse("Boxes uploaded successfully", status_code=200)

    except Exception as e:
        return func.HttpResponse(f"Error uploading boxes: {str(e)}", status_code=500)
