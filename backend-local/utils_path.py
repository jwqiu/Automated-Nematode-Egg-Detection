import os, sys
from pathlib import Path

def resource_path(*parts) -> str:
    """
    返回打包/未打包下都能用的资源绝对路径：
    - PyInstaller 一体化可执行：基于 sys._MEIPASS
    - 本地开发：基于当前文件目录（backend-local）
    """
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
    return str(base.joinpath(*parts))