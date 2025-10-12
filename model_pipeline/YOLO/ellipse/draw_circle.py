import cv2
import numpy as np

ratios = [0.5, 0.6, 0.7, 0.8, 0.9]
canvas = np.ones((200, 600, 3), dtype=np.uint8) * 255

cx, cy = 60, 100
for i, r in enumerate(ratios):
    MA = 100  # 长轴
    ma = int(MA * r)  # 短轴
    center = (cx + i * 110, cy)
    cv2.ellipse(canvas, center, (MA//2, ma//2), 0, 0, 360, (0,0,255), 2)
    cv2.putText(canvas, f"{r:.1f}", (center[0]-15, 180),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,0,0), 1)

cv2.imwrite("ellipses.png", canvas)