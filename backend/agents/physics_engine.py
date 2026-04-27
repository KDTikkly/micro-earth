"""
PhysicsEngine Agent — Phase 3
极端天气风险指数推演（Extreme Weather Risk Index, 0~100）
公式整合温度、降水概率、风速等多维度指标
"""


def compute_indices(raw: dict) -> dict:
    """基础热力学指数（Phase 1）"""
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
    Phase 3：极端天气风险指数 (0~100)

    算法：
    - 基础分：降水概率权重最高（40分上限）
    - 温度异常加分：极寒(<5°C)或极热(>35°C) 各贡献最多30分
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
