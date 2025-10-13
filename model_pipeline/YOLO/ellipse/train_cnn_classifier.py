# train_cnn_classifier.py  （与 train/ 和 val/ 同目录）
import os
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms
from torch.utils.data import DataLoader
import torchvision.transforms.functional as F
import shutil  # ✅ 用于复制和删除文件夹
import random
import numpy as np
# 正方形填充（不变形） 

def set_seed(seed=42):
    """Set random seed for full reproducibility."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)

    # 保证 CuDNN 可复现（会稍微降低速度）
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False

    os.environ["PYTHONHASHSEED"] = str(seed)

    print(f"🔒 Random seed set to {seed}")
    print("")

# 调用
set_seed(42)

class SquarePad:
    def __call__(self, img):
        w, h = img.size
        s = max(w, h)
        pad_left  = (s - w) // 2
        pad_top   = (s - h) // 2
        pad_right = s - w - pad_left
        pad_bottom= s - h - pad_top
        return F.pad(img, [pad_left, pad_top, pad_right, pad_bottom], fill=0)

# data transforms and get data loaders

def get_transforms(image_size=96, use_blur=True, brightness=0.3, contrast=0.3):
    """Return train and validation transform pipelines."""

    print("===== Data Transform Configuration =====")
    print(f"Image size: {image_size}")
    print(f"Use blur: {use_blur}")
    print(f"Brightness jitter: ±{brightness}")
    print(f"Contrast jitter: ±{contrast}")
    print("========================================")
    print("")

    transform_train_list = [
        transforms.Grayscale(1),
        SquarePad(),
        transforms.Resize(image_size),
        transforms.RandomRotation(10),
        transforms.RandomHorizontalFlip(0.5),
        transforms.RandomAffine(0, translate=(0.05, 0.05)),
        transforms.ColorJitter(brightness=brightness, contrast=contrast),
    ]
    if use_blur:
        transform_train_list.append(transforms.GaussianBlur(kernel_size=3, sigma=(0.1, 1.0)))

    transform_train_list.append(transforms.ToTensor())

    transform_val = transforms.Compose([
        transforms.Grayscale(1),
        SquarePad(),
        transforms.Resize(image_size),
        transforms.ToTensor(),
    ])

    transform_train = transforms.Compose(transform_train_list)
    return transform_train, transform_val


# model definition

class EllipseCNN(nn.Module):
    def __init__(self, input_size=96, dropout=0.4, use_sigmoid_in_model=False,
                 extra_conv_layers=0, use_gap=False):
        """
        升级版 EllipseCNN
        -----------------
        参数:
          input_size: 输入图片尺寸 (默认96)
          dropout: Dropout 比例
          use_sigmoid_in_model: 是否在模型中加 Sigmoid
          extra_conv_layers: 额外增加的卷积层数量（默认0不加）
          use_gap: 是否使用 Global Average Pooling 替代 Flatten
        """
        super().__init__()

        # ======== 基础卷积层 ========
        conv_blocks = [
            nn.Conv2d(1, 8, 3, 1, 1), nn.BatchNorm2d(8), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(8, 16, 3, 1, 1), nn.BatchNorm2d(16), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(16, 32, 3, 1, 1), nn.BatchNorm2d(32), nn.ReLU(), nn.MaxPool2d(2)
        ]

        # ======== 动态增加卷积层 ========
        in_channels = 32
        for i in range(extra_conv_layers):
            out_channels = in_channels * 2 if in_channels < 256 else in_channels
            conv_blocks += [
                nn.Conv2d(in_channels, out_channels, 3, 1, 1),
                nn.BatchNorm2d(out_channels),
                nn.ReLU(),
                nn.MaxPool2d(2)
            ]
            in_channels = out_channels

        layers = conv_blocks

        # ======== 全连接部分 ========
        if use_gap:
            layers += [
                nn.AdaptiveAvgPool2d(1),  # GAP 层
                nn.Flatten(),
                nn.Linear(in_channels, 64), nn.ReLU(),
                nn.Dropout(dropout),
                nn.Linear(64, 1)
            ]
        else:
            fc_in = (input_size // (2 ** (3 + extra_conv_layers))) ** 2 * in_channels
            layers += [
                nn.Flatten(),
                nn.Linear(fc_in, 64), nn.ReLU(),
                nn.Dropout(dropout),
                nn.Linear(64, 1)
            ]

        # ======== 输出层 ========
        if use_sigmoid_in_model:
            layers.append(nn.Sigmoid())

        self.net = nn.Sequential(*layers)

    def forward(self, x):
        return self.net(x)

# training components setup

def get_training_components(model, lr=5e-4, use_logits_loss=True, pos_weight=None):
    """
    Initialize model, criterion, optimizer, and scheduler.
    """
    # 查找 Dropout 层（如果存在）
    dropout_layers = [m for m in model.modules() if isinstance(m, nn.Dropout)]
    dropout_value = dropout_layers[0].p if dropout_layers else "N/A"

    print("===== Training Configuration =====")
    print(f"Learning rate: {lr}")
    print(f"Use logits loss: {use_logits_loss}")
    print(f"Pos weight: {pos_weight}")
    print(f"Model dropout: {dropout_value}")
    print("==================================")
    print("")

    # ====== Loss 函数 ======
    if use_logits_loss:
        if pos_weight is not None:
            pos_weight = torch.tensor([pos_weight])
            criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)
        else:
            criterion = nn.BCEWithLogitsLoss()
    else:
        criterion = nn.BCELoss()

    # ====== Optimizer ======
    optimizer = optim.Adam(model.parameters(), lr=lr)

    # ====== Scheduler ======
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode='min', factor=0.5, patience=3
    )

    return model, criterion, optimizer, scheduler


# ========= 4) 训练 + 验证（含早停，格式保持原样） =========

# ========= 1️⃣ 定义 train_one_epoch =========
def train_one_epoch(model, train_loader, criterion, optimizer, use_sigmoid):
    """单轮训练，返回 train_acc, train_loss"""
    model.train()
    total, correct, loss_sum = 0, 0, 0.0

    for imgs, labels in train_loader:
        preds = model(imgs).squeeze(1)
        loss = criterion(preds, labels.float())

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        loss_sum += loss.item()
        total += labels.size(0)

        # ✅ 动态判断是否需要 sigmoid（只用于计算准确率，不影响 loss）
        if use_sigmoid:
            probs = torch.sigmoid(preds)
        else:
            probs = preds

        pred_classes = (probs > 0.5).long()
        correct += (pred_classes == labels).sum().item()

    train_acc = correct / total if total else 0.0
    return train_acc, loss_sum

# ========= 2️⃣ 定义 validate_one_epoch =========
def validate_one_epoch(model, val_loader, criterion, use_sigmoid=False):
    """单轮验证，返回 val_acc, val_loss, recall, f1, bad_cases, val_logits_list, val_labels_list"""
    model.eval()
    vtotal, vcorrect = 0, 0
    bad_cases = []  # [(path, prob, true_label, pred_label)]
    vloss_sum = 0.0
    tp = fp = fn = 0

    val_preds_logits_list = []
    val_labels_list = []

    with torch.no_grad():
        for imgs, labels in val_loader:
            preds = model(imgs).squeeze(1)
            loss = criterion(preds, labels.float())
            vloss_sum += loss.item()

            if use_sigmoid:
                probs = torch.sigmoid(preds).detach().cpu()
            else:
                probs = preds.detach().cpu()

            val_preds_logits_list.append(preds.detach().cpu())
            val_labels_list.append(labels.detach().cpu())

            pred_classes = (probs > 0.5).long()
            y_true = labels.long().cpu()
            y_pred = pred_classes.cpu()

            tp += ((y_pred == 1) & (y_true == 1)).sum().item()
            fp += ((y_pred == 1) & (y_true == 0)).sum().item()
            fn += ((y_pred == 0) & (y_true == 1)).sum().item()
            vcorrect += (pred_classes == labels).sum().item()
            vtotal += labels.size(0)

            # 错误样本
            batch_start = vtotal - labels.size(0)
            for i in range(len(labels)):
                if pred_classes[i] != labels[i]:
                    img_path, _ = val_loader.dataset.samples[batch_start + i]
                    prob = probs[i].item()
                    bad_cases.append((img_path, prob, labels[i].item(), pred_classes[i].item()))

    val_acc = vcorrect / vtotal if vtotal else 0.
    val_loss = vloss_sum / max(1, len(val_loader))
    recall = tp / (tp + fn + 1e-9)
    f1 = 2 * tp / (2 * tp + fp + fn + 1e-9)

    return val_acc, val_loss, recall, f1, bad_cases, val_preds_logits_list, val_labels_list


def save_bad_cases(bad_cases, badcase_dir):
    """
    保存错误预测样本到指定目录。
    文件名格式示例: img001_0.43_T1_P0.png
    """
    # 清空旧目录
    if os.path.exists(badcase_dir):
        shutil.rmtree(badcase_dir)
    os.makedirs(badcase_dir, exist_ok=True)

    for src_path, prob, true_label, pred_label in bad_cases:
        base, ext = os.path.splitext(os.path.basename(src_path))
        dst_name = f"{base}_{prob:.2f}_T{true_label}_P{pred_label}{ext}"
        dst_path = os.path.join(badcase_dir, dst_name)
        shutil.copy(src_path, dst_path)

    print(f"📂 Saved {len(bad_cases)} bad cases to {badcase_dir} (after training)")


# ========= 3️⃣ 训练主循环（含早停） =========

# 数据路径
train_dir = "model_pipeline/YOLO/ellipse/train"
val_dir   = "model_pipeline/YOLO/ellipse/val"
model_path = "model_pipeline/YOLO/ellipse/ellipse_cnn.pt"
badcase_dir = "model_pipeline/YOLO/ellipse/badcase"

# ===== Data & Transform Config =====
input_size = 64         # 图像缩放尺寸 (Resize)
use_blur = True          # 是否在数据增强中加入高斯模糊
brightness = 0.3         # 亮度扰动幅度
contrast = 0.3           # 对比度扰动幅度

# ===== Model Architecture Config =====
dropout = 0.5           # Dropout 概率（防止过拟合）
use_sigmoid_in_model = False      # 是否在模型最后加 Sigmoid 层（若使用 BCEWithLogitsLoss，应设为 False）
use_sigmoid_in_eval = not use_sigmoid_in_model  # 是否在验证时手动加
use_logits_loss = not use_sigmoid_in_model  # 是否使用带 logits 的 BCE 损失函数（推荐设为 True）
pos_weight = None       # 正样本权重（不指定则为 None）
extra_conv_layers = 2   # 额外卷积层数量（>=0）
use_gap = False          # 是否使用 Global Average Pooling 替代 Flatten

# ===== Training Hyperparameters =====
epochs = 100             # 最大训练轮次
batch_size = 32          # 批次大小
lr = 0.001              # 学习率 (Learning rate)
patience = 15            # 早停策略 (连续多少轮无提升则停止)

# ===== Runtime & Tracking Config =====
best_val = 0.0           # 记录最佳验证集损失
wait = 0                 # 早停计数器
best_bad_cases = []      # 存储最佳模型下的错误样本

if __name__ == "__main__":  

    transform_train, transform_val = get_transforms(image_size=input_size, use_blur=use_blur, brightness=brightness, contrast=contrast)

    train_data = datasets.ImageFolder(root=train_dir, transform=transform_train)
    val_data   = datasets.ImageFolder(root=val_dir,   transform=transform_val)

    train_loader = DataLoader(train_data, batch_size=batch_size, shuffle=True)
    val_loader   = DataLoader(val_data,   batch_size=batch_size, shuffle=False)

    # print("Class mapping:", train_data.class_to_idx)  # {'ellipse': 0, 'non_ellipse': 1}

    model = EllipseCNN(input_size=input_size, dropout=dropout, use_sigmoid_in_model=use_sigmoid_in_model,
                    extra_conv_layers=extra_conv_layers, use_gap=use_gap)

    model, criterion, optimizer, scheduler = get_training_components(
        model=model,
        lr=lr,
        use_logits_loss=use_logits_loss,
        pos_weight=pos_weight
    )

    for epoch in range(1, epochs + 1):
        # ===== train =====
        train_acc, loss_sum = train_one_epoch(model, train_loader, criterion, optimizer, use_sigmoid=use_sigmoid_in_eval)

        # ===== val =====
        val_acc, val_loss, recall, f1, bad_cases, val_preds_logits_list, val_labels_list = validate_one_epoch(model, val_loader, criterion, use_sigmoid=use_sigmoid_in_eval)

        print(f"Epoch {epoch:2d}: "
            f"TrainAcc={train_acc:.3f}  ValAcc={val_acc:.3f}  "
            f"ValLoss={val_loss:.4f}  Recall={recall:.3f}  F1={f1:.3f}  LossSum={loss_sum:.3f}")
        scheduler.step(val_loss)

        # ===== early stopping & 保存最佳模型的错误样本（监控 val_loss 越小越好）=====
        if best_val == 0.0 or val_loss < best_val:
            best_val = val_loss
            best_f1 = f1
            best_epoch = epoch
            best_bad_cases = bad_cases.copy()
            wait = 0
            torch.save(model.state_dict(), model_path)
        else:
            wait += 1
            if wait >= patience:
                print("⏹ Early stopping triggered!")
                print(f"✅ Best model found at Epoch {best_epoch} "
                    f"(ValLoss={best_val:.4f}, F1={best_f1:.3f})")
                break


    # ===== 训练结束或早停后处理 bad cases =====
    save_bad_cases(best_bad_cases, badcase_dir)


# ===== 5) 寻找最佳阈值（基于验证集） =====
# val_preds_logits = torch.cat(val_preds_logits_list).cpu()
# val_labels = torch.cat(val_labels_list).cpu()

# thresholds = np.arange(0.3, 0.9, 0.02)
# best_thr, best_f1 = 0.5, 0
# for t in thresholds:
#     preds_bin = (torch.sigmoid(val_preds_logits) > t).int()
#     f1 = f1_score(val_labels, preds_bin)
#     if f1 > best_f1:
#         best_f1, best_thr = f1, t
# print(f"✅ Best threshold = {best_thr:.2f}, F1 = {best_f1:.3f}")