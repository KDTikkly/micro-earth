"""
Micro-Earth Orchestrator — Phase 3
LangGraph StateGraph: Input -> Geocoder -> DataRetriever -> PhysicsEngine -> Output
新增：Geocoder 节点（城市 -> 坐标），PhysicsEngine 输出风险指数
"""
import asyncio
import json
import sys
import time
from typing import TypedDict, Annotated, List, Optional
from langgraph.graph import StateGraph, END
import operator

_print = lambda *a, **k: print(*a, **{**k, "flush": True})

from agents.data_retriever import fetch_shenzhen_geojson
from agents.physics_engine import compute_indices, compute_risk_index
from agents.geocoder import geocode


# ── 状态定义 ────────────────────────────────────────────────────────────────
class AgentState(TypedDict):
    logs:           Annotated[List[str], operator.add]
    city_query:     str           # 用户输入的城市名
    region:         str           # 解析后的规范名
    lat:            float
    lon:            float
    raw_data:       dict
    geojson:        Optional[dict]
    processed_data: dict
    risk_data:      dict          # Phase 3: 风险指数结果


# ── 节点：Geocoder ──────────────────────────────────────────────────────────
def node_geocoder(state: AgentState) -> dict:
    ts = time.strftime("%H:%M:%S")
    city = state.get("city_query") or state.get("region", "深圳")
    _print(f"[{ts}] [Geocoder] 解析城市坐标 → '{city}'...")

    try:
        lat, lon, name = asyncio.run(geocode(city))
        log = f"[{ts}] [Geocoder] ✓ '{city}' → {name} ({lat:.4f}, {lon:.4f})"
        _print(log)
        return {"logs": [log], "region": name, "lat": lat, "lon": lon}
    except Exception as e:
        err = f"[{ts}] [Geocoder] ✗ 解析失败: {e}，保持当前坐标"
        _print(err)
        return {"logs": [err]}


# ── 节点：FetchData ─────────────────────────────────────────────────────────
def node_fetch_data(state: AgentState) -> dict:
    ts = time.strftime("%H:%M:%S")
    lat = state.get("lat", 22.69)
    lon = state.get("lon", 114.39)
    region = state.get("region", "未知")
    _print(f"[{ts}] [DataRetriever] 请求 Open-Meteo — {region} ({lat:.4f}, {lon:.4f})...")

    try:
        geojson = asyncio.run(fetch_shenzhen_geojson(lat, lon))
        feature_count = len(geojson.get("features", []))
        first_props = geojson["features"][0]["properties"] if geojson["features"] else {}
        raw = {
            "temperature":   first_props.get("temperature_2m", 25.0),
            "humidity":      60.0,
            "wind_speed":    10.0,
            "region":        region,
        }
        # 更新 metadata
        geojson.setdefault("metadata", {})["region"] = region
        geojson["metadata"]["center"] = [lon, lat]

        log1 = f"[{ts}] [DataRetriever] ✓ {region} 气象网格获取完毕 — {feature_count} 个网格点"
        log2 = f"[{ts}] [DataRetriever] 当前温度: {raw['temperature']}°C | 网格数: {feature_count}"
        _print(log1); _print(log2)
        return {"logs": [log1, log2], "raw_data": raw, "geojson": geojson}

    except Exception as e:
        err_log = f"[{ts}] [DataRetriever] ✗ 获取失败: {e}，使用 Mock 数据"
        _print(err_log)
        mock = _make_mock_geojson(lat, lon, region)
        return {
            "logs": [err_log],
            "raw_data": {"temperature": 26.0, "humidity": 70.0, "wind_speed": 8.0},
            "geojson": mock,
        }


def _make_mock_geojson(lat: float, lon: float, region: str = "Unknown") -> dict:
    import random
    offsets = [(-0.1, -0.1), (-0.1, 0.1), (0.0, 0.0), (0.1, -0.1), (0.1, 0.1)]
    features = [
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon + dlon, lat + dlat]},
            "properties": {
                "temperature_2m": round(random.uniform(20, 36), 1),
                "precipitation_probability": random.randint(5, 85),
                "temperatures": [round(random.uniform(18, 35), 1) for _ in range(24)],
                "precipitations": [random.randint(0, 100) for _ in range(24)],
                "source": "mock",
            },
        }
        for dlat, dlon in offsets
    ]
    return {
        "type": "FeatureCollection",
        "features": features,
        "metadata": {"region": region, "center": [lon, lat], "source": "fallback"},
    }


# ── 节点：PhysicsEngine ─────────────────────────────────────────────────────
def node_physics(state: AgentState) -> dict:
    ts = time.strftime("%H:%M:%S")
    _print(f"[{ts}] [PhysicsEngine] 启动极端天气推演...")

    raw = state.get("raw_data", {})
    geojson = state.get("geojson") or {}
    features = geojson.get("features", [])

    # Phase 2 兼容：热力学指数
    thermo = compute_indices(raw)

    # Phase 3 新增：风险指数
    risk = compute_risk_index(features)

    log = (
        f"[{ts}] [PhysicsEngine] ✓ 推演完成 | "
        f"风险指数={risk['risk_index']} [{risk['risk_level']}] | "
        f"热力={thermo['heat_index']:.1f} | 风冷={thermo['wind_chill']:.1f}"
    )
    _print(log)

    processed = {**thermo, "status": thermo["status"]}
    return {
        "logs": [log],
        "processed_data": processed,
        "risk_data": risk,
    }


# ── 节点：Finish ────────────────────────────────────────────────────────────
def node_finish(state: AgentState) -> dict:
    ts = time.strftime("%H:%M:%S")
    risk = state.get("risk_data", {})
    level = risk.get("risk_level", "UNKNOWN")
    idx = risk.get("risk_index", 0)
    msg = f"[{ts}] [Finish] ✓ 工作流完毕 | 风险等级: {level} ({idx}/100)"
    _print(msg)
    return {"logs": [msg]}


# ── 图构建 ──────────────────────────────────────────────────────────────────
def build_graph() -> StateGraph:
    g = StateGraph(AgentState)
    g.add_node("Geocoder",      node_geocoder)
    g.add_node("DataRetriever", node_fetch_data)
    g.add_node("PhysicsEngine", node_physics)
    g.add_node("Finish",        node_finish)
    g.set_entry_point("Geocoder")
    g.add_edge("Geocoder",      "DataRetriever")
    g.add_edge("DataRetriever", "PhysicsEngine")
    g.add_edge("PhysicsEngine", "Finish")
    g.add_edge("Finish",        END)
    return g.compile()


micro_earth_graph = build_graph()


async def run_graph_stream(
    region: str = "深圳",
    lat: float = 22.69,
    lon: float = 114.39,
    city_query: str = "",
):
    """
    异步生成器：逐步 yield 事件给 WebSocket 推流
    - log: 日志行
    - geocoded: 坐标解析结果（前端用于飞行定位）
    - geojson: GeoJSON FeatureCollection（地图渲染）
    - risk: 风险指数（仪表盘渲染）
    - done: 完成信号
    """
    state: AgentState = {
        "logs": [],
        "city_query": city_query or region,
        "region": region,
        "lat": lat,
        "lon": lon,
        "raw_data": {},
        "geojson": None,
        "processed_data": {},
        "risk_data": {},
    }

    ts = time.strftime("%H:%M:%S")
    yield {
        "event": "start",
        "message": f"[{ts}] [Orchestrator] Phase 3 工作流启动 — 查询: '{city_query or region}'"
    }

    final_risk = {}

    for graph_event in micro_earth_graph.stream(state):
        for node_name, node_output in graph_event.items():
            # 日志推送
            for log_line in node_output.get("logs", []):
                yield {"event": "log", "node": node_name, "message": log_line}
                await asyncio.sleep(0.25)

            # Geocoder 结果：新坐标 -> 前端飞行
            if node_name == "Geocoder" and node_output.get("lat"):
                yield {
                    "event": "geocoded",
                    "node": node_name,
                    "message": f"[{time.strftime('%H:%M:%S')}] [Geocoder] 坐标已更新 → ({node_output['lat']:.4f}, {node_output['lon']:.4f})",
                    "data": {
                        "region": node_output.get("region", region),
                        "lat": node_output["lat"],
                        "lon": node_output["lon"],
                    }
                }
                await asyncio.sleep(0.1)

            # GeoJSON 推送
            if node_output.get("geojson"):
                gj = node_output["geojson"]
                cnt = len(gj.get("features", []))
                yield {
                    "event": "geojson",
                    "node": node_name,
                    "message": f"[{time.strftime('%H:%M:%S')}] [GeoJSON] 推送 {cnt} 个气象特征",
                    "data": gj,
                }
                await asyncio.sleep(0.15)

            # 风险指数推送
            if node_output.get("risk_data"):
                final_risk = node_output["risk_data"]
                yield {
                    "event": "risk",
                    "node": node_name,
                    "message": f"[{time.strftime('%H:%M:%S')}] [Risk] 指数={final_risk['risk_index']} 等级={final_risk['risk_level']}",
                    "data": final_risk,
                }
                await asyncio.sleep(0.1)

    ts = time.strftime("%H:%M:%S")
    yield {"event": "done", "message": f"[{ts}] [Orchestrator] 所有节点执行完毕 ✓"}


if __name__ == "__main__":
    async def _test():
        async for evt in run_graph_stream(city_query="Tokyo"):
            print(evt.get("message", ""))
    asyncio.run(_test())
