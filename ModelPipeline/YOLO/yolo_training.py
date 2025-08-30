# -------------------------
# Imports
# -------------------------
import os
import time
import logging
from ultralytics import YOLO

# -------------------------
# Configuration 
# -------------------------
CONFIGS = [
    #  === Default with mosaic  ===
    # {"name": "yolov8s_default"},

    #  === No mosaic  ===
    # {"name": "yolov8s_default_xmosaic", "mosaic": 0},

    #   === No mosaic + cutout + flips ===
    # {"name": "yolov8s_default_xmosaic_cutout", "mosaic": 0, "erasing": 0.6, "fliplr": 1.0, "flipud": 0.5},

    #  === SGD variants  ===
    # {"name": "yolov8s_sgd_lr001", "optimizer": "SGD", "lr0": 0.01},
    # {"name": "yolov8s_sgd_lr0005", "optimizer": "SGD", "lr0": 0.005},
    # {"name": "yolov8s_sgd_lr0001", "optimizer": "SGD", "lr0": 0.001},  # best 
    
    # {"name": "yolov8s_sgd_lr0001_xmosaic_cutout", "optimizer": "SGD", "lr0": 0.001, "mosaic": 0, "erasing": 0.6}, # best 
    # {"name": "yolov8s_sgd_lr0001_xmosaic_cutout_3", "optimizer": "SGD", "lr0": 0.001, "mosaic": 0, "erasing": 0.6, "fliplr": 1.0, "flipud": 0.5}, # best 
    # {"name": "yolov8s_sgd_lr0001_xmosaic_cutout_4", "optimizer": "SGD", "lr0": 0.001, "mosaic": 0, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5}, # best 
    # {"name": "yolov8s_sgd_lr0001_xmosaic_cutout_degree_90", "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "erasing": 0.8, "fliplr": 1.0, "flipud": 0.5}, 
    
    #  === SGD variants - strong augmentation  === https://docs.ultralytics.com/guides/yolo-data-augmentation/#auto-augment-auto_augment 
    # {"name": "yolov8s_adam_lr0001_xmosaic", "optimizer": "Adam", "lr0": 0.001, "mosaic": 0, "erasing": 0.8, "fliplr": 1.0, "flipud": 0.5}, 
    # {"name": "yolov8s_sgd_lr0001_xmosaic_cutout_max", "optimizer": "SGD", "lr0": 0.001, "mosaic": 0, "erasing": 0.8, "fliplr": 1.0, "flipud": 0.5, "epochs": 300, "patience": 50}, 

  
    # 历史上最好的实验
    {"name": "yolov8s_sgd_lr0001_max_E300P50", "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 300, "patience": 50},   
    # 历史上最好的实验，但是epochs和patience减少到50和15，目的是衡量epochs和patience减少的影响，是否是导致现在实验效果和历史最好实验差距的原因
    # {"name": "yolov8s_sgd_lr0001_max_E50P15", "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 10, "patience": 5},   
    # 历史上最好的实验，但是epochs和patience减少到50和15，以及关闭 auto_augment，目的是衡量 RandAugment（及其依赖的 Albumentations 变换）是否在当前环境上没有正确工作，大幅拉低了目前的实验效果
    # {"name": "yolov8s_sgd_lr0001_max_E50P15_noAA", "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 50, "patience": 15,"auto_augment": "none"},   
    # 历史上最好的实验，但是epochs和patience减少到50和15，以及关闭 auto_augment和相关的增强，目的是建立一个更稳定的“纯基线”
    # {"name": "yolov8s_sgd_lr0001_max_E50P15_noAA_pure", "optimizer": "SGD", "lr0": 0.001, "mosaic": 0, "erasing": 0, "fliplr": 0.0, "flipud": 0.0, "epochs": 50, "patience": 15,"auto_augment": "none"},  
    # 上次跑实验时最好的两个正向变量叠加
    # {"name": "y8s_sgd_lr0001_max_sz768_deg15", "degrees": 15, "imgsz": 768, "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 50, "patience": 15},

    # 上次跑实验时最好的两个正向变量叠加+长训
    {"name": "y8s_sgd_lr0001_max_sz768_deg15_E300P50", "degrees": 15, "imgsz": 768, "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 300, "patience": 50},
    # 用增强里的 scale 做 ±20% 的轻缩放。
    # {"name": "y8s_sgd_lr0001_max_sz768_deg15_E50P15_scale02", "degrees": 15, "imgsz": 768, "scale": 0.2, "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 50, "patience": 15},
    # 余弦退火 (cosine LR) + 末期关闭 Mosaic
    # {"name": "y8s_sgd_lr0001_max_sz768_deg15_E50P15_cos_closeM10", "degrees": 15, "imgsz": 768, "optimizer": "SGD", "cos_lr": True, "lrf": 0.01,  "lr0": 0.001, "mosaic": 1, "close_mosaic": 10,"erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 50, "patience": 20},

    # {"name": "y8s_sgd_lr0001_max_sz768_deg15", "degrees": 15, "scale": 0.0, "imgsz": 768, "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 50, "patience": 15},
    # {"name": "y8s_sgd_lr0001_max_deg15_E300P50", "degrees": 15, "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 300, "patience": 50},
    # {"name": "y8s_sgd_lr0001_max_sz768_deg15_E300P50_cos_closeM10", "degrees": 15, "imgsz": 768, "optimizer": "SGD", "cos_lr": True, "lrf": 0.01,  "lr0": 0.001, "mosaic": 1, "close_mosaic": 10,"erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 300, "patience": 50},

    # image size variants
    # {"name": "y8s_sgd_lr0001_max_sz640", "imgsz": 640, "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 50, "patience": 15},
    # {"name": "y8s_sgd_lr0001_max_sz768", "imgsz": 768, "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 50, "patience": 15},

    # === 几何增强对比：减小旋转角度（从90°降到15°） ===
    # {"name": "y8s_sgd_lr0001_max_deg15", "degrees": 15, "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 50, "patience": 15},

    # === Mosaic 数据增强对比：完全关闭 mosaic ===
    # {"name": "y8s_sgd_lr0001_xmosaic", "mosaic": 0, "optimizer": "SGD", "lr0": 0.001, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 50, "patience": 15},

    # === Mosaic 数据增强对比：训练末期关闭 mosaic（最后10个 epoch） ===
    # {"name": "y8s_sgd_lr0001_max_closemos10", "close_mosaic": 10, "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 50, "patience": 15},

    # === 遮挡增强对比：Cutout/Erasing 强度从0.5降到0.2 ===
    # {"name": "y8s_sgd_lr0001_max_erase02", "erasing": 0.2, "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "fliplr": 1.0, "flipud": 0.5, "epochs": 300, "patience": 50},

    # === 优化器对比：SGD 换为 Adam，其他参数不变 ===
    # {"name": "y8s_adam_lr0001_max", "optimizer": "Adam", "lr0": 0.001, "mosaic": 1, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 300, "patience": 50},

    # === 正则化对比：SGD 加权重衰减（weight_decay=5e-4） ===
    # {"name": "y8s_sgd_lr0001_max_wd5e-4", "weight_decay": 0.0005, "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 300, "patience": 50},

    # === Adam variants ===
    # {"name": "yolov8s_adam_lr001", "optimizer": "Adam", "lr0": 0.01, "mosaic": 1, "erasing": 0.8, "fliplr": 1.0, "flipud": 0.5, "degrees": 0},
    # {"name": "yolov8s_adam_lr0005", "optimizer": "Adam", "lr0": 0.005, "mosaic": 1, "erasing": 0.8, "fliplr": 1.0, "flipud": 0.5, "degrees": 0},
    # {"name": "yolov8s_adam_lr0001", "optimizer": "Adam", "lr0": 0.001, "mosaic": 1, "erasing": 0.8, "fliplr": 1.0, "flipud": 0.5, "degrees": 0}, # best 
    
    # {"name": "yolov8s_adam_lr0012", "optimizer": "Adam", "lr0": 0.01, "mosaic": 1, "erasing": 0.8, "fliplr": 1.0, "flipud": 0.5, "degrees": 90},
    # {"name": "yolov8s_adam_lr00052", "optimizer": "Adam", "lr0": 0.005, "mosaic": 1, "erasing": 0.8, "fliplr": 1.0, "flipud": 0.5, "degrees": 90},
    # {"name": "yolov8s_adam_lr00012", "optimizer": "Adam", "lr0": 0.001, "mosaic": 1, "erasing": 0.8, "fliplr": 1.0, "flipud": 0.5, "degrees": 90}, # best

    # === AdamW variants ===
    # {"name": "yolov8s_adamw_lr001", "optimizer": "AdamW", "lr0": 0.01, "mosaic": 1, "erasing": 0.8, "fliplr": 1.0, "flipud": 0.5},
    # {"name": "yolov8s_adamw_lr0005", "optimizer": "AdamW", "lr0": 0.005, "mosaic": 1, "erasing": 0.8, "fliplr": 1.0, "flipud": 0.5},
    # {"name": "yolov8s_adamw_lr0001", "optimizer": "AdamW", "lr0": 0.001, "mosaic": 1, "erasing": 0.8, "fliplr": 1.0, "flipud": 0.5}, # best
    
    #  === YOLOv8m (larger object detection model) ===
    # {"name": "yolov8m_sgd_lr0001", "model": "yolov8m.pt", "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 300, "patience": 50},
    # {"name": "yolov8m_sgd_lr0001_max", "model": "yolov8m.pt", "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "erasing": 0.8, "fliplr": 1.0, "flipud": 0.5, "epochs": 300, "patience": 50},
    
    # === YOLOv8-seg for instance segmentation ===
    # {"name": "yolov8s_seg_lr0001", "model": "yolov8s-seg.pt", "data": "data_seg.yaml", "task": "segment", "optimizer": "SGD", "lr0": 0.001, "mosaic": 0, "erasing": 0.0, "fliplr": 1.0, "flipud": 0.5, "epochs": 200, "patience": 30},
    # {"name": "yolov8s_seg_lr0001_eras", "model": "yolov8s-seg.pt", "data": "data_seg.yaml", "task": "segment", "optimizer": "SGD", "lr0": 0.001, "mosaic": 0, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 200, "patience": 30}
    
    
]

COMMON_ARGS = {
    "model": "yolov8s.pt",
    "data": "/Users/chenyuqi/Desktop/Automated-Nematode-Egg-Detection/modelpipeline/data.yaml",
    "task": "detect",
    "epochs": 200,
    "imgsz": 608,
    "batch": 16,
    "patience": 30,
    "degrees": 90,
    "translate": 0.1,
    "scale": 0.2,
    "shear": 2,
    "perspective": 0.0005,
    "hsv_h": 0.015,
    "hsv_s": 0.7,
    "hsv_v": 0.4,
    "project": "/Users/chenyuqi/Desktop/Automated-Nematode-Egg-Detection/modelpipeline/Trained_Models_New/YOLO",
    # "workers": 4
}

# COMMON_ARGS = {
#     "model": "yolov8s.pt",
#     "data": "/Users/chenyuqi/Desktop/Automated-Nematode-Egg-Detection/modelpipeline/data.yaml",
#     "task": "detect",
#     "epochs": 200,         # 具体每个实验若写了 epochs=50，会覆盖这里
#     "imgsz": 608,
#     "batch": -1,           # 改：自动选择最大可用 batch
#     "patience": 30,
#     "degrees": 90,
#     "translate": 0.1,
#     "scale": 0.2,
#     "shear": 2,
#     "perspective": 0.0005,
#     "hsv_h": 0.015,
#     "hsv_s": 0.7,
#     "hsv_v": 0.4,
#     "project": "/Users/chenyuqi/Desktop/Automated-Nematode-Egg-Detection/modelpipeline/Trained_Models_New/YOLO",

#     # 新增（提速&稳妥）
#     "cache": True,
#     "workers": 4,
#     "device": "mps",       # Apple 芯片可用；若报错就移除此行
#     "auto_augment": None   # 先关掉以避免 quality_range 兼容问题
# }

EXP_ROOT = "modelpipeline/Trained_Models_New/YOLO"

# -------------------------
# Training Function
# -------------------------
def train_model(config: dict):
    args = COMMON_ARGS.copy()
    args.update(config)

    exp_dir = os.path.join(EXP_ROOT, args["name"])   # 实验根 = Trained_Models_New/YOLO/{实验名}
    args.update({"project": exp_dir, "name": "train", "exist_ok": True})

    model = YOLO(args["model"])
    model.train(**args)

    # Return trained model weight path
    # return os.path.join(args["project"], args["name"], "weights", "best.pt")
    return os.path.join(exp_dir, "train", "weights", "best.pt")

# -------------------------
# Evaluation Function
# -------------------------
def evaluate_model(weight_path: str, config_name: str,  task: str):
    model = YOLO(weight_path)
    model.val(
        data=COMMON_ARGS["data"],
        task=task,
        # project=f"Processed_Images/YOLO/{config_name}",
        project=f"{EXP_ROOT}/{config_name}",

        name="val",
        exist_ok=True, 
        save_json=True,
        verbose=True,
        save_txt=True
    )

# -------------------------
# Prediction Function
# -------------------------
# def predict_model(weight_path: str, config_name: str, task: str, name):
#     model = YOLO(weight_path)
#     model.predict(
#         source=f"dataset/{name}/images",
#         task=task,
#         # project=f"Processed_Images/YOLO/{config_name}",
#         project=f"{EXP_ROOT}/{config_name}",

#         # name = name,
#         name = f"predict_{name}",
#         exist_ok=True, 
#         save_json=True,
#         save_txt=True,
#         save_conf=True,
#         verbose=True
#     )
    
def predict_model(weight_path: str, config_name: str, task: str, source: str):
    model = YOLO(weight_path)
    # 从 source 路径里取最后的目录名当作 run 名称
    tag = os.path.basename(os.path.normpath(source))

    model.predict(
        source=source,
        task=task,
        project=f"{EXP_ROOT}/{config_name}",
        name=f"predict_{tag}",   # 输出文件夹带上来源名字
        exist_ok=True,
        save_json=True,
        save_txt=True,
        save_conf=True,
        verbose=True
    )


def predict_model_for_web(weight_path, config_name, task, source, project, name):

    model = YOLO(weight_path)
    model.predict(
        source=source,            # 现在是真正的文件路径
        project=project,
        name=name,
        task=task,
        exist_ok=True,
        save_json=True,
        save_txt=False,
        save_conf=True,
        save=True,
        verbose=False
    )


# -------------------------
# Main
# -------------------------
if __name__ == "__main__":
    # os.makedirs("Log", exist_ok=True)
    os.makedirs("modelpipeline/Log", exist_ok=True)
    logging.basicConfig(
        filename="modelpipeline/Log/yolov8s_training.log",
        filemode="w",
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s"
    )
    console = logging.StreamHandler()
    console.setLevel(logging.INFO)
    formatter = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
    console.setFormatter(formatter)
    logging.getLogger().addHandler(console)

    start = time.time()
    logging.info("=== Starting YOLOv8s training runs... ===")

    for config in CONFIGS:
        config_name = config["name"]
        task = config.get("task", "detect") 
        
        logging.info(f"Training config: {config_name}")
        weight_path = train_model(config.copy())
        logging.info(f"Finished training: {config_name}")

        logging.info(f"Evaluating model: {config_name}")
        evaluate_model(weight_path, config_name, task)

        logging.info(f"Predicting test images for: {config_name}")
        # predict_model(weight_path, config_name, task, name = "test")
        # predict_model(weight_path, config_name, task,
        #       "dataset/test/images/data_from_Denise_828")
        # predict_model(weight_path, config_name, task,
        #       "dataset/test/images/previous_data")
        test_root = "dataset/test/images"
        for sub in os.listdir(test_root):
            sub_path = os.path.join(test_root, sub)
            if os.path.isdir(sub_path):
                predict_model(weight_path, config_name, task, sub_path)


    total_time = time.time() - start
    logging.info(f"\n✅ All runs complete in {total_time:.1f} seconds")
