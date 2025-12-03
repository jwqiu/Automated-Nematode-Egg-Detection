import os, sys
from pathlib import Path

def resource_path(*parts) -> str:
    """
    Get the absolute path to a resource file, working around issues with PyInstaller.
    """
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
    return str(base.joinpath(*parts))