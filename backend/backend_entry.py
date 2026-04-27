"""
backend_entry.py — PyInstaller 打包入口点
启动 uvicorn 监听 127.0.0.1:8000
"""
import sys
import os

# 修正打包后的 sys.path（PyInstaller _MEIPASS）
if getattr(sys, 'frozen', False):
    base_dir = sys._MEIPASS
    sys.path.insert(0, base_dir)
    os.chdir(base_dir)

import uvicorn

if __name__ == '__main__':
    uvicorn.run(
        'api.main:app',
        host='127.0.0.1',
        port=8000,
        log_level='warning',   # 减少日志，静默运行
    )
