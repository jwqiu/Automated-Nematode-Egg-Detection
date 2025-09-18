import os

# 指定你的数据文件夹路径
folder = "raw_data/OneDrive_1_28-08-2025"

# 遍历文件夹中的所有文件
for file in os.listdir(folder):
    if file.lower().endswith(".tif"):  # 找到所有tif图片
        base_name = os.path.splitext(file)[0]  # 去掉扩展名
        txt_file = base_name + ".txt"
        txt_path = os.path.join(folder, txt_file)

        # 检查是否存在同名txt
        if not os.path.exists(txt_path):
            with open(txt_path, "w") as f:
                pass
            print(f"✅ Created empty annotation: {txt_file}")
        else:
            print(f"✔ Found existing annotation: {txt_file}")

print("🎯 Check finished.")
