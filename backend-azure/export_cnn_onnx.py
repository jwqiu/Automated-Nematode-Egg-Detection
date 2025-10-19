import torch
import torch.onnx
import sys, os

# --------------------------------------------------------------------------------------------------
# this script exports the trained ellipse CNN model to ONNX format for use in Azure Function backend
# --------------------------------------------------------------------------------------------------

# ✅ 加入上级目录，方便导入 model_pipeline
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from model_pipeline.YOLO.ellipse.train_cnn_classifier import EllipseCNN

# ✅ 模型权重和导出路径
BASE_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE_DIR, "ellipse_cnn.pt")
ONNX_PATH = os.path.join(BASE_DIR, "ellipse_cnn.onnx")

# ✅ 加载模型
model = EllipseCNN(input_size=64, use_sigmoid_in_model=False,
                   extra_conv_layers=2, use_gap=False)
model.load_state_dict(torch.load(MODEL_PATH, map_location='cpu'))
model.eval()

# ✅ 创建 dummy input
dummy_input = torch.randn(1, 1, 64, 64)

# ✅ 导出 ONNX 模型到 backend-azure 文件夹内
torch.onnx.export(
    model,
    dummy_input,
    ONNX_PATH,                        # ← 改成绝对路径
    export_params=True,
    opset_version=12,
    do_constant_folding=True,
    input_names=['input'],
    output_names=['output'],
    dynamic_axes={
        'input': {0: 'batch_size'},
        'output': {0: 'batch_size'}
    }
)

print(f"✅ Exported ellipse_cnn.onnx successfully to: {ONNX_PATH}")
