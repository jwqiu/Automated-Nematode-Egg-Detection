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

# configs below show almost all the variants and experiments we have tested

CONFIGS = [

    # ---------------------------------------------------------------------------
    # the experiments below were conducted by a student in semester 1, 2025
    # ---------------------------------------------------------------------------

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
    
    # ---------------------------------------------------------------------------
    # the experiments below were conducted by Junwen in semester 2, 2025
    # ---------------------------------------------------------------------------

    # === reproduce best model in semester 1 from previous student  ===
    # {"name": "yolov8s_sgd_lr0001_max_E300P50", "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 300, "patience": 50},

    # === image size variants, current size = 608, tested 640 and 768 ===
    # {"name": "y8s_sgd_lr0001_max_sz640", "imgsz": 640, "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 300, "patience": 20},
    # {"name": "y8s_sgd_lr0001_max_sz768", "imgsz": 768, "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 50, "patience": 15},

    # === decrease the rotation angle from 90° to 15° ===
    # {"name": "y8s_sgd_lr0001_max_deg15", "degrees": 15, "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 300, "patience": 20},
    # {"name": "y8s_sgd_lr0001_max_deg15_E300P50", "degrees": 15, "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 300, "patience": 50},

    # === combine image size 768 + rotation 15° ===
    # {"name": "y8s_sgd_lr0001_max_sz768_deg15", "degrees": 15, "imgsz": 768, "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 50, "patience": 15},
    
    # === image scale variants ===
    # disable random scaling, keep original size only
    # {"name": "y8s_sgd_lr0001_max_sz768_deg15", "degrees": 15, "scale": 0.0, "imgsz": 768, "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 50, "patience": 15},
    # randomly scale the image by about ±20%
    # {"name": "y8s_sgd_lr0001_max_sz768_deg15_E50P15_scale02", "degrees": 15, "imgsz": 768, "scale": 0.2, "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 50, "patience": 15},
    
    # === Cosine LR + Mosaic Scheduling ===
    # Cosine learning rate scheduling with Mosaic disabled in the final 10 epochs (long training).
    # {"name": "y8s_sgd_lr0001_max_sz768_deg15_E300P50_cos_closeM10", "degrees": 15, "imgsz": 768, "optimizer": "SGD", "cos_lr": True, "lrf": 0.01,  "lr0": 0.001, "mosaic": 1, "close_mosaic": 10,"erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 300, "patience": 50},
    # Cosine learning rate scheduling with Mosaic disabled in the final 10 epochs (short training).
    # {"name": "y8s_sgd_lr0001_max_sz768_deg15_E50P15_cos_closeM10", "degrees": 15, "imgsz": 768, "optimizer": "SGD", "cos_lr": True, "lrf": 0.01,  "lr0": 0.001, "mosaic": 1, "close_mosaic": 10,"erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 50, "patience": 20},
    
    # === Mosaic Augmentation Comparison ===
    # disable mosaic augmentation completely
    # {"name": "y8s_sgd_lr0001_xmosaic", "mosaic": 0, "optimizer": "SGD", "lr0": 0.001, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 50, "patience": 15},
    # === disable mosaic augmentation during the final 10 epochs  ===
    # {"name": "y8s_sgd_lr0001_max_closemos10", "close_mosaic": 10, "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 50, "patience": 15},
    
    # === Cutout / Random Erasing Strength ===
    # Reduce erasing strength from 0.5 to 0.2 to test milder occlusion augmentation.
    # {"name": "y8s_sgd_lr0001_max_erase02", "erasing": 0.2, "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "fliplr": 1.0, "flipud": 0.5, "epochs": 300, "patience": 50},

    # === The best model developed in Semester 2, 2025 ===
    # {"name": "yolov8s_sgd_lr0001_max_E200P20_AD_0914", "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 200, "patience": 20},   

    # === based on the best model this semester, add brightness augmentation, change hsv_v from default 0.4 to 0.6 and 0.1  ===
    # {"name": "yolov8s_sgd_lr0001_max_E200P20_AD_0914_brightness", "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 200, "patience": 20, "hsv_v": 0.6},
    {"name": "yolov8s_sgd_lr0001_max_E200P20_AD_0914_brightness_0.1", "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 200, "patience": 20, "hsv_v": 0.1},

    # === The best model + 68 open-source images ===
    # {"name": "yolov8s_sgd_lr0001_max_E200P20_AD914_OS68", "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 200, "patience": 20},

    # === The best model + contrast augmentation ===
    # {"name": "yolov8s_sgd_lr0001_max_E200P20_AD_0914_contrast_0.2", "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 200, "patience": 20, "contrast_limit": 0.2},
    # {"name": "yolov8s_sgd_lr0001_max_E200P20_AD_0914_contrast_0.5", "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 200, "patience": 20, "contrast_limit": 0.5},
    # {"name": "yolov8s_sgd_lr0001_max_E200P20_AD_0914_contrast_0.8", "optimizer": "SGD", "lr0": 0.001, "mosaic": 1, "erasing": 0.5, "fliplr": 1.0, "flipud": 0.5, "epochs": 200, "patience": 20, "contrast_limit": 0.8},

]

# Common training arguments that apply to all configs and experiments unless you specifically override them in config above

COMMON_ARGS = {
    "model": "yolov8s.pt",
    "data": "/Users/chenyuqi/Desktop/Automated-Nematode-Egg-Detection/model_pipeline/data.yaml",
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
    "project": "/Users/chenyuqi/Desktop/Automated-Nematode-Egg-Detection/model_pipeline/Trained_Models_New/YOLO",
    "iou": 0.6,
}


# the trained model and results will be save under this root folder

EXP_ROOT = "model_pipeline/Trained_Models_New/YOLO"

# -------------------------
# Training Function
# -------------------------

def train_model(config: dict):
    """
    Train the YOLO model with the given configuration.
    """
    args = COMMON_ARGS.copy()
    args.update(config)

    exp_dir = os.path.join(EXP_ROOT, args["name"])   # generate experiment directory
    args.update({"project": exp_dir, "name": "train", "exist_ok": True})

    model = YOLO(args["model"])
    model.train(**args)

    # Return trained model weight path
    return os.path.join(exp_dir, "train", "weights", "best.pt")

# -------------------------
# Evaluation Function
# -------------------------

def evaluate_model(weight_path: str, config_name: str,  task: str):
    model = YOLO(weight_path)
    model.val(
        data=COMMON_ARGS["data"],
        task=task,
        project=f"{EXP_ROOT}/{config_name}",
        name="val",
        exist_ok=True, 
        save_json=True,
        verbose=True,
        save_txt=True,
        iou=0.5

    )

# -------------------------
# Prediction Function
# -------------------------
    
def predict_model(weight_path: str, config_name: str, task: str, source: str, data_type: str = "test"):
    model = YOLO(weight_path)
   
    tag = os.path.basename(os.path.normpath(source))

    model.predict(
        source=source,
        task=task,
        # project=f"{EXP_ROOT}/{config_name}",
        # name=f"predict_{tag}",  
        project=f"{EXP_ROOT}/{config_name}/predict_for_{data_type}",
        name=tag,
        exist_ok=True,
        save_json=True,
        save_txt=True,
        save_conf=True,
        verbose=True,
        agnostic_nms=False, 
        iou=0.2
    )

# -------------------------
# Main
# -------------------------

# there are mainly three steps in main:
# 1) train the model for each config in CONFIGS
# 2) evaluate the model on validation set after training
# 3) get prediction labels for test set, so it can be used later for evaluation or visualization

DATA_TYPE = "test"  # change as needed
test_root = f"dataset/{DATA_TYPE}/images" # test images used for final prediction after training and evaluation

if __name__ == "__main__":

    # Setup logging
    os.makedirs("model_pipeline/Log", exist_ok=True)
    logging.basicConfig(
        filename="model_pipeline/Log/yolov8s_training.log",
        filemode="w",
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s"
    )
    console = logging.StreamHandler()
    console.setLevel(logging.INFO)
    formatter = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
    console.setFormatter(formatter)
    logging.getLogger().addHandler(console)

    # start training and evaluation for each config
    start = time.time()
    logging.info("=== Starting training runs... ===")

    for config in CONFIGS:
        config_name = config["name"]
        task = config.get("task", "detect") 
        
        # train the model and get the best weight path
        logging.info(f"Training config: {config_name}")
        weight_path = train_model(config.copy())
        logging.info(f"Finished training: {config_name}")

        # evaluate the model on validation set after training
        logging.info(f"Evaluating model: {config_name}")
        evaluate_model(weight_path, config_name, task)

        logging.info(f"Predicting test images for: {config_name}")

        # get predictions labels for test set, so it can be used later for evaluation or visualization
        for sub in os.listdir(test_root):
            sub_path = os.path.join(test_root, sub)
            if os.path.isdir(sub_path):
                predict_model(weight_path, config_name, task, sub_path)


    total_time = time.time() - start
    logging.info(f"\n✅ All runs complete in {total_time:.1f} seconds")
