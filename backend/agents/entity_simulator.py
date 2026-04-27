"""
EntitySimulator Agent - v9.0
多智能体自主疏散 + Web3/Hardhat 链上 AMM 结算

v9.0 新增：
  - 通过 chain_amm 适配层调用 DynamicAssetAMM.panicSell() on-chain
  - 自动降级：Hardhat 不可用时回退到内置 x*y=k 模拟 AMM
  - trade_events 携带 chain_mode 字段标识是否为真实链上 tx
"""
# -*- coding: utf-8 -*-
import os as _os; _os.environ.setdefault("PYTHONIOENCODING", "utf-8")

import random
import math
import time
import hashlib
from typing import List, Dict

# 延迟导入 chain_amm 避免启动时因 web3 未安装导致崩溃
_chain_amm = None

def _get_chain_amm():
    global _chain_amm
    if _chain_amm is None:
        try:
            import agents.chain_amm as _mod
            _chain_amm = _mod
        except Exception:
            pass
    return _chain_amm

# -- 灾害感知阈值 --------------------------------------------------------------
EVACUATION_RISK_THRESHOLD = 60   # 风险指数 >= 此值触发疏散
DANGER_RADIUS_DEG         = 0.25 # 灾害中心半径（度），约 25km
SAFE_RADIUS_DEG           = 0.55 # 抵达此距离视为安全
EVAC_SPEED_DEG            = 0.003  # 每 tick 最大位移（约 300m）

# -- v8.0 AMM 初始流动性 -------------------------------------------------------
AMM_INITIAL_ASSET   = 10.0    # 初始 DynAsset 储量
AMM_INITIAL_STABLE  = 500.0   # 初始 Stablecoin 储量
_amm_asset  = AMM_INITIAL_ASSET
_amm_stable = AMM_INITIAL_STABLE
_amm_k      = AMM_INITIAL_ASSET * AMM_INITIAL_STABLE   # 恒定乘积 k = x * y


def amm_reset():
    """重置 AMM 池到初始状态"""
    global _amm_asset, _amm_stable, _amm_k
    _amm_asset  = AMM_INITIAL_ASSET
    _amm_stable = AMM_INITIAL_STABLE
    _amm_k      = _amm_asset * _amm_stable


def amm_price() -> float:
    """当前 AMM 价格 = stable / asset"""
    return _amm_stable / _amm_asset if _amm_asset > 1e-9 else 0.0


def amm_swap_asset_for_stable(asset_in: float) -> float:
    """
    实体抛售 asset_in 个 DynAsset 换 Stablecoin。
    恒定乘积：(x + dx)(y - dy) = k  =>  dy = y - k/(x+dx)
    返回实际获得的 stable 数量（有滑点）。
    """
    global _amm_asset, _amm_stable
    if asset_in <= 0 or _amm_asset <= 1e-9:
        return 0.0
    stable_out = _amm_stable - _amm_k / (_amm_asset + asset_in)
    stable_out = max(0.0, stable_out)
    _amm_asset  += asset_in
    _amm_stable -= stable_out
    return stable_out


def _make_tx_hash(entity_id: int, ts: str, price: float) -> str:
    """生成伪确定性交易哈希（Keccak-style hex，不依赖 web3.py）"""
    raw = f"{entity_id}:{ts}:{price:.6f}:{random.random()}"
    return "0x" + hashlib.sha256(raw.encode()).hexdigest()


def _distance_deg(lat1, lon1, lat2, lon2) -> float:
    """简单欧氏距离（度）"""
    return math.sqrt((lat1 - lat2) ** 2 + (lon1 - lon2) ** 2)


def _evacuation_vector(ent_lat, ent_lon, disaster_lat, disaster_lon):
    """
    计算远离灾害中心的单位向量，加入随机偏转模拟真实逃跑路径
    """
    dlat = ent_lat - disaster_lat
    dlon = ent_lon - disaster_lon
    dist = math.sqrt(dlat ** 2 + dlon ** 2) or 1e-9

    # 单位向量（远离方向）
    ux = dlat / dist
    uy = dlon / dist

    # 随机侧偏 ±30 deg 模拟绕路
    angle = random.uniform(-math.pi / 6, math.pi / 6)
    cos_a, sin_a = math.cos(angle), math.sin(angle)
    rx = ux * cos_a - uy * sin_a
    ry = ux * sin_a + uy * cos_a

    # 速度随接近程度线性加快（越近越快跑）
    proximity = max(0.0, 1.0 - dist / DANGER_RADIUS_DEG)
    speed = EVAC_SPEED_DEG * (0.5 + 1.0 * proximity)

    return rx * speed, ry * speed


def generate_entities(
    center_lat: float,
    center_lon: float,
    count: int = 100,
    spread_deg: float = 0.35,
) -> List[Dict]:
    """
    在城市中心周围随机生成实体群（救援编队 / 高价值移动资产）
    """
    random.seed(int(center_lat * 1000 + center_lon * 1000) % 9999)
    entities = []
    for i in range(count):
        r = abs(random.gauss(0, spread_deg * 0.45))
        theta = random.uniform(0, 2 * math.pi)
        lat = center_lat + r * math.cos(theta)
        lon = center_lon + r * math.sin(theta)
        entities.append({
            "entity_id":     i + 1,
            "location":      {"lat": round(lat, 5), "lon": round(lon, 5)},
            "status":        "SAFE",    # SAFE | EVACUATING | RESCUED
            "trail":         [],        # 最近 8 个历史坐标（逃生尾迹）
            "_dist_factor":  min(r / spread_deg, 1.0),
            # 兼容旧字段
            "asset_value":   1000.0,
            "trade_log":     [],
        })
    return entities


def simulate_entities(
    entities: List[Dict],
    risk_index: float,
    risk_level: str,
    disaster_lat: float = None,
    disaster_lon: float = None,
    tick: int = 0,
) -> Dict:
    """
    v8.0: 灾害感知 + 逃生向量推演 + Cosmolyra AMM 自动结算。

    当 risk_index >= EVACUATION_RISK_THRESHOLD 时：
      - 处于灾害半径内的实体进入 EVACUATING 状态
      - 每个新疏散实体向 AMM 发起 Swap（抛售 DynAsset 换 Stablecoin）
      - AMM 价格因抛压下跌（恒定乘积滑点）
      - trade_events 携带 amm_price / amm_k / tx_hash 字段

    Returns:
    - entities:      更新后的实体列表（含尾迹）
    - trade_events:  兼容旧终端日志的事件列表（含 AMM 字段）
    - stats:         全局统计
    - evac_logs:     物理灾害警告日志
    """
    global _amm_asset, _amm_stable, _amm_k

    # 每轮重置 AMM（保证每次运行从初始流动性开始）
    if tick == 0:
        amm_reset()

    if disaster_lat is None:
        lats = [e["location"]["lat"] for e in entities]
        lons = [e["location"]["lon"] for e in entities]
        disaster_lat = sum(lats) / len(lats)
        disaster_lon = sum(lons) / len(lons)

    disaster_active  = risk_index >= EVACUATION_RISK_THRESHOLD
    trade_events     = []
    evac_logs        = []
    safe_count       = 0
    evacuating_count = 0
    rescued_count    = 0
    newly_evacuating = []

    for ent in entities:
        lat = ent["location"]["lat"]
        lon = ent["location"]["lon"]
        dist = _distance_deg(lat, lon, disaster_lat, disaster_lon)

        if disaster_active:
            if dist < DANGER_RADIUS_DEG and ent["status"] != "RESCUED":
                if ent["status"] == "SAFE":
                    ent["status"] = "EVACUATING"
                    newly_evacuating.append(ent["entity_id"])

                if ent["status"] == "EVACUATING":
                    ent["trail"].append({"lat": round(lat, 5), "lon": round(lon, 5)})
                    if len(ent["trail"]) > 8:
                        ent["trail"].pop(0)

                    dlat, dlon = _evacuation_vector(lat, lon, disaster_lat, disaster_lon)
                    new_lat = round(lat + dlat, 5)
                    new_lon = round(lon + dlon, 5)
                    ent["location"]["lat"] = new_lat
                    ent["location"]["lon"] = new_lon

                    new_dist = _distance_deg(new_lat, new_lon, disaster_lat, disaster_lon)
                    if new_dist >= SAFE_RADIUS_DEG:
                        ent["status"] = "RESCUED"

            elif dist >= SAFE_RADIUS_DEG and ent["status"] == "SAFE":
                ent["location"]["lat"] = round(lat + random.gauss(0, 0.0003), 5)
                ent["location"]["lon"] = round(lon + random.gauss(0, 0.0003), 5)

        else:
            ent["status"] = "SAFE"
            ent["location"]["lat"] = round(lat + random.gauss(0, 0.0005), 5)
            ent["location"]["lon"] = round(lon + random.gauss(0, 0.0005), 5)
            ent["trail"] = []

        # 统计
        if   ent["status"] == "RESCUED":    rescued_count    += 1
        elif ent["status"] == "EVACUATING": evacuating_count += 1
        else:                               safe_count       += 1

        ent["asset_value"] = round(ent["asset_value"] * random.uniform(0.999, 1.001), 2)

    # -- v8.0: AMM 抛售 + 交易事件生成 -----------------------------------------
    ts = time.strftime("%H:%M:%S")
    if newly_evacuating:
        evac_log = (
            f"[{ts}] [WARNING] Disaster approaching ({disaster_lat:.3f}, {disaster_lon:.3f}). "
            f"{len(newly_evacuating)} entities initiating emergency evacuation protocols."
        )
        evac_logs.append(evac_log)

        cam = _get_chain_amm()
        for eid in newly_evacuating[:10]:
            # AMM swap: 每实体抛售约 0.3~0.8 个 DynAsset
            sell_amount = round(random.uniform(0.3, 0.8), 4)

            # v9.0: 优先调用链上 AMM，不可用时 fallback 到内置模拟
            if cam is not None:
                try:
                    result    = cam.swap_panic_sell(eid, sell_amount)
                    cur_price = result["amm_price"]
                    stable_recv = result["stable_out"]
                    tx_hash   = result["tx_hash"]
                    chain_mode = result.get("chain_mode", False)
                except Exception:
                    stable_recv = amm_swap_asset_for_stable(sell_amount)
                    cur_price   = amm_price()
                    tx_hash     = _make_tx_hash(eid, ts, cur_price)
                    chain_mode  = False
            else:
                stable_recv = amm_swap_asset_for_stable(sell_amount)
                cur_price   = amm_price()
                tx_hash     = _make_tx_hash(eid, ts, cur_price)
                chain_mode  = False

            trade_events.append({
                "ts":           ts,
                "entity_id":    eid,
                "action":       "EMERGENCY_EVACUATE",
                "status":       "EVACUATING",
                "asset_value":  round(cur_price * 10, 2),
                "depreciation_pct": round((1 - cur_price / (AMM_INITIAL_STABLE / AMM_INITIAL_ASSET)) * 100, 2),
                "amm_price":    round(cur_price, 4),
                "amm_k":        round(_amm_k, 4),
                "amm_sell":     sell_amount,
                "amm_recv":     round(stable_recv, 4),
                "tx_hash":      tx_hash,
                "chain_mode":   chain_mode,
            })
            mode_tag = "[ON-CHAIN]" if chain_mode else "[SIMULATED]"
            amm_log = (
                f"[{ts}] [AMM] {mode_tag} Entity #{eid:03d} SWAP {sell_amount} DYNA -> {stable_recv:.2f} MUSD | "
                f"Price: {cur_price:.2f} | TxHash: {tx_hash[:20]}..."
            )
            evac_logs.append(amm_log)

    if rescued_count > 0 and tick % 3 == 0:
        evac_logs.append(
            f"[{ts}] [INFO] {rescued_count} entities reached safe zones. "
            f"{evacuating_count} still evacuating. AMM Price: {amm_price():.2f}"
        )

    stats = {
        "tick":             tick,
        "total_entities":   len(entities),
        "safe_count":       safe_count,
        "evacuating_count": evacuating_count,
        "rescued_count":    rescued_count,
        "risk_index":       risk_index,
        "risk_level":       risk_level,
        "disaster_active":  disaster_active,
        "disaster_lat":     round(disaster_lat, 5),
        "disaster_lon":     round(disaster_lon, 5),
        # 兼容旧字段
        "panic_count":      evacuating_count,
        "stressed_count":   0,
        "normal_count":     safe_count,
        "avg_asset_value":  round(amm_price() * 10, 2),
        # v8.0 AMM
        "amm_price":        round(amm_price(), 4),
        "amm_k":            round(_amm_k, 4),
    }

    return {
        "entities":     entities,
        "trade_events": trade_events[:20],
        "evac_logs":    evac_logs,
        "stats":        stats,
    }


def _decide_trade_action(ent: Dict, risk_level: str, depreciation_pct: float) -> str:
    """兼容旧接口（不再使用，保留供旧代码引用）"""
    return "EMERGENCY_EVACUATE"


