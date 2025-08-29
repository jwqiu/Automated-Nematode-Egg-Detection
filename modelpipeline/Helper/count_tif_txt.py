import os

# 要统计的文件夹路径
folder = "raw_data/OneDrive_1_28-08-2025"

# 统计数量
tif_count = len([f for f in os.listdir(folder) if f.lower().endswith(".tif")])
txt_count = len([f for f in os.listdir(folder) if f.lower().endswith(".txt")])

print(f"TIF 文件数量: {tif_count}")
print(f"TXT 文件数量: {txt_count}")
