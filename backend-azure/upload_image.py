import azure.functions as func
import os
from azure.storage.blob import BlobServiceClient
from datetime import datetime

from function_app import app  # 导入 app 对象

conn_str = os.environ["AzureWebJobsStorage"]
blob_service_client = BlobServiceClient.from_connection_string(conn_str)
container_name = "images"

@app.function_name(name="upload_image")
@app.route(route="upload", auth_level=func.AuthLevel.ANONYMOUS, methods=["POST"])
def upload_image(req: func.HttpRequest) -> func.HttpResponse:
    try:
        # 获取原始二进制 body（即上传的图片）
        image_data = req.get_body()

        # 获取文件名（可选，从 query string 里拿 filename 参数）
        filename = req.params.get("filename")
        if not filename:
            filename = f"image_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.png"

        # 上传到 blob
        blob_client = blob_service_client.get_blob_client(container=container_name, blob=filename)
        blob_client.upload_blob(image_data, overwrite=True)

        return func.HttpResponse(f"Image uploaded as {filename}", status_code=200)

    except Exception as e:
        return func.HttpResponse(f"Upload failed: {str(e)}", status_code=500)
