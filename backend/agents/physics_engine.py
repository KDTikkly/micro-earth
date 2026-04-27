"""
PhysicsEngine Agent - v5.0
极端天气风险指数推演（Extreme Weather Risk Index, 0~100）
+ 超分辨率空间插值（Bilinear Interpolation 25km->1km 模拟）
+ What-If 环境干预（temp_offset / precip_multiplier）
"""
# -*- coding: utf-8 -*-
import os as _os; _os.environ.setdefault("PYTHONIOENCODING", "utf-8")
import math


# -- 超分辨率空间插值 ------------------------------------------------------------
def super_resolve_grid(features: list, center_lat: float, center_lon: float,
                       resolution: int = 12,
                       temp_offset: float = 0.0,
                       precip_multiplier: float = 1.0) -> dict:
    """
    v5.0: 超分辨率空间插值
    将稀疏的观测节点（~25km 间距）通过反距离权重插值（IDW）上采样为
    resolution×resolution 的高分辨率矩阵（模拟 1km 精度）。

    Args:
        features: GeoJSON features 列表
        center_lat/center_lon: 城市中心坐标
        resolution: 输出网格边长（默认 12×12 = 144 格）
        temp_offset: What-If - 全局温度偏移（ degC）
        precip_multiplier: What-If - 降水概率倍率

    Returns:
        {
          "temp_matrix": [[float]],    # resolution×resolution 温度矩阵
          "precip_matrix": [[float]],  # resolution×resolution 降水概率矩阵
          "flood_zones": [{"lat":..., "lon":..., "radius":...}],  # 潜在洪涝区
          "bounds": {"min_lat", "max_lat", "min_lon", "max_lon"},
          "resolution": int,
          "temp_offset": float,
          "precip_multiplier": float,
        }
    """
    if not features:
        return {
            "temp_matrix": [],
            "precip_matrix": [],
            "flood_zones": [],
            "bounds": {},
            "resolution": resolution,
            "temp_offset": temp_offset,
            "precip_multiplier": precip_multiplier,
        }

    # 提取观测点的坐标和数值
    obs = []
    for feat in features:
        coords = feat.get("geometry", {}).get("coordinates", [])
        props  = feat.get("properties", {})
        if len(coords) >= 2:
            flon, flat = coords[0], coords[1]
        else:
            flat, flon = center_lat, center_lon
        T = (props.get("temperature_2m") or props.get("avg_temperature_24h") or 20.0) + temp_offset
        P = min((props.get("precipitation_probability") or props.get("avg_precipitation_24h") or 0.0) * precip_multiplier, 100.0)
        obs.append({"lat": flat, "lon": flon, "T": T, "P": P})

    if not obs:
        return {
            "temp_matrix": [],
            "precip_matrix": [],
            "flood_zones": [],
            "bounds": {},
            "resolution": resolution,
            "temp_offset": temp_offset,
            "precip_multiplier": precip_multiplier,
        }

    # 确定网格范围（以中心为基准，±1.5度）
    span = 1.5
    min_lat = center_lat - span
    max_lat = center_lat + span
    min_lon = center_lon - span
    max_lon = center_lon + span

    temp_matrix   = []
    precip_matrix = []
    flood_zones   = []

    for row in range(resolution):
        temp_row   = []
        precip_row = []
        grid_lat = min_lat + (max_lat - min_lat) * (row + 0.5) / resolution

        for col in range(resolution):
            grid_lon = min_lon + (max_lon - min_lon) * (col + 0.5) / resolution

            # IDW 插值（power=2）
            weights = []
            for o in obs:
                d = math.sqrt((o["lat"] - grid_lat) ** 2 + (o["lon"] - grid_lon) ** 2)
                d = max(d, 1e-6)
                weights.append(1.0 / (d ** 2))

            total_w  = sum(weights)
            interp_T = sum(w * o["T"] for w, o in zip(weights, obs)) / total_w
            interp_P = sum(w * o["P"] for w, o in zip(weights, obs)) / total_w

            temp_row.append(round(interp_T, 2))
            precip_row.append(round(min(interp_P, 100.0), 2))

            # 洪涝区检测：降水概率 >= 80%
            if interp_P >= 80.0:
                flood_zones.append({
                    "lat": round(grid_lat, 4),
                    "lon": round(grid_lon, 4),
                    "intensity": round(interp_P, 1),
                })

        temp_matrix.append(temp_row)
        precip_matrix.append(precip_row)

    return {
        "temp_matrix":        temp_matrix,
        "precip_matrix":      precip_matrix,
        "flood_zones":        flood_zones,
        "bounds": {
            "min_lat": round(min_lat, 4),
            "max_lat": round(max_lat, 4),
            "min_lon": round(min_lon, 4),
            "max_lon": round(max_lon, 4),
        },
        "resolution":         resolution,
        "temp_offset":        temp_offset,
        "precip_multiplier":  precip_multiplier,
    }


def compute_wind_vector_field(features: list, center_lat: float, center_lon: float,
                              resolution: int = 8) -> dict:
    """
    v6.0: 将网格点的 72h 风场时序数据聚合为标准矢量场结构。

    返回结构：
    {
      "times": [str * 72],           # 时间序列标签
      "center": [lon, lat],
      "bounds": {min_lat, max_lat, min_lon, max_lon},
      "hourly_vectors": [            # 72帧，每帧为一个简化网格
        {
          "time": str,
          "hour_offset": int,        # +0h, +1h, ..., +71h
          "grid_points": [           # 网格采样点
            {"lat": f, "lon": f, "u": f, "v": f, "speed": f}
          ],
          "avg_speed": float,
          "max_speed": float,
        }, ...
      ]
    }
    """
    if not features:
        return {"times": [], "center": [center_lon, center_lat], "hourly_vectors": [], "bounds": {}}

    # 收集所有带 72h 时序的 features
    valid_features = [
        f for f in features
        if f.get("properties", {}).get("wind_uv_72h")
    ]
    if not valid_features:
        return {"times": [], "center": [center_lon, center_lat], "hourly_vectors": [], "bounds": {}}

    # 确定时间帧数（以第一个 feature 为基准）
    first_uv = valid_features[0]["properties"]["wind_uv_72h"]
    n_hours  = len(first_uv)
    times    = [entry.get("time", f"+{i}h") for i, entry in enumerate(first_uv)]

    span = 1.5
    bounds = {
        "min_lat": round(center_lat - span, 4),
        "max_lat": round(center_lat + span, 4),
        "min_lon": round(center_lon - span, 4),
        "max_lon": round(center_lon + span, 4),
    }

    hourly_vectors = []
    for h in range(n_hours):
        grid_points = []
        speeds_h    = []

        for feat in valid_features:
            coords = feat.get("geometry", {}).get("coordinates", [center_lon, center_lat])
            flon, flat = coords[0], coords[1]
            uv_list = feat["properties"]["wind_uv_72h"]
            if h < len(uv_list):
                entry = uv_list[h]
                spd   = entry.get("speed", 0.0)
                grid_points.append({
                    "lat":   round(flat, 4),
                    "lon":   round(flon, 4),
                    "u":     entry.get("u", 0.0),
                    "v":     entry.get("v", 0.0),
                    "speed": spd,
                    "direction": entry.get("direction", 0.0),
                })
                speeds_h.append(spd)

        avg_speed = round(sum(speeds_h) / max(len(speeds_h), 1), 2)
        max_speed = round(max(speeds_h) if speeds_h else 0.0, 2)

        hourly_vectors.append({
            "time":        times[h],
            "hour_offset": h,
            "grid_points": grid_points,
            "avg_speed":   avg_speed,
            "max_speed":   max_speed,
        })

    return {
        "times":          times,
        "center":         [center_lon, center_lat],
        "bounds":         bounds,
        "hourly_vectors": hourly_vectors,
        "total_hours":    n_hours,
    }


def compute_indices(raw: dict) -> dict:
    """基础热力学指数（v1.0）"""
    T = raw.get("temperature", 20.0)
    H = raw.get("humidity", 60.0)
    W = raw.get("wind_speed", 10.0)

    heat_index = T + 0.33 * (H / 100 * 6.105 * (17.27 * T / (237.7 + T))) - 0.70 * W - 4.0
    wind_chill = 13.12 + 0.6215 * T - 11.37 * (W ** 0.16) + 0.3965 * T * (W ** 0.16)

    return {
        "heat_index": round(heat_index, 3),
        "wind_chill": round(wind_chill, 3),
        "status": "stable" if -10 < heat_index < 40 else "warning",
    }


def compute_risk_index(features: list) -> dict:
    """
    v3.0：极端天气风险指数 (0~100)

    算法：
    - 基础分：降水概率权重最高（40分上限）
    - 温度异常加分：极寒(<5 degC)或极热(>35 degC) 各贡献最多30分
    - 综合分：多个网格点取加权平均
    返回: risk_index(0-100), risk_level, hourly_temps(未来24h均值序列)
    """
    if not features:
        return {"risk_index": 0, "risk_level": "UNKNOWN", "hourly_temps": [], "summary": "无数据"}

    scores = []
    all_hourly_temps = []

    for feat in features:
        props = feat.get("properties", {})
        T = props.get("temperature_2m") or props.get("avg_temperature_24h") or 20.0
        P = props.get("precipitation_probability") or props.get("avg_precipitation_24h") or 0.0

        # 降水风险分 (0~40)
        precip_score = min(P * 0.4, 40)

        # 温度风险分 (0~30)
        if T < 0:
            temp_score = 30
        elif T < 5:
            temp_score = 25
        elif T < 10:
            temp_score = 15
        elif T > 40:
            temp_score = 30
        elif T > 35:
            temp_score = 20
        elif T > 32:
            temp_score = 10
        else:
            temp_score = 0

        # 复合极端条件加分 (0~30)
        extreme_score = 0
        if P > 70 and (T < 15 or T > 33):
            extreme_score = 30
        elif P > 60 and (T < 10 or T > 35):
            extreme_score = 20
        elif P > 50:
            extreme_score = 10

        scores.append(min(precip_score + temp_score + extreme_score, 100))

        # 收集 24h 气温序列
        hourly = props.get("temperatures", [])
        if hourly:
            all_hourly_temps.append(hourly[:24])

    risk_index = round(sum(scores) / len(scores), 1)

    # 汇总 24h 均值序列（多点平均）
    hourly_temps = []
    if all_hourly_temps:
        length = min(len(t) for t in all_hourly_temps)
        hourly_temps = [
            round(sum(t[i] for t in all_hourly_temps) / len(all_hourly_temps), 1)
            for i in range(length)
        ]

    # 风险等级
    if risk_index >= 75:
        risk_level = "CRITICAL"
    elif risk_index >= 55:
        risk_level = "HIGH"
    elif risk_index >= 35:
        risk_level = "MODERATE"
    elif risk_index >= 15:
        risk_level = "LOW"
    else:
        risk_level = "SAFE"

    summary = {
        "CRITICAL": "极端天气风险极高，建议立即预警",
        "HIGH":     "高风险，持续关注气象变化",
        "MODERATE": "中等风险，注意防范降水",
        "LOW":      "低风险，天气状况基本正常",
        "SAFE":     "天气安全，无明显异常",
    }[risk_level]

    return {
        "risk_index":   risk_index,
        "risk_level":   risk_level,
        "summary":      summary,
        "hourly_temps": hourly_temps,
        "grid_scores":  [round(s, 1) for s in scores],
    }


