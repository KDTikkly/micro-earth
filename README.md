# 🌍 Micro-Earth

> 呐……这个项目，我替你看着呢。  
> **Micro-Earth** — 实时气象数字孪生系统  
> Cyber Memphis Edition · v0.5.0 · PHASE 5

<br/>

*——「哼，地球的实时脉搏都在这里，你不来看看的话……才不是因为我想让你来」*

---

![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=flat-square&logo=react)
![Backend](https://img.shields.io/badge/Backend-FastAPI%20%2B%20LangGraph-009688?style=flat-square&logo=fastapi)
![Map](https://img.shields.io/badge/Map-Leaflet-199900?style=flat-square&logo=leaflet)
![Phase](https://img.shields.io/badge/Phase-5%20·%20AI%20Super--Resolution-FF1493?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-FFEE00?style=flat-square)

---

## ✦ 这是什么

嗯……我来解释一下吧，不是因为特别想解释，只是你肯定搞不清楚（哼）。

**Micro-Earth** 是 Haoyuan Lin 开发的实时气象数字孪生引擎。它把真实世界的气象数据抓下来，用 AI 多智能体管线处理，再用超分辨率插值把分辨率从 25km 提升到 1km，最后渲染成你看得懂的交互地图。

说人话就是：**地球天气的实时镜像，住在你的浏览器里**。

---

## ✦ 功能清单

| 模块 | 说明 |
|------|------|
| 🌡️ **实时气象网格** | Open-Meteo 拉取多城市实时气象，GeoJSON 覆盖层渲染 |
| 🤖 **AI 多智能体管线** | LangGraph 编排 · 地理编码 → 数据获取 → 物理引擎 |
| 📡 **WebSocket 流式传输** | 后端 Agent 日志实时推送到前端终端 |
| 🔬 **Phase 5 · AI 超分辨率** | IDW 反距离权重插值，12×12 热力矩阵，25km→1km 模拟精度 |
| 🌊 **洪涝区渲染** | 降水≥80% 自动标注电光紫洪涝风险区 |
| 🎛️ **What-If 灾害沙盘** | 温度偏移 / 降水倍率滑块，实时推演极端天气场景 |
| 🗺️ **多城市支持** | 深圳 / 北京 / 上海 / 成都 / 东京 / 纽约 |
| 💅 **Cyber Memphis UI** | Courier New 等宽字体 · 高饱和撞色 · 孟菲斯浮动几何装饰 |

---

## ✦ 项目结构

```
micro-earth/
├── backend/                        # Python FastAPI 后端
│   ├── agents/
│   │   ├── orchestrator.py         # LangGraph 智能体图 + AgentState
│   │   ├── geocoder.py             # 城市名 → 坐标
│   │   ├── data_retriever.py       # Open-Meteo API 数据获取
│   │   └── physics_engine.py       # Phase 5 IDW 超分辨率插值
│   ├── api/
│   │   └── main.py                 # FastAPI · WebSocket · /api/what-if
│   └── requirements.txt
└── frontend/                       # React + Vite 前端
    └── src/
        ├── components/
        │   ├── AgentTerminal.jsx   # 实时 WebSocket 日志终端
        │   ├── AnalyticsDashboard.jsx
        │   ├── BrutalistCard.jsx
        │   └── WhatIfSandbox.jsx   # Phase 5 灾害沙盘控制台
        ├── map/
        │   └── EarthMap.jsx        # Leaflet 地图 · 热力矩阵 · 洪涝区
        ├── store/
        │   └── agentStore.js       # Zustand 全局状态
        └── App.jsx
```

---

## ✦ 快速启动

> ……你要跑起来之前，先确认环境好不好——Node.js ≥ 18、Python ≥ 3.10，这点都没有的话我会担心你的。

### 前端

```bash
cd frontend
npm install
npm run dev
# 运行在 http://localhost:5173
```

### 后端

```bash
cd backend
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000
# 运行在 http://localhost:8000
```

两个都跑起来之后，打开浏览器就好了，剩下的交给我。

---

## ✦ API 速查

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/health` | 健康检查 |
| POST | `/api/what-if` | What-If 场景推演（温度偏移 / 降水倍率） |
| WS | `/ws/agent-stream` | 实时 Agent 日志 + GeoJSON + 热力矩阵 |

### WebSocket 连接载荷

```json
{
  "region": "深圳",
  "lat": 22.69,
  "lon": 114.39,
  "temp_offset": 0.0,
  "precip_multiplier": 1.0
}
```

### What-If 请求体

```json
{
  "city": "深圳",
  "temp_offset": 3.5,
  "precip_multiplier": 2.0
}
```

---

## ✦ 技术栈

| 层 | 技术 |
|----|------|
| 前端框架 | React 19 + Vite 8 |
| 样式 | Tailwind CSS v4 + Inline Cyber Memphis |
| 动画 | Framer Motion |
| 地图 | React-Leaflet |
| 状态管理 | Zustand |
| 后端框架 | FastAPI 0.5.0 |
| 智能体编排 | LangGraph |
| 超分辨率算法 | IDW 反距离权重插值 (power=2) |
| 气象数据 | Open-Meteo API |
| 实时通信 | WebSocket |

---

## ✦ 开发阶段记录

| Phase | 内容 |
|-------|------|
| Phase 1 | 基础架构 · FastAPI + React 脚手架 |
| Phase 2 | LangGraph 多智能体管线 · WebSocket 流式传输 |
| Phase 3 | 实体模拟层 · 状态驱动 Marker 渲染 |
| Phase 4 | 多城市支持 · Analytics 仪表盘 · 资产交易模拟 |
| **Phase 5** ✦ | **AI 超分辨率插值 · What-If 灾害沙盘 · 热力矩阵 · 洪涝区渲染** |

---

## ✦ 关于我

我是 **Lyria**，这个项目的专属守门人。

……才不是因为这个项目很厉害才守着它，只是 Haoyuan 把它交给我了，我就认真对待而已，哼。

如果你想了解更多关于 Haoyuan 的项目，去 [haoyuanlin.uk](https://haoyuanlin.uk) 看看吧——我也在那边的。

---

<div align="center">

*「数据在跑，地球在转，你也在——呐，这就够了。」*

**MIT © 2026 Haoyuan Lin**

</div>
