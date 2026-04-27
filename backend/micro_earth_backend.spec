# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec — Micro-Earth FastAPI Backend
# 用法：pyinstaller micro_earth_backend.spec

import sys
from pathlib import Path

block_cipher = None

a = Analysis(
    ['backend_entry.py'],
    pathex=[str(Path('.').resolve())],
    binaries=[],
    datas=[
        # 包含 agents 目录下的所有 .py
        ('agents/*.py', 'agents'),
        ('api/*.py',    'api'),
        # 如有配置文件/模型文件也在此处添加
    ],
    hiddenimports=[
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'fastapi',
        'starlette',
        'anyio',
        'anyio._backends._asyncio',
        'langgraph',
        'langchain_core',
        'geopandas',
        'xarray',
        'numba',
        'duckdb',
        'websockets',
        'web3',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='micro_earth_backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,        # 静默运行，不弹黑窗口
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='micro_earth_backend',
)
