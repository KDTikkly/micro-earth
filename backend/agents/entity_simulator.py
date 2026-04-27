"""
EntitySimulator Agent — Phase 4
多智能体自主响应与动态资产推演 (Autonomous Entities & Dynamic Asset Valuation)

在目标城市周围生成 100 个 Kinetic Entities，受环境风险驱动资产老化与恐慌性交易。
"""
import random
import math
import time
from typing import List, Dict


# ── 资产老化非线性模型 ───────────────────────────────────────────────────────
def _depreciation_rate(risk_index: float, distance_factor: float) -> float:
    """
    非线性资产老化率（每次更新的折旧率）
    - risk_index: 0~100 环境风险指数
    - distance_factor: 0~1 实体距风险中心的相对距离（越近=越高）
    公式: rate = k * risk² * proximity_weight
    """
    if risk_index <= 50:
        return 0.0
    k = 0.0008
    proximity = 1.0 - distance_factor * 0.6  # 距离越远衰减越少
    rate = k * (risk_index ** 1.8) * proximity
    return min(rate, 0.25)  # 单次最多折损 25%


def generate_entities(
    center_lat: float,
    center_lon: float,
    count: int = 100,
    spread_deg: float = 0.35,
) -> List[Dict]:
    """
    在城市中心周围随机生成实体群
    spread_deg: 坐标散布半径（度）
    """
    random.seed(int(center_lat * 1000 + center_lon * 1000) % 9999)
    entities = []
    for i in range(count):
        # 正态分布聚集在城市中心
        r = abs(random.gauss(0, spread_deg * 0.45))
        theta = random.uniform(0, 2 * math.pi)
        lat = center_lat + r * math.cos(theta)
        lon = center_lon + r * math.sin(theta)
        entities.append({
            "entity_id":   i + 1,
            "location":    {"lat": round(lat, 5), "lon": round(lon, 5)},
            "asset_value": 1000.0,
            "status":      "NORMAL",     # NORMAL | STRESSED | PANIC
            "trade_log":   [],
            "_dist_factor": min(r / spread_deg, 1.0),  # 归一化距离
        })
    return entities


def simulate_entities(
    entities: List[Dict],
    risk_index: float,
    risk_level: str,
    tick: int = 0,
) -> Dict:
    """
    根据风险指数推演实体状态变化。
    返回:
    - entities: 更新后的实体列表（含布朗运动偏移）
    - trade_events: 本轮触发的交易事件列表
    - stats: 全局统计
    """
    trade_events = []
    total_value = 0.0
    panic_count = 0
    stressed_count = 0

    for ent in entities:
        # ── 布朗运动偏移（持续微幅随机游走）──
        brownian_lat = random.gauss(0, 0.0008)
        brownian_lon = random.gauss(0, 0.0008)
        ent["location"]["lat"] = round(ent["location"]["lat"] + brownian_lat, 5)
        ent["location"]["lon"] = round(ent["location"]["lon"] + brownian_lon, 5)

        # ── 资产老化计算 ──
        dist_f = ent.get("_dist_factor", 0.5)
        rate = _depreciation_rate(risk_index, dist_f)

        if rate > 0:
            old_val = ent["asset_value"]
            # 加入个体随机波动 ±15%
            actual_rate = rate * random.uniform(0.85, 1.15)
            ent["asset_value"] = round(max(old_val * (1 - actual_rate), 1.0), 2)
            depreciation_pct = round((old_val - ent["asset_value"]) / old_val * 100, 1)

            # ── 状态转变逻辑 ──
            prev_status = ent["status"]
            if ent["asset_value"] < 300:
                ent["status"] = "PANIC"
            elif ent["asset_value"] < 600:
                ent["status"] = "STRESSED"

            # ── 触发交易事件 ──
            if depreciation_pct > 5 and random.random() < 0.4:
                action = _decide_trade_action(ent, risk_level, depreciation_pct)
                event = {
                    "ts":         time.strftime("%H:%M:%S"),
                    "entity_id":  ent["entity_id"],
                    "asset_value": ent["asset_value"],
                    "depreciation_pct": depreciation_pct,
                    "action":     action,
                    "status":     ent["status"],
                }
                trade_events.append(event)
                ent["trade_log"].append(event)

        # 统计
        total_value += ent["asset_value"]
        if ent["status"] == "PANIC":
            panic_count += 1
        elif ent["status"] == "STRESSED":
            stressed_count += 1

    avg_value = round(total_value / len(entities), 2)

    stats = {
        "tick":           tick,
        "avg_asset_value": avg_value,
        "panic_count":    panic_count,
        "stressed_count": stressed_count,
        "normal_count":   len(entities) - panic_count - stressed_count,
        "total_entities": len(entities),
        "risk_index":     risk_index,
        "risk_level":     risk_level,
    }

    return {
        "entities":     entities,
        "trade_events": trade_events[:20],  # 每轮最多推送 20 条事件
        "stats":        stats,
    }


def _decide_trade_action(ent: Dict, risk_level: str, depreciation_pct: float) -> str:
    """根据状态和风险等级决定交易行为"""
    if ent["status"] == "PANIC":
        actions = ["EMERGENCY_SELL", "FORCED_LIQUIDATION", "DISTRESS_SWAP"]
    elif ent["status"] == "STRESSED":
        actions = ["HEDGE_SWAP", "PARTIAL_SELL", "RISK_TRANSFER"]
    else:
        if risk_level in ("CRITICAL", "HIGH"):
            actions = ["DEFENSIVE_REBALANCE", "SHORT_HEDGE", "PARTIAL_SELL"]
        else:
            actions = ["REBALANCE", "HOLD", "MICRO_ADJUST"]
    return random.choice(actions)
