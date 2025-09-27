import os
import glob
import numpy as np
from typing import Dict, List, Tuple, Optional


# -------------------------
# Configuration
# -------------------------
MODEL_NAME = 'yolov8s_sgd_lr0001_max_E200P20_AD_0914' # change this 
# SPLIT = 'val'
DATA_TYPE = 'test'
GT_FOLDER = os.path.join('dataset', DATA_TYPE, 'labels') 
# PRED_FOLDER = os.path.join('Processed_Images', 'YOLO', MODEL_NAME, SPLIT, 'labels')
PRED_FOLDER = os.path.join('model_pipeline', 'Trained_Models_New', 'YOLO', MODEL_NAME)
OUTPUT_DIR = os.path.join('model_pipeline', 'evaluation', 'YOLO', MODEL_NAME, DATA_TYPE)
TARGET_CLASS = 0
IOU_THRESHOLDS = [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95]

os.makedirs(OUTPUT_DIR, exist_ok=True)

# -------------------------
# Helper function 
# -------------------------

def xywh_to_xyxy(box: List[float]) -> List[float]:
    """Convert YOLO format (x_center, y_center, width, height) to (x1, y1, x2, y2)."""
    x, y, w, h = box
    return [x - w/2, y - h/2, x + w/2, y + h/2]

def iou(box1: List[float], box2: List[float]) -> float:
    """Calculate Intersection over Union (IoU) between two bounding boxes."""
    xi1 = max(box1[0], box2[0])
    yi1 = max(box1[1], box2[1])
    xi2 = min(box1[2], box2[2])
    yi2 = min(box1[3], box2[3])
    
    inter_w = max(0, xi2 - xi1)
    inter_h = max(0, yi2 - yi1)
    inter_area = inter_w * inter_h
    
    area1 = max(0, (box1[2] - box1[0]) * (box1[3] - box1[1]))
    area2 = max(0, (box2[2] - box2[0]) * (box2[3] - box2[1]))
    union_area = area1 + area2 - inter_area
    
    return inter_area / union_area if union_area > 0 else 0.0

# -------------------------
# Data loading 
# -------------------------
def load_ground_truth(folder: str) -> Dict[str, List[List[float]]]:
    """Load ground truth annotations from YOLO format files."""
    print(f"Loading ground truth from: {folder}")
    
    if not os.path.exists(folder):
        raise FileNotFoundError(f"Ground truth folder not found: {folder}")
    
    gt_data = {}
    # label_files = glob.glob(os.path.join(folder, '*.txt'))
    label_files = glob.glob(os.path.join(folder, '*', '*.txt'))
    
    if not label_files:
        print(f"Warning: No label files found in {folder}")
        return gt_data
    
    for file_path in label_files:
        # filename = os.path.splitext(os.path.basename(file_path))[0]
        parent  = os.path.basename(os.path.dirname(file_path))        # e.g. data_from_Denise_828
        stem    = os.path.splitext(os.path.basename(file_path))[0]    # e.g. img001
        filename = f"{parent}/{stem}"    
        boxes = []
        
        try:
            with open(file_path, 'r') as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    if not line:
                        continue
                    
                    parts = line.split()
                    if len(parts) < 5:
                        print(f"Warning: Skipping invalid line {line_num} in {file_path}")
                        continue
                    
                    cls = int(parts[0])
                    if cls != TARGET_CLASS:
                        continue
                    
                    coords = list(map(float, parts[1:5]))
                    boxes.append(xywh_to_xyxy(coords))
        
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            continue
        
        gt_data[filename] = boxes

    return gt_data

def load_predictions(folder: str) -> Dict[str, List[Tuple[List[float], float]]]:
    """Load predictions from YOLO format files with confidence scores."""
    print(f"Loading predictions from: {folder}")
    
    if not os.path.exists(folder):
        raise FileNotFoundError(f"Predictions folder not found: {folder}")
    
    pred_data = {}
    # label_files = glob.glob(os.path.join(folder, '*.txt'))
    label_files = glob.glob(os.path.join(folder, 'predict_*', 'labels', '*.txt'))

    if not label_files:
        print(f"Warning: No prediction files found in {folder}")
        return pred_data
    
    for file_path in label_files:
        # filename = os.path.splitext(os.path.basename(file_path))[0]
        run_dir = os.path.basename(os.path.dirname(os.path.dirname(file_path)))  # predict_data_from_Denise_828
        parent  = run_dir.replace("predict_", "")                                # data_from_Denise_828
        stem    = os.path.splitext(os.path.basename(file_path))[0]               # img001
        filename = f"{parent}/{stem}"
        detections = []
        
        try:
            with open(file_path, 'r') as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    if not line:
                        continue
                    
                    parts = line.split()
                    if len(parts) < 6:
                        print(f"Warning: Skipping invalid prediction line {line_num} in {file_path}")
                        continue
                    
                    cls = int(parts[0])
                    if cls != TARGET_CLASS:
                        continue
                    
                    bbox = list(map(float, parts[1:5]))
                    confidence = float(parts[5])
                    detections.append((xywh_to_xyxy(bbox), confidence))
        
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            continue
        
        # Sort by confidence (highest first)
        pred_data[filename] = sorted(detections, key=lambda x: -x[1])
    
    return pred_data


# -------------------------
# Merge close boxes function 
# -------------------------

def nms_greedy(
    dets: List[Tuple[List[float], float]],  # [(bbox_xyxy, score), ...]
    iou_thr: float = 0.6,
    max_keep: Optional[int] = None
) -> List[Tuple[List[float], float]]:
    """
    对单张图片的检测结果做 NMS。保留高分，去掉与其 IoU >= iou_thr 的低分框。
    dets: [( [x1,y1,x2,y2], score ), ...]  (已按 score 从高到低排序更好)
    """
    if not dets:
        return dets

    # 确保按分数降序
    dets = sorted(dets, key=lambda x: -x[1])
    keep = []
    removed = [False] * len(dets)

    for i, (bi, si) in enumerate(dets):
        if removed[i]:
            continue
        keep.append((bi, si))
        if max_keep is not None and len(keep) >= max_keep:
            break
        for j in range(i + 1, len(dets)):
            if removed[j]:
                continue
            bj, sj = dets[j]
            if iou(bi, bj) >= iou_thr:
                removed[j] = True

    return keep

# -------------------------
# Evaluation function 
# -------------------------
def compute_detection_metrics(gt_data: Dict, pred_data: Dict, iou_threshold: float = 0.5) -> Tuple[float, float, float, List[str]]:
    """Compute precision, recall, and F1-score at a specific IoU threshold.
       同时返回有问题的图片名。
    """
    true_positives = false_positives = false_negatives = 0
    bad_images = []  # 新增
    
    for img_name, gt_boxes in gt_data.items():
        pred_detections = pred_data.get(img_name, [])
        pred_boxes = [bbox for bbox, _ in pred_detections]
        
        matched_gt_indices = set()
        
        # Match predictions to ground truth
        for pred_box in pred_boxes:
            best_iou = 0
            best_gt_idx = -1
            
            for gt_idx, gt_box in enumerate(gt_boxes):
                if gt_idx in matched_gt_indices:
                    continue
                
                current_iou = iou(pred_box, gt_box)
                if current_iou > best_iou:
                    best_iou = current_iou
                    best_gt_idx = gt_idx
            
            if best_iou >= iou_threshold:
                true_positives += 1
                matched_gt_indices.add(best_gt_idx)
            else:
                false_positives += 1
                bad_images.append(img_name)
        
        fn_img = len(gt_boxes) - len(matched_gt_indices)
        false_negatives += fn_img
        if fn_img > 0:
            bad_images.append(img_name)
    
    precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0.0
    recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0.0
    f1_score = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

    return precision, recall, f1_score, sorted(set(bad_images))
    # return precision, recall, f1_score

def compute_average_precision(gt_data: Dict, pred_data: Dict, iou_threshold: float = 0.5) -> float:
    """Compute Average Precision (AP) using 11-point interpolation."""
    # Collect all predictions with their confidence scores
    all_predictions = []
    total_gt_boxes = sum(len(boxes) for boxes in gt_data.values())
    
    for img_name, detections in pred_data.items():
        for bbox, confidence in detections:
            all_predictions.append((img_name, bbox, confidence))
    
    # Sort by confidence (highest first)
    all_predictions.sort(key=lambda x: -x[2])
    
    # Track matches for each image
    matched_gt = {img: set() for img in gt_data}
    tp_list = []
    fp_list = []
    
    for img_name, pred_box, _ in all_predictions:
        gt_boxes = gt_data.get(img_name, [])
        best_iou = 0
        best_gt_idx = -1
        
        for gt_idx, gt_box in enumerate(gt_boxes):
            if gt_idx in matched_gt[img_name]:
                continue
            
            current_iou = iou(pred_box, gt_box)
            if current_iou > best_iou:
                best_iou = current_iou
                best_gt_idx = gt_idx
        
        if best_iou >= iou_threshold:
            tp_list.append(1)
            fp_list.append(0)
            matched_gt[img_name].add(best_gt_idx)
        else:
            tp_list.append(0)
            fp_list.append(1)
    
    # Compute cumulative TP and FP
    tp_cumsum = np.cumsum(tp_list)
    fp_cumsum = np.cumsum(fp_list)
    
    # Compute precision and recall arrays
    recalls = tp_cumsum / total_gt_boxes if total_gt_boxes > 0 else np.zeros_like(tp_cumsum)
    precisions = tp_cumsum / (tp_cumsum + fp_cumsum + 1e-8)
    
    # 11-point interpolation for AP calculation
    ap = 0.0
    for recall_threshold in np.linspace(0, 1, 11):
        precision_at_recall = precisions[recalls >= recall_threshold]
        max_precision = precision_at_recall.max() if len(precision_at_recall) > 0 else 0
        ap += max_precision / 11
    
    return ap

def compute_map(gt_data: Dict, pred_data: Dict, iou_thresholds: Optional[List[float]] = None) -> Dict[str, float]:
    """Compute mean Average Precision (mAP) over multiple IoU thresholds."""
    if iou_thresholds is None:
        iou_thresholds = [0.5]
    
    ap_scores = {}
    for threshold in iou_thresholds:
        ap = compute_average_precision(gt_data, pred_data, threshold)
        ap_scores[f'AP@{threshold:.2f}'] = ap
    
    # Compute mAP@0.5:0.95 (COCO style)
    if len(iou_thresholds) > 1:
        ap_scores['mAP@0.5:0.95'] = np.mean(list(ap_scores.values()))
    
    return ap_scores

# -------------------------
# Print result
# -------------------------

def print_results(results: Dict) -> None:
    """Print formatted results to console."""
    print(f"Detection Metrics @ IoU=0.5:")
    print(f"{'Conf_Thr:':<15}{results['conf_th']:<10.2f}")
    print(f"{'NMS_IoU:':<15}{results['nms_iou']:<10.2f}")

    print("-" * 35)
    print(f"{'Metric':<15}{'Value':<10}")
    print("-" * 35)
    print(f"{'Precision:':<15}{results['precision']:<10.4f}")
    print(f"{'Recall:':<15}{results['recall']:<10.4f}")
    print(f"{'F1-Score:':<15}{results['f1']:<10.4f}")
    print('\n')
    print(f"Average Precision Metrics:")
    print("-" * 35)
    print(f"{'Metric':<15}{'Value':<10}")
    print("-" * 35)
    for metric, value in results['ap_metrics'].items():
        print(f"{metric + ':':<15}{value:<10.4f}")

# -------------------------
# Main
# -------------------------
def main():
    # Load data
    gt_data = load_ground_truth(GT_FOLDER)
    pred_data = load_predictions(PRED_FOLDER)
    
    # === 关键：统一做一遍 NMS 去重（每张图片分别处理） ===
    APPLY_NMS = True
    NMS_IOU = 0.6
    if APPLY_NMS:
        for img, dets in pred_data.items():
            pred_data[img] = nms_greedy(dets, iou_thr=NMS_IOU)

    # Compute metrics
    print(f"\nComputing evaluation metrics...")
    
    # Average Precision metrics
    ap_metrics = compute_map(gt_data, pred_data, IOU_THRESHOLDS)

    # 3) 业务 P/R/F1：在指定 conf 下做过滤（模拟线上阈值）
    CONF_TH = 0.5  # 你线上打算用的阈值（可改）
    pred_data_conf = {
        img: [(b, s) for (b, s) in dets if s >= CONF_TH]
        for img, dets in pred_data.items()
    }
    # precision, recall, f1 = compute_detection_metrics(gt_data, pred_data_conf, iou_threshold=0.5)
    precision, recall, f1, bad_images = compute_detection_metrics(gt_data, pred_data_conf, iou_threshold=0.5)


    # Basic detection metrics at IoU=0.5
    # precision, recall, f1 = compute_detection_metrics(gt_data, pred_data, 0.5)
    

    # Organize results
    results = {
        'precision': precision,
        'recall': recall,
        'f1': f1,
        'ap_metrics': ap_metrics,
        'conf_th': CONF_TH,
        'nms_iou': NMS_IOU if APPLY_NMS else None,
        'bad_images': bad_images
    }
    
    # Display results
    print_results(results)
    if bad_images:
        print(f"\n⚠️  Bad images ({len(bad_images)}): {bad_images}")
    
    # Save results to file
    results_file = os.path.join(OUTPUT_DIR, 'evaluation_results.txt')
    print(f"\n✅ Done! Results saved to: {results_file}")
    
    # Save results as CSV for easy comparison
    csv_file = os.path.join(OUTPUT_DIR, 'metrics_comparison.csv')
    with open(csv_file, 'w') as f:
        f.write("Model,Conf_for_PRF1,NMS_IoU,Precision,Recall,F1,mAP@0.5,mAP@0.5:0.95\n")
        model_name = os.path.basename(PRED_FOLDER.replace('/labels', ''))
        f.write(
                    f"{model_name},{CONF_TH:.2f},{NMS_IOU:.2f},"
                    f"{precision:.4f},{recall:.4f},{f1:.4f},"
                    f"{ap_metrics.get('AP@0.50', 0):.4f},"
                    f"{ap_metrics.get('mAP@0.5:0.95', 0):.4f}\n"
            )
        for img in bad_images:
            f.write(f"{img}\n")

    
    print(f"CSV results saved to: {csv_file}")
    print(f"Evaluation completed successfully!")
        

if __name__ == '__main__':
    main()