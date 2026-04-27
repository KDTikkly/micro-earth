"""
DataRetriever Agent — Phase 6
使用 httpx 异步请求 Open-Meteo（无需 API Key）
获取深圳未来 72 小时气温 + 降水概率 + 风速/风向，输出标准 GeoJSON FeatureCollection
"""
# -*- coding: utf-8 -*-
import os as _os; _os.environ.setdefault("PYTHONIOENCODING", "utf-8")
import httpx

# 深圳默认坐标
SHENZHEN_LAT = 22.69
SHENZHEN_LON = 114.39

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

# 在深圳周围生成 3×3 小网格，模拟空间分布（间距 ~0.15°≈15km）
GRID_OFFSETS = [
    (-0.15, -0.15), (-0.15, 0.0), (-0.15, 0.15),
    ( 0.0,  -0.15), ( 0.0,  0.0), ( 0.0,  0.15),
    ( 0.15, -0.15), ( 0.15, 0.0), ( 0.15, 0.15),
]


async def fetch_point(client: httpx.AsyncClient, lat: float, lon: float) -> dict:
    """获取单点 72h 气象数据（含风速/风向）"""
    params = {
        "latitude":  lat,
        "longitude": lon,
        "hourly":    "temperature_2m,precipitation_probability,windspeed_10m,winddirection_10m",
        "forecast_days": 3,
        "timezone":  "Asia/Shanghai",
    }
    resp = await client.get(OPEN_METEO_URL, params=params, timeout=15.0)
    resp.raise_for_status()
    return resp.json()


def parse_to_geojson(lat: float, lon: float, data: dict) -> dict:
    """将 Open-Meteo 响应解析为单个 GeoJSON Feature（含 72h 风场时序）"""
    import math
    hourly    = data.get("hourly", {})
    temps     = hourly.get("temperature_2m", [])
    precip    = hourly.get("precipitation_probability", [])
    wind_spd  = hourly.get("windspeed_10m", [])
    wind_dir  = hourly.get("winddirection_10m", [])

    # 取未来 24 小时均值（兼容旧逻辑）
    avg_temp   = round(sum(temps[:24])  / max(len(temps[:24]),  1), 2)
    avg_precip = round(sum(precip[:24]) / max(len(precip[:24]), 1), 2)
    cur_temp   = temps[0]  if temps  else None
    cur_precip = precip[0] if precip else None

    # 风场矢量：将风速(m/s) + 风向(°) 转换为 U/V 分量
    # 气象风向惯例：0°=北风，90°=东风；U=向东正，V=向北正
    # U = -speed * sin(dir_rad), V = -speed * cos(dir_rad)  (气象→数学坐标系)
    def to_uv(speed, direction):
        if speed is None or direction is None:
            return 0.0, 0.0
        rad = math.radians(direction)
        u = -speed * math.sin(rad)
        v = -speed * math.cos(rad)
        return round(u, 3), round(v, 3)

    wind_uv_72h = []
    for i in range(min(72, len(wind_spd), len(wind_dir))):
        u, v = to_uv(wind_spd[i], wind_dir[i])
        wind_uv_72h.append({
            "time": hourly.get("time", [])[i] if i < len(hourly.get("time", [])) else None,
            "speed":     round(wind_spd[i], 2) if wind_spd[i] is not None else 0.0,
            "direction": round(wind_dir[i], 1) if wind_dir[i] is not None else 0.0,
            "u": u,
            "v": v,
        })

    return {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [lon, lat],
        },
        "properties": {
            "temperature_2m":              cur_temp,
            "precipitation_probability":   cur_precip,
            "avg_temperature_24h":         avg_temp,
            "avg_precipitation_24h":       avg_precip,
            "times":                       hourly.get("time", [])[:72],
            "temperatures":                temps[:72],
            "precipitations":              precip[:72],
            "wind_speeds":                 wind_spd[:72],
            "wind_directions":             wind_dir[:72],
            "wind_uv_72h":                 wind_uv_72h,
        },
    }


async def fetch_shenzhen_geojson(
    lat: float = SHENZHEN_LAT,
    lon: float = SHENZHEN_LON,
) -> dict:
    """
    并发拉取深圳 3×3 网格各点气象数据
    返回标准 GeoJSON FeatureCollection
    """
    import asyncio

    points = [(lat + dlat, lon + dlon) for dlat, dlon in GRID_OFFSETS]

    async with httpx.AsyncClient() as client:
        tasks = [fetch_point(client, p[0], p[1]) for p in points]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    features = []
    for (p_lat, p_lon), result in zip(points, results):
        if isinstance(result, Exception):
            # 网格某点失败时用 Mock 兜底
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [p_lon, p_lat]},
                "properties": {
                    "temperature_2m": 25.0,
                    "precipitation_probability": 10,
                    "error": str(result),
                },
            })
        else:
            features.append(parse_to_geojson(p_lat, p_lon, result))

    return {
        "type": "FeatureCollection",
        "features": features,
        "metadata": {
            "region": "深圳",
            "center": [lon, lat],
            "grid_size": len(features),
            "source": "Open-Meteo (open-meteo.com)",
        },
    }


if __name__ == "__main__":
    import asyncio, json
    result = asyncio.run(fetch_shenzhen_geojson())
    print(json.dumps(result, ensure_ascii=False, indent=2))
