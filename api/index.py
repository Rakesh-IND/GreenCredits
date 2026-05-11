import os
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
RUNTIME_DIR = Path(os.environ.get("GREEN_CREDITS_RUNTIME_DIR", "/tmp/greencredits"))

RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
os.environ.setdefault("GREEN_CREDITS_RUNTIME_DIR", str(RUNTIME_DIR))
os.environ.setdefault("GREEN_CREDITS_STATIC_DIR", str(RUNTIME_DIR / "static"))

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.chdir(BACKEND_DIR)

from main import app
