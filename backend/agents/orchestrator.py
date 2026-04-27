"""
Micro-Earth Orchestrator — Phase 4
LangGraph StateGraph:
  Input -> Geocoder -> DataRetriever -> PhysicsEngine -> EntitySimulator -> Output
新增：EntitySimulator 节点（多智能体自主响应与动态资产推演）
"""
# ── UTF-8 编码保障（防 Windows GBK 报错）──────────────────────────────────────
import os as _os
import sys as _sys
import io as _io
_os.environ.setdefault("PYTHONIOENCODING", "utf-8")
_os.environ.setdefault("PYTHONUTF8", "1")
for _s in (_sys.stdout, _sys.stderr):
    if _s and hasattr(_s, "reconfigure"):
        try: _s.reconfigure(encoding="utf-8", errors="replace")
        except Exception: pass
if hasattr(_sys.stdout, "buffer"):
    try: _sys.stdout = _io.TextIOWrapper(_sys.stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True)
    except Exception: pass
if hasattr(_sys.stderr, "buffer"):
    try: _sys.stderr = _io.TextIOWrapper(_sys.stderr.buffer, encoding="utf-8", errors="replace", line_buffering=True)
    except Exception: pass
# ─────────────────────────────────────────────────────────────────────────────

import asyncio
import json
import sys
import time
from typing import TypedDict, Annotated, List, Optional, Any
from langgraph.graph import StateGraph, END
import operator

_print = lambda *a, **k: print(*a, **{**k, "flush": True})

from agents.data_retriever import fetch_shenzhen_geojson
from agents.physics_engine import compute_indices, compute_risk_index
from agents.geocoder import geocode
from agents.entity_simulator import generate_entities, simulate_entities


# ── 状态定义 ────────────────────────────────────────────────────────────────
class AgentState(TypedDict):
    logs:           Annotated[List[str], operator.add]
    city_query:     str
    region:         str
    lat:            float
    lon:            float
    raw_data:       dict
    geojson:        Optional[dict]
    processed_data: dict
    risk_data:      dict
    entity_data:    Optional[dict]   # Phase 4: 实体模拟结果


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

    thermo = compute_indices(raw)
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


# ── 节点：EntitySimulator ───────────────────────────────────────────────────
def node_entity_simulator(state: AgentState) -> dict:
    ts = time.strftime("%H:%M:%S")
    _print(f"[{ts}] [EntitySimulator] 初始化多智能体沙盒...")

    lat = state.get("lat", 22.69)
    lon = state.get("lon", 114.39)
    risk_data = state.get("risk_data", {})
    risk_index = risk_data.get("risk_index", 0)
    risk_level = risk_data.get("risk_level", "UNKNOWN")

    # 生成实体
    entities = generate_entities(lat, lon, count=100)

    # 执行一轮模拟（初始推演）
    result = simulate_entities(entities, risk_index, risk_level, tick=0)

    stats = result["stats"]
    log1 = (
        f"[{ts}] [EntitySimulator] ✓ 生成 {stats['total_entities']} 个动态实体 | "
        f"风险驱动: {risk_index}/100"
    )
    log2 = (
        f"[{ts}] [EntitySimulator] 资产均值: {stats['avg_asset_value']} | "
        f"恐慌: {stats['panic_count']} | 压力: {stats['stressed_count']} | "
        f"正常: {stats['normal_count']}"
    )
    if result["trade_events"]:
        log3 = f"[{ts}] [EntitySimulator] 触发 {len(result['trade_events'])} 笔交易事件"
        _print(log1); _print(log2); _print(log3)
        logs = [log1, log2, log3]
    else:
        _print(log1); _print(log2)
        logs = [log1, log2]

    return {
        "logs": logs,
        "entity_data": result,
    }


# ── 节点：Finish ────────────────────────────────────────────────────────────
def node_finish(state: AgentState) -> dict:
    ts = time.strftime("%H:%M:%S")
    risk = state.get("risk_data", {})
    entity_data = state.get("entity_data", {})
    stats = entity_data.get("stats", {})
    level = risk.get("risk_level", "UNKNOWN")
    idx = risk.get("risk_index", 0)
    avg_val = stats.get("avg_asset_value", "—")
    msg = (
        f"[{ts}] [Finish] ✓ Phase 4 工作流完毕 | "
        f"风险: {level} ({idx}/100) | 全局均值资产: {avg_val}"
    )
    _print(msg)
    return {"logs": [msg]}


# ── 图构建 ──────────────────────────────────────────────────────────────────
def build_graph() -> StateGraph:
    g = StateGraph(AgentState)
    g.add_node("Geocoder",         node_geocoder)
    g.add_node("DataRetriever",    node_fetch_data)
    g.add_node("PhysicsEngine",    node_physics)
    g.add_node("EntitySimulator",  node_entity_simulator)
    g.add_node("Finish",           node_finish)
    g.set_entry_point("Geocoder")
    g.add_edge("Geocoder",        "DataRetriever")
    g.add_edge("DataRetriever",   "PhysicsEngine")
    g.add_edge("PhysicsEngine",   "EntitySimulator")
    g.add_edge("EntitySimulator", "Finish")
    g.add_edge("Finish",          END)
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
    事件类型：start | log | geocoded | geojson | risk | entities | trade | done
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
        "entity_data": None,
    }

    ts = time.strftime("%H:%M:%S")
    yield {
        "event": "start",
        "message": f"[{ts}] [Orchestrator] Phase 4 工作流启动 — 查询: '{city_query or region}'"
    }

    for graph_event in micro_earth_graph.stream(state):
        for node_name, node_output in graph_event.items():
            # 日志推送
            for log_line in node_output.get("logs", []):
                yield {"event": "log", "node": node_name, "message": log_line}
                await asyncio.sleep(0.2)

            # Geocoder 结果
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

            # GeoJSON 气象网格
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

            # 风险指数
            if node_output.get("risk_data"):
                final_risk = node_output["risk_data"]
                yield {
                    "event": "risk",
                    "node": node_name,
                    "message": f"[{time.strftime('%H:%M:%S')}] [Risk] 指数={final_risk['risk_index']} 等级={final_risk['risk_level']}",
                    "data": final_risk,
                }
                await asyncio.sleep(0.1)

            # Phase 4: 实体数据推送
            if node_output.get("entity_data"):
                ed = node_output["entity_data"]
                entities = ed.get("entities", [])
                trade_events = ed.get("trade_events", [])
                stats = ed.get("stats", {})

                # 推送实体列表（精简字段，减少传输量）
                slim_entities = [
                    {
                        "id":  e["entity_id"],
                        "lat": e["location"]["lat"],
                        "lon": e["location"]["lon"],
                        "val": e["asset_value"],
                        "st":  e["status"],
                    }
                    for e in entities
                ]
                yield {
                    "event": "entities",
                    "node": node_name,
                    "message": f"[{time.strftime('%H:%M:%S')}] [EntitySim] {len(slim_entities)} 个实体已就绪",
                    "data": {"entities": slim_entities, "stats": stats},
                }
                await asyncio.sleep(0.15)

                # 逐批推送交易事件
                for evt in trade_events:
                    action_map = {
                        "EMERGENCY_SELL":     "紧急抛售",
                        "FORCED_LIQUIDATION": "强制清仓",
                        "DISTRESS_SWAP":      "恐慌互换",
                        "HEDGE_SWAP":         "对冲互换",
                        "PARTIAL_SELL":       "部分减仓",
                        "RISK_TRANSFER":      "风险转移",
                        "DEFENSIVE_REBALANCE":"防御性再平衡",
                        "SHORT_HEDGE":        "空头对冲",
                        "REBALANCE":          "组合再平衡",
                        "HOLD":               "持仓观望",
                        "MICRO_ADJUST":       "微幅调仓",
                    }
                    action_cn = action_map.get(evt["action"], evt["action"])
                    msg = (
                        f"[{evt['ts']}] Entity #{evt['entity_id']:03d} "
                        f"资产跌 {evt['depreciation_pct']}% → {evt['asset_value']:.0f} "
                        f"| {action_cn}"
                    )
                    yield {
                        "event": "trade",
                        "node": node_name,
                        "message": msg,
                        "data": evt,
                    }
                    await asyncio.sleep(0.08)

    ts = time.strftime("%H:%M:%S")
    yield {"event": "done", "message": f"[{ts}] [Orchestrator] Phase 4 所有节点执行完毕 ✓"}


if __name__ == "__main__":
    async def _test():
        async for evt in run_graph_stream(city_query="成都"):
            print(evt.get("message", ""))
    asyncio.run(_test())
