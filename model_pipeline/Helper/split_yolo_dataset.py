import os
import shutil
import random

# ===============================
# 配置（改这里）
# ===============================
BASE_DIR = "raw_data/Bad_Case_914/Case_3"  # 原始数据所在目录（包含 .tif & .txt）
N_TRAIN = 3                        # 训练集数量
N_VAL   = 1                        # 验证集数量
N_TEST  = 1                        # 测试集数量
COPY_CLASSES_TXT = False             # 若根目录有 classes.txt，是否复制到各 split/labels
# ===============================

def ensure_clean_split_dirs(base_dir, split_names=("train", "val", "test")):
    """只创建，不清空；如已存在且非空则报错，防止覆盖/污染。"""
    for split in split_names:
        img_out = os.path.join(base_dir, split, "images")
        lbl_out = os.path.join(base_dir, split, "labels")
        os.makedirs(img_out, exist_ok=True)
        os.makedirs(lbl_out, exist_ok=True)

        # 若已有内容则提示并中止，避免与旧结果混在一起
        def non_empty(p): 
            return os.path.isdir(p) and any(os.scandir(p))
        if non_empty(img_out) or non_empty(lbl_out):
            raise RuntimeError(
                f"[安全检查] 目标目录已存在且非空：{os.path.join(base_dir, split)}。\n"
                f"请先删除该目录再运行，避免与旧的划分结果混淆。"
            )

def collect_top_level_tifs(base_dir):
    """仅收集根目录下的 .tif 文件（不进入子目录，也不包含已有的 train/val/test）"""
    files = []
    for name in os.listdir(base_dir):
        if name in ("train", "val", "test"):
            continue
        path = os.path.join(base_dir, name)
        if os.path.isfile(path) and name.lower().endswith(".tif"):
            files.append(name)
    return files

def copy_pair(base_dir, img_name, dst_img_dir, dst_lbl_dir):
    """复制图片和对应的标签；若无标签则创建空白 .txt。"""
    stem = os.path.splitext(img_name)[0]
    src_img = os.path.join(base_dir, img_name)
    src_lbl = os.path.join(base_dir, stem + ".txt")

    shutil.copy(src_img, os.path.join(dst_img_dir, img_name))
    dst_lbl_path = os.path.join(dst_lbl_dir, stem + ".txt")
    if os.path.exists(src_lbl):
        shutil.copy(src_lbl, dst_lbl_path)
    else:
        # 阴性或无标注的情况，创建空白 txt
        open(dst_lbl_path, "w").close()

def maybe_copy_classes_txt(base_dir):
    src = os.path.join(base_dir, "classes.txt")
    if os.path.exists(src):
        for split in ("train", "val", "test"):
            dst = os.path.join(base_dir, split, "labels", "classes.txt")
            shutil.copy(src, dst)

def main():
    # 仅创建分割目录，不清空也不触碰原文件
    ensure_clean_split_dirs(BASE_DIR)

    # 收集并打乱
    all_images = collect_top_level_tifs(BASE_DIR)
    if not all_images:
        raise ValueError(f"未在 {BASE_DIR} 下找到顶层 .tif 图片。")
    random.shuffle(all_images)

    # 数量检查
    n_total = len(all_images)
    need = N_TRAIN + N_VAL + N_TEST
    if n_total < need:
        raise ValueError(f"样本数不足：共 {n_total}，但请求 {need}（train={N_TRAIN}, val={N_VAL}, test={N_TEST}）。")

    # 划分
    train_imgs = all_images[:N_TRAIN]
    val_imgs   = all_images[N_TRAIN:N_TRAIN+N_VAL]
    test_imgs  = all_images[N_TRAIN+N_VAL:N_TRAIN+N_VAL+N_TEST]
    splits = {"train": train_imgs, "val": val_imgs, "test": test_imgs}

    # 复制
    for split, imgs in splits.items():
        img_out = os.path.join(BASE_DIR, split, "images")
        lbl_out = os.path.join(BASE_DIR, split, "labels")
        for img in imgs:
            copy_pair(BASE_DIR, img, img_out, lbl_out)
        print(f"{split}: {len(imgs)} samples copied.")

    # 可选：复制 classes.txt
    if COPY_CLASSES_TXT:
        maybe_copy_classes_txt(BASE_DIR)

    print("\n✅ 完成：仅复制，未改动原始文件。")
    print(f"根目录：{BASE_DIR}")
    for split in ("train", "val", "test"):
        print(f" - {split}/images 与 {split}/labels 已生成")

if __name__ == "__main__":
    main()
