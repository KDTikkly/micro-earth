"""
Micro-Earth Orchestrator - v6.0
LangGraph StateGraph:
  Input -> Geocoder -> DataRetriever -> PhysicsEngine -> EntitySimulator -> Output
v6.0 新增：
  - DataRetriever 获取 72h 风速/风向数据
  - PhysicsEngine 计算矢量场（U/V 分量）
  - windfield 事件推送 72h 风场时序到前端
"""
# -- UTF-8 编码保障（防 Windows GBK 报错）--------------------------------------
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
# -----------------------------------------------------------------------------

import asyncio
import json
import sys
import time
from typing import TypedDict, Annotated, List, Optional, Any
from langgraph.graph import StateGraph, END
import operator

def _print(*a, **k):
    """UTF-8 safe print：在 Windows GBK 终端下对所有中文字符做 replace 兜底"""
    try:
        print(*a, **{**k, "flush": True})
    except (UnicodeEncodeError, UnicodeDecodeError):
        safe = " ".join(
            str(x).encode("utf-8", errors="replace").decode("utf-8", errors="replace")
            for x in a
        )
        try:
            sys.stdout.buffer.write((safe + "\n").encode("utf-8", errors="replace"))
            sys.stdout.buffer.flush()
        except Exception:
            pass

from agents.data_retriever import fetch_shenzhen_geojson
from agents.physics_engine import compute_indices, compute_risk_index, super_resolve_grid, compute_wind_vector_field
from agents.geocoder import geocode
from agents.entity_simulator import generate_entities, simulate_entities
from agents.llm_adapter import analyze_weather, parse_city_intent, get_backend_info

# v9.0: 链上 AMM 适配层（延迟探测）
try:
    from agents.chain_amm import probe as _amm_probe
    _print("[ChainAMM] Probing Hardhat node...")
    _print(_amm_probe())
except Exception as _e:
    _print(f"[ChainAMM] Load skipped: {_e}")


# -- 状态定义 ----------------------------------------------------------------
class AgentState(TypedDict):
    logs:             Annotated[List[str], operator.add]
    city_query:       str
    region:           str
    lat:              float
    lon:              float
    raw_data:         dict
    geojson:          Optional[dict]
    processed_data:   dict
    risk_data:        dict
    entity_data:      Optional[dict]   # v4.0: 实体模拟结果
    heatmap_data:     Optional[dict]   # v5.0: 超分辨率热力矩阵
    windfield_data:   Optional[dict]   # v6.0: 72h 风场矢量场
    temp_offset:      float            # v5.0 What-If: 温度偏移
    precip_multiplier: float           # v5.0 What-If: 降水倍率


# -- 节点：Geocoder ----------------------------------------------------------
def node_geocoder(state: AgentState) -> dict:
    ts = time.strftime("%H:%M:%S")
    city = state.get("city_query") or state.get("region", "深圳")
    _print(f"[{ts}] [Geocoder] 解析城市坐标 -> '{city}'...")

    try:
        # v9.0: LLM 意图解析（自然语言 -> 城市名）
        # stub 模式下 parse_city_intent 直接返回原始输入，行为不变
        parsed_city = asyncio.run(parse_city_intent(city))
        if parsed_city and parsed_city != city:
            _print(f"[{ts}] [Geocoder] LLM 解析意图: '{city}' -> '{parsed_city}'")
            city = parsed_city

        lat, lon, name = asyncio.run(geocode(city))
        log = f"[{ts}] [Geocoder] * '{city}' -> {name} ({lat:.4f}, {lon:.4f})"
        _print(log)
        return {"logs": [log], "region": name, "lat": lat, "lon": lon}
    except Exception as e:
        err = f"[{ts}] [Geocoder] * 解析失败: {e}，保持当前坐标"
        _print(err)
        return {"logs": [err]}


# -- 节点：FetchData ---------------------------------------------------------
def node_fetch_data(state: AgentState) -> dict:
    ts = time.strftime("%H:%M:%S")
    lat = state.get("lat", 22.69)
    lon = state.get("lon", 114.39)
    region = state.get("region", "未知")
    _print(f"[{ts}] [DataRetriever] 请求 Open-Meteo - {region} ({lat:.4f}, {lon:.4f})...")

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

        log1 = f"[{ts}] [DataRetriever] * {region} 气象网格获取完毕 - {feature_count} 个网格点"
        log2 = f"[{ts}] [DataRetriever] 当前温度: {raw['temperature']} degC | 网格数: {feature_count}"
        _print(log1); _print(log2)

        # v9.0: LLM 气象摘要分析（stub 模式跳过，不影响现有行为）
        weather_summary = asyncio.run(analyze_weather({
            "region": region,
            "temperature": raw["temperature"],
            "precipitation": geojson["features"][0]["properties"].get("precipitation_probability", "--") if geojson["features"] else "--",
            "wind_speed": raw["wind_speed"],
            "risk_level": "PENDING",  # 此时 risk 尚未计算，占位
        }))
        logs_out = [log1, log2]
        if weather_summary:
            llm_log = f"[{ts}] [LLM·Lyria] {weather_summary}"
            _print(llm_log)
            logs_out.append(llm_log)

        return {"logs": logs_out, "raw_data": raw, "geojson": geojson}

    except Exception as e:
        err_log = f"[{ts}] [DataRetriever] * 获取失败: {e}，使用 Mock 数据"
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


# -- 节点：PhysicsEngine -----------------------------------------------------
def node_physics(state: AgentState) -> dict:
    ts = time.strftime("%H:%M:%S")
    _print(f"[{ts}] [PhysicsEngine] 启动极端天气推演 + 超分辨率插值...")

    raw = state.get("raw_data", {})
    geojson = state.get("geojson") or {}
    features = geojson.get("features", [])
    lat = state.get("lat", 22.69)
    lon = state.get("lon", 114.39)
    temp_offset      = float(state.get("temp_offset", 0.0))
    precip_multiplier = float(state.get("precip_multiplier", 1.0))

    thermo = compute_indices(raw)
    risk   = compute_risk_index(features)

    # v5.0: 超分辨率插值
    heatmap = super_resolve_grid(
        features, lat, lon,
        resolution=12,
        temp_offset=temp_offset,
        precip_multiplier=precip_multiplier,
    )
    flood_cnt = len(heatmap.get("flood_zones", []))

    # v6.0: 72h 风场矢量场
    windfield = compute_wind_vector_field(features, lat, lon)
    total_hrs = windfield.get("total_hours", 0)
    avg_spd_now = windfield["hourly_vectors"][0]["avg_speed"] if windfield.get("hourly_vectors") else 0

    log = (
        f"[{ts}] [PhysicsEngine] * 推演完成 | "
        f"风险指数={risk['risk_index']} [{risk['risk_level']}] | "
        f"热力={thermo['heat_index']:.1f} | 风冷={thermo['wind_chill']:.1f} | "
        f"超分辨率网格=12×12 | 潜在洪涝格={flood_cnt} | "
        f"风场时序={total_hrs}h | 当前风速~{avg_spd_now}m/s"
    )
    _print(log)
    if temp_offset != 0.0 or precip_multiplier != 1.0:
        wi_log = (
            f"[{ts}] [PhysicsEngine] [WhatIf] temp_offset={temp_offset:+.1f} degC, "
            f"precip_mult=x{precip_multiplier:.2f}"
        )
        _print(wi_log)
        logs = [log, wi_log]
    else:
        logs = [log]

    processed = {**thermo, "status": thermo["status"]}
    return {
        "logs": logs,
        "processed_data": processed,
        "risk_data": risk,
        "heatmap_data": heatmap,
        "windfield_data": windfield,
    }


# -- 节点：EntitySimulator ---------------------------------------------------
def node_entity_simulator(state: AgentState) -> dict:
    ts = time.strftime("%H:%M:%S")
    _print(f"[{ts}] [EntitySimulator] v7.0 - 自主疏散推演启动...")

    lat = state.get("lat", 22.69)
    lon = state.get("lon", 114.39)
    risk_data  = state.get("risk_data", {})
    risk_index = risk_data.get("risk_index", 0)
    risk_level = risk_data.get("risk_level", "UNKNOWN")

    # 生成实体（以城市中心为灾害原点）
    entities = generate_entities(lat, lon, count=100)

    # v7.0: 传入灾害坐标 = 城市中心（即 What-If 滑块模拟的风险热区中心）
    result = simulate_entities(
        entities, risk_index, risk_level,
        disaster_lat=lat, disaster_lon=lon,
        tick=0,
    )

    stats = result["stats"]
    log1 = (
        f"[{ts}] [EntitySimulator] * 生成 {stats['total_entities']} 个 Kinetic Entities | "
        f"灾害风险: {risk_index}/100 [{risk_level}]"
    )
    log2 = (
        f"[{ts}] [EntitySimulator] 安全: {stats['safe_count']} | "
        f"疏散中: {stats['evacuating_count']} | 已抵达安全区: {stats['rescued_count']}"
    )
    logs = [log1, log2]

    # 物理灾害警告日志直接 _print 到终端
    for evac_log in result.get("evac_logs", []):
        _print(evac_log)
        logs.append(evac_log)

    _print(log1); _print(log2)

    return {
        "logs": logs,
        "entity_data": result,
    }


# -- 节点：Finish ------------------------------------------------------------
def node_finish(state: AgentState) -> dict:
    ts = time.strftime("%H:%M:%S")
    risk = state.get("risk_data", {})
    entity_data = state.get("entity_data", {})
    heatmap = state.get("heatmap_data", {})
    windfield = state.get("windfield_data", {})
    stats     = entity_data.get("stats", {})
    level     = risk.get("risk_level", "UNKNOWN")
    idx       = risk.get("risk_index", 0)
    flood_cnt = len(heatmap.get("flood_zones", [])) if heatmap else 0
    wind_hrs  = windfield.get("total_hours", 0) if windfield else 0
    evac_cnt  = stats.get("evacuating_count", 0)
    resc_cnt  = stats.get("rescued_count", 0)
    safe_cnt  = stats.get("safe_count", 0)
    msg = (
        f"[{ts}] [Finish] * v7.0 工作流完毕 | "
        f"风险: {level} ({idx}/100) | "
        f"安全: {safe_cnt} | 疏散中: {evac_cnt} | 已入安全区: {resc_cnt} | "
        f"洪涝预警格: {flood_cnt} | 风场时序: {wind_hrs}h"
    )
    _print(msg)
    return {"logs": [msg]}


# -- 图构建 ------------------------------------------------------------------
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
    temp_offset: float = 0.0,
    precip_multiplier: float = 1.0,
):
    """
    异步生成器：逐步 yield 事件给 WebSocket 推流
    事件类型：start | log | geocoded | geojson | risk | heatmap | entities | trade | done
    v5.0 新增 heatmap 事件、What-If 参数
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
        "heatmap_data": None,
        "windfield_data": None,
        "temp_offset": temp_offset,
        "precip_multiplier": precip_multiplier,
    }

    ts = time.strftime("%H:%M:%S")
    wi_str = ""
    if temp_offset != 0.0 or precip_multiplier != 1.0:
        wi_str = f" | [WhatIf] T{temp_offset:+.1f} degC, Px{precip_multiplier:.2f}"
    yield {
        "event": "start",
        "message": f"[{ts}] [Orchestrator] v6.0 工作流启动 - 查询: '{city_query or region}'{wi_str}"
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
                    "message": f"[{time.strftime('%H:%M:%S')}] [Geocoder] 坐标已更新 -> ({node_output['lat']:.4f}, {node_output['lon']:.4f})",
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

            # v5.0: 超分辨率热力矩阵
            if node_output.get("heatmap_data"):
                hm = node_output["heatmap_data"]
                flood_cnt = len(hm.get("flood_zones", []))
                yield {
                    "event": "heatmap",
                    "node": node_name,
                    "message": (
                        f"[{time.strftime('%H:%M:%S')}] [Heatmap] "
                        f"超分辨率矩阵 {hm['resolution']}×{hm['resolution']} 已就绪 | "
                        f"潜在洪涝格: {flood_cnt}"
                    ),
                    "data": hm,
                }
                await asyncio.sleep(0.1)

            # v6.0: 72h 风场矢量场
            if node_output.get("windfield_data"):
                wf = node_output["windfield_data"]
                total_hrs = wf.get("total_hours", 0)
                yield {
                    "event": "windfield",
                    "node": node_name,
                    "message": (
                        f"[{time.strftime('%H:%M:%S')}] [WindField] "
                        f"72h 风场矢量场已就绪 | 时间帧: {total_hrs}h"
                    ),
                    "data": wf,
                }
                await asyncio.sleep(0.1)

            # v4.0 / v7.0: 实体数据推送 + 疏散警告日志
            if node_output.get("entity_data"):
                ed = node_output["entity_data"]
                entities = ed.get("entities", [])
                trade_events = ed.get("trade_events", [])
                evac_logs    = ed.get("evac_logs", [])
                stats = ed.get("stats", {})

                slim_entities = [
                    {
                        "id":         e["entity_id"],
                        "entity_id":  e["entity_id"],
                        "lat":        e["location"]["lat"],
                        "lon":        e["location"]["lon"],
                        "val":        e["asset_value"],
                        "st":         e["status"],
                        "status":     e["status"],
                        "trail":      e.get("trail", []),
                        "location":   e["location"],
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

                # v7.0: 将物理灾害警告日志作为独立 log 事件推送到前端
                for evac_log in evac_logs:
                    yield {
                        "event": "log",
                        "node": "EntitySimulator",
                        "message": evac_log,
                    }
                    await asyncio.sleep(0.05)

                for evt in trade_events:
                    action_map = {
                        "EMERGENCY_EVACUATE": "Emergency Evac + AMM Swap",
                        "EMERGENCY_SELL":     "Emergency Sell",
                        "FORCED_LIQUIDATION": "Forced Liquidation",
                        "DISTRESS_SWAP":      "Distress Swap",
                        "HEDGE_SWAP":         "Hedge Swap",
                        "PARTIAL_SELL":       "Partial Sell",
                        "RISK_TRANSFER":      "Risk Transfer",
                        "DEFENSIVE_REBALANCE":"Defensive Rebalance",
                        "SHORT_HEDGE":        "Short Hedge",
                        "REBALANCE":          "Rebalance",
                        "HOLD":               "Hold",
                        "MICRO_ADJUST":       "Micro Adjust",
                    }
                    action_cn = action_map.get(evt["action"], evt["action"])
                    # v8.0: 携带 AMM 价格信息
                    amm_info = ""
                    if evt.get("amm_price") is not None:
                        amm_info = f" | AMM:{evt['amm_price']:.2f}"
                    msg = (
                        f"[{evt['ts']}] Entity #{evt.get('entity_id', 0):03d} "
                        f"| {action_cn}{amm_info}"
                    )
                    yield {
                        "event": "trade",
                        "node": node_name,
                        "message": msg,
                        "data": evt,
                    }
                    await asyncio.sleep(0.08)

    ts = time.strftime("%H:%M:%S")
    yield {"event": "done", "message": f"[{ts}] [Orchestrator] v6.0 所有节点执行完毕 *"}


if __name__ == "__main__":
    async def _test():
        async for evt in run_graph_stream(city_query="成都"):
            print(evt.get("message", ""))
    asyncio.run(_test())


