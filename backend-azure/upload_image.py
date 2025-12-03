import azure.functions as func
import os
from azure.storage.blob import BlobServiceClient
from datetime import datetime
from function_app import app  

# -------------------------------------------------------------
# the API endpoint to upload images to Azure Blob Storage
# -------------------------------------------------------------

# connection configuration from environment variables
conn_str = os.environ["AzureWebJobsStorage"]
blob_service_client = BlobServiceClient.from_connection_string(conn_str)

# where to store the images
container_name = "images"

@app.function_name(name="upload_image")
@app.route(route="upload/image", auth_level=func.AuthLevel.ANONYMOUS, methods=["POST","OPTIONS"])
def upload_image(req: func.HttpRequest) -> func.HttpResponse:
    try:
        # read image data from the request body
        # we send the image file fron the frontend and include it in the request body directly
        # the browser automatically uploads it as binary data, and on the backend, we can read it as bytes
        image_data = req.get_body()
        filename = req.params.get("filename")
        if not filename:
            filename = f"image_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.png"

        # we upload the image as binary data, but it is still the original image - just in bytes format
        blob_client = blob_service_client.get_blob_client(container=container_name, blob=filename)
        blob_client.upload_blob(image_data, overwrite=True)

        return func.HttpResponse(f"Image uploaded as {filename}", status_code=200)

    except Exception as e:
        return func.HttpResponse(f"Upload failed: {str(e)}", status_code=500)
