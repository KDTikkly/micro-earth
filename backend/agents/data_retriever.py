"""
DataRetriever Agent — Phase 2
使用 httpx 异步请求 Open-Meteo（无需 API Key）
获取深圳未来 24 小时气温 + 降水概率，输出标准 GeoJSON FeatureCollection
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
    """获取单点 24h 气象数据"""
    params = {
        "latitude":  lat,
        "longitude": lon,
        "hourly":    "temperature_2m,precipitation_probability",
        "forecast_days": 1,
        "timezone":  "Asia/Shanghai",
    }
    resp = await client.get(OPEN_METEO_URL, params=params, timeout=15.0)
    resp.raise_for_status()
    return resp.json()


def parse_to_geojson(lat: float, lon: float, data: dict) -> dict:
    """将 Open-Meteo 响应解析为单个 GeoJSON Feature"""
    hourly = data.get("hourly", {})
    temps  = hourly.get("temperature_2m", [])
    precip = hourly.get("precipitation_probability", [])

    # 取未来 24 小时均值
    avg_temp   = round(sum(temps[:24])  / max(len(temps[:24]),  1), 2)
    avg_precip = round(sum(precip[:24]) / max(len(precip[:24]), 1), 2)
    # 当前时刻（第 0 小时）
    cur_temp   = temps[0]  if temps  else None
    cur_precip = precip[0] if precip else None

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
            "times":                       hourly.get("time", [])[:24],
            "temperatures":                temps[:24],
            "precipitations":              precip[:24],
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
