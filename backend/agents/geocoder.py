"""
Geocoder Agent - v3.0
使用 OpenStreetMap Nominatim 将城市名称转换为经纬度
免费、无需 API Key
"""
# -*- coding: utf-8 -*-
import os as _os; _os.environ.setdefault("PYTHONIOENCODING", "utf-8")
import httpx

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

# 常用城市缓存，防止频繁请求
_CACHE: dict = {}

# 默认 fallback 坐标表（离线保底）
_FALLBACK: dict = {
    "深圳": (22.69, 114.39),
    "shenzhen": (22.69, 114.39),
    "北京": (39.91, 116.39),
    "beijing": (39.91, 116.39),
    "上海": (31.23, 121.47),
    "shanghai": (31.23, 121.47),
    "成都": (30.57, 104.07),
    "chengdu": (30.57, 104.07),
    "东京": (35.68, 139.69),
    "tokyo": (35.68, 139.69),
    "纽约": (40.71, -74.01),
    "new york": (40.71, -74.01),
    "newyork": (40.71, -74.01),
    "london": (51.51, -0.13),
    "伦敦": (51.51, -0.13),
    "paris": (48.86, 2.35),
    "巴黎": (48.86, 2.35),
    "sydney": (-33.87, 151.21),
    "悉尼": (-33.87, 151.21),
    "dubai": (25.20, 55.27),
    "迪拜": (25.20, 55.27),
    "singapore": (1.35, 103.82),
    "新加坡": (1.35, 103.82),
    "moscow": (55.75, 37.62),
    "莫斯科": (55.75, 37.62),
}


async def geocode(city: str) -> tuple[float, float, str]:
    """
    将城市名解析为 (lat, lon, canonical_name)
    优先 Nominatim API，失败则用 fallback 表
    """
    key = city.strip().lower()

    # 命中缓存
    if key in _CACHE:
        return _CACHE[key]

    try:
        async with httpx.AsyncClient(headers={"User-Agent": "MicroEarthBot/3.0"}) as client:
            resp = await client.get(
                NOMINATIM_URL,
                params={"q": city, "format": "json", "limit": 1},
                timeout=8.0,
            )
            resp.raise_for_status()
            results = resp.json()

        if results:
            r = results[0]
            lat = float(r["lat"])
            lon = float(r["lon"])
            name = r.get("display_name", city).split(",")[0].strip()
            _CACHE[key] = (lat, lon, name)
            return lat, lon, name

    except Exception:
        pass

    # Fallback 表
    if key in _FALLBACK:
        lat, lon = _FALLBACK[key]
        _CACHE[key] = (lat, lon, city)
        return lat, lon, city

    # 最终兜底：深圳
    return 22.69, 114.39, city

