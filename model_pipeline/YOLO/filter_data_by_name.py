import os
import shutil

# === 🔧 配置路径（请自行修改） ===
image_dir = r"/Users/chenyuqi/Desktop/images"
label_dir = r"/Users/chenyuqi/Desktop/masks"

# 支持的图片后缀
image_exts = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp"}

# =====================================
def get_stem(filename):
    """去掉扩展名，得到文件名主体"""
    return os.path.splitext(filename)[0]

def list_label_stems(folder):
    """列出标注文件夹中存在的标注名（.roi 或同名子文件夹）"""
    stems = set()
    for fname in os.listdir(folder):
        fullpath = os.path.join(folder, fname)
        if os.path.isdir(fullpath):
            stems.add(fname)  # 文件夹名
        elif os.path.splitext(fname)[1].lower() == ".roi":
            stems.add(get_stem(fname))  # 单个 .roi 文件名
    return stems

def main():
    if not os.path.isdir(image_dir):
        print(f"❌ 图片文件夹不存在: {image_dir}")
        return
    if not os.path.isdir(label_dir):
        print(f"❌ 标注文件夹不存在: {label_dir}")
        return

    # 获取图片名集合
    image_stems = {get_stem(f) for f in os.listdir(image_dir)
                   if os.path.splitext(f)[1].lower() in image_exts}

    # 获取标注名集合
    label_stems = list_label_stems(label_dir)

    print(f"📸 图片数量: {len(image_stems)}")
    print(f"🏷️ 标注数量: {len(label_stems)}")

    # 找出无标注的图片
    orphan_stems = image_stems - label_stems
    print(f"⚠️ 没有标注的图片: {len(orphan_stems)}")

    # 删除没有标注的图片
    for fname in os.listdir(image_dir):
        stem, ext = os.path.splitext(fname)
        if ext.lower() in image_exts and stem in orphan_stems:
            img_path = os.path.join(image_dir, fname)
            os.remove(img_path)
            print(f"🗑️ 已删除: {fname}")

    print("✅ 清理完成，只保留有标注文件或文件夹的图片。")

if __name__ == "__main__":
    main()
