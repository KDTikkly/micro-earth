"""
Micro-Earth FastAPI 主应用 — Phase 2
- GET  /health            健康检查
- WS   /ws/agent-stream   WebSocket 实时推流（日志 + GeoJSON）
"""
import asyncio
import json
import os
import sys
import io

# ── Windows GBK 编码修复：强制 stdout/stderr 使用 UTF-8 ──────────────────────
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
# 兜底：直接替换为 UTF-8 TextIOWrapper
if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True)
if hasattr(sys.stderr, "buffer"):
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace", line_buffering=True)

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from agents.orchestrator import run_graph_stream

app = FastAPI(title="Micro-Earth API", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "Micro-Earth Backend", "version": "0.2.0"}


@app.websocket("/ws/agent-stream")
async def agent_stream(websocket: WebSocket):
    await websocket.accept()

    # 接收客户端参数（region / lat / lon / city_query）
    region = "深圳"
    lat, lon = 22.69, 114.39
    city_query = ""
    try:
        raw = await asyncio.wait_for(websocket.receive_text(), timeout=3.0)
        payload = json.loads(raw)
        region     = payload.get("region", region)
        lat        = float(payload.get("lat", lat))
        lon        = float(payload.get("lon", lon))
        city_query = payload.get("city_query", "").strip()
    except (asyncio.TimeoutError, Exception):
        pass

    try:
        async for event in run_graph_stream(region, lat, lon, city_query):
            await websocket.send_text(json.dumps(event, ensure_ascii=False))
            await asyncio.sleep(0)
        await websocket.close()
    except WebSocketDisconnect:
        print("[WS] 客户端断开连接", flush=True)
    except Exception as e:
        try:
            await websocket.send_text(json.dumps({"event": "error", "message": str(e)}, ensure_ascii=False))
        except Exception:
            pass
