import torch
import torch.onnx
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from model_pipeline.YOLO.ellipse.train_cnn_classifier import EllipseCNN

# --------------------------------------------------------------------------------------------------
# this script exports the trained ellipse CNN model to ONNX format for use in Azure Function backend
# before running this script, copy the trained ellipse CNN model file (ellipse_cnn.pt) from model_pipeline to this folder
# --------------------------------------------------------------------------------------------------

# define key file paths
BASE_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE_DIR, "ellipse_cnn.pt")
ONNX_PATH = os.path.join(BASE_DIR, "ellipse_cnn.onnx")

# initialize the model and load the trained weights
model = EllipseCNN(input_size=64, use_sigmoid_in_model=False,
                   extra_conv_layers=2, use_gap=False)
model.load_state_dict(torch.load(MODEL_PATH, map_location='cpu'))
model.eval()

# in this CNN export script, we need to create a dummy input manually so PyTorch knows the input shape during export
# but YOLO handles that internally, the framework automatically creates a sample input when we call export function, so we don't need to do it ourselves
dummy_input = torch.randn(1, 1, 64, 64)

# export ONNX model to backend-azure folder
torch.onnx.export(
    model,
    dummy_input, # the sample input we created above
    ONNX_PATH,   # where to save the ONNX model                    
    export_params=True,
    opset_version=12,
    do_constant_folding=True,
    input_names=['input'], # give names to the model input and output for easier reference later
    output_names=['output'],
    dynamic_axes={
        'input': {0: 'batch_size'}, # make the first dimension (batch size) dynamic
        'output': {0: 'batch_size'} # so we can run inference on multiple images at once if needed
    }
)

print(f"✅ Exported ellipse_cnn.onnx successfully to: {ONNX_PATH}")

# compared to the export script for the YOLO model, this one looks more complicated, because the YOLO framework has built-in export features
# so we don't need to configure anything manually, but this CNN is a custom model, so i have to specify all the details myself - like the structure, input, and output
