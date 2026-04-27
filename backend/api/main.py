"""
Micro-Earth FastAPI 主应用 — Phase 5
- GET  /health              健康检查
- POST /api/what-if         What-If 环境干预（返回重新推演结果）
- WS   /ws/agent-stream     WebSocket 实时推流（日志 + GeoJSON + heatmap）
"""
import asyncio
import json
import os
import sys
import io

# ── Windows GBK 编码修复：强制进程级 UTF-8，必须在所有 import 之前执行 ──────
os.environ.setdefault("PYTHONIOENCODING", "utf-8")
os.environ.setdefault("PYTHONUTF8", "1")

# reconfigure 方式（Python 3.7+）
for _stream_name in ("stdout", "stderr"):
    _s = getattr(sys, _stream_name, None)
    if _s is not None and hasattr(_s, "reconfigure"):
        try:
            _s.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

# 兜底：直接替换为 UTF-8 TextIOWrapper（适用于 Windows IDLE / pytest 等场景）
if hasattr(sys.stdout, "buffer"):
    try:
        sys.stdout = io.TextIOWrapper(
            sys.stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True
        )
    except Exception:
        pass
if hasattr(sys.stderr, "buffer"):
    try:
        sys.stderr = io.TextIOWrapper(
            sys.stderr.buffer, encoding="utf-8", errors="replace", line_buffering=True
        )
    except Exception:
        pass


from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from agents.orchestrator import run_graph_stream

app = FastAPI(title="Micro-Earth API", version="0.5.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── What-If 请求体 ───────────────────────────────────────────────────────────
class WhatIfRequest(BaseModel):
    region:            str   = "深圳"
    lat:               float = 22.69
    lon:               float = 114.39
    city_query:        str   = ""
    temp_offset:       float = Field(default=0.0,  ge=-10.0, le=10.0,   description="全局温度偏移 (°C)")
    precip_multiplier: float = Field(default=1.0,  ge=0.1,   le=5.0,    description="降水概率倍率")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "Micro-Earth Backend", "version": "0.5.0"}


@app.post("/api/what-if")
async def what_if_scenario(req: WhatIfRequest):
    """
    Phase 5 What-If 接口
    接收环境干预参数，重新执行物理推演并返回：
    - heatmap_data: 超分辨率温度/降水矩阵
    - risk_data: 重新计算的极端天气风险指数
    - flood_zones: 潜在洪涝区列表
    """
    from agents.physics_engine import compute_risk_index, super_resolve_grid
    from agents.data_retriever import fetch_shenzhen_geojson
    from agents.geocoder import geocode

    # 获取坐标
    lat, lon = req.lat, req.lon
    region   = req.region
    if req.city_query:
        try:
            lat, lon, region = await geocode(req.city_query)
        except Exception:
            pass

    # 获取气象数据
    try:
        geojson = await fetch_shenzhen_geojson(lat, lon)
        features = geojson.get("features", [])
    except Exception:
        features = []

    # 重新计算风险指数（含 What-If 偏移）
    risk = compute_risk_index(features)

    # 超分辨率插值
    heatmap = super_resolve_grid(
        features, lat, lon,
        resolution=12,
        temp_offset=req.temp_offset,
        precip_multiplier=req.precip_multiplier,
    )

    return {
        "status":    "ok",
        "region":    region,
        "lat":       lat,
        "lon":       lon,
        "risk_data": risk,
        "heatmap":   heatmap,
        "what_if": {
            "temp_offset":       req.temp_offset,
            "precip_multiplier": req.precip_multiplier,
        },
    }


@app.websocket("/ws/agent-stream")
async def agent_stream(websocket: WebSocket):
    await websocket.accept()

    # 接收客户端参数（支持 Phase 5 What-If 参数）
    region = "深圳"
    lat, lon = 22.69, 114.39
    city_query = ""
    temp_offset = 0.0
    precip_multiplier = 1.0
    try:
        raw = await asyncio.wait_for(websocket.receive_text(), timeout=3.0)
        payload = json.loads(raw)
        region            = payload.get("region", region)
        lat               = float(payload.get("lat", lat))
        lon               = float(payload.get("lon", lon))
        city_query        = payload.get("city_query", "").strip()
        temp_offset       = float(payload.get("temp_offset", 0.0))
        precip_multiplier = float(payload.get("precip_multiplier", 1.0))
    except (asyncio.TimeoutError, Exception):
        pass

    try:
        async for event in run_graph_stream(
            region, lat, lon, city_query,
            temp_offset=temp_offset,
            precip_multiplier=precip_multiplier,
        ):
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
