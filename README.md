# 🌍 Micro-Earth

> 呐……这个项目，我替你看着呢。  
> **Micro-Earth** — 实时气象数字孪生系统  
> Cyber Memphis Edition · v0.5.0 · v5.0

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

**Micro-Earth** 是一款实时气象数字孪生引擎。它把真实世界的气象数据抓下来，用 AI 多智能体管线处理，再用超分辨率插值把分辨率从 25km 提升到 1km，最后渲染成你看得懂的交互地图。

说人话就是：**地球天气的实时镜像，住在你的浏览器里**。

---

## ✦ 功能清单

| 模块 | 说明 |
|------|------|
| 🌡️ **实时气象网格** | Open-Meteo 拉取多城市实时气象，GeoJSON 覆盖层渲染 |
| 🤖 **AI 多智能体管线** | LangGraph 编排 · 地理编码 → 数据获取 → 物理引擎 |
| 📡 **WebSocket 流式传输** | 后端 Agent 日志实时推送到前端终端 |
| 🔬 **v5.0 · AI 超分辨率** | IDW 反距离权重插值，12×12 热力矩阵，25km→1km 模拟精度 |
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
│   │   └── physics_engine.py       # v5.0 IDW 超分辨率插值
│   ├── api/
│   │   └── main.py                 # FastAPI · WebSocket · /api/what-if
│   └── requirements.txt
└── frontend/                       # React + Vite 前端
    └── src/
        ├── components/
        │   ├── AgentTerminal.jsx   # 实时 WebSocket 日志终端
        │   ├── AnalyticsDashboard.jsx
        │   ├── BrutalistCard.jsx
        │   └── WhatIfSandbox.jsx   # v5.0 灾害沙盘控制台
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

## ✦ 连接 Agent 与 LLM（免费方案指南）

> 这部分是 v9.0 新增的——让 Agent 节点真正"会说话"，而不只是执行规则。

目前 LangGraph 管线支持 4 种后端，默认是 `stub`（纯规则，无需配置），想接 LLM 只需 3 步。

### 架构说明

```
前端 AgentTerminal
   │  WebSocket ws://localhost:8000/ws/agent-stream
   ↓
FastAPI (api/main.py)
   │  调用
   ↓
LangGraph 编排器 (agents/orchestrator.py)
   ├── Geocoder 节点    → [LLM] 自然语言城市意图解析
   ├── DataRetriever 节点 → [LLM] 气象摘要分析
   ├── PhysicsEngine 节点 → 规则推演（IDW 插值）
   ├── EntitySimulator 节点 → 实体疏散模拟
   └── Finish 节点
          │
          └── agents/llm_adapter.py  ← 统一 LLM 接口层
```

### 方案一：Ollama 本地（推荐 · 完全免费 · 离线可用）

```bash
# 1. 安装 Ollama
#    Windows: https://ollama.com/download
#    Mac:     brew install ollama

# 2. 拉取轻量模型（选一个）
ollama pull llama3.2:3b      # 推荐，4GB 显存，效果好
ollama pull qwen2.5:1.5b     # 低显存，约 1GB
ollama pull tinyllama         # 极低显存，约 640MB

# 3. 启动 Ollama 服务（后台保持运行）
ollama serve

# 4. 在 backend/.env 配置
LLM_BACKEND=ollama
OLLAMA_MODEL=llama3.2:3b

# 5. 重启后端
uvicorn api.main:app --reload --port 8000
```

验证：访问 `http://localhost:8000/health`，`llm.backend` 字段应显示 `ollama`。

---

### 方案二：Groq 云端（推荐 · 免费注册 · 每天 14,400 token）

```bash
# 1. 注册免费账号（无需绑卡）
#    https://console.groq.com → API Keys → Create API Key

# 2. 在 backend/.env 配置
LLM_BACKEND=groq
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxx
GROQ_MODEL=llama3-8b-8192

# 3. 重启后端
uvicorn api.main:app --reload --port 8000
```

Groq 免费模型对比：

| 模型 | 速度 | 质量 | 上下文 |
|------|------|------|--------|
| `llama3-8b-8192` | 极快 | ★★★★ | 8K |
| `llama-3.1-8b-instant` | 最快 | ★★★★ | 128K |
| `gemma2-9b-it` | 快 | ★★★★☆ | 8K |
| `mixtral-8x7b-32768` | 中等 | ★★★★★ | 32K |

---

### 方案三：OpenAI（付费，高质量）

```bash
# backend/.env
LLM_BACKEND=openai
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini   # 最便宜：$0.15/1M tokens
```

---

### 不接 LLM（默认 stub 模式）

无需任何配置，Agent 全程使用规则引擎，所有功能正常运行，日志里不会出现 `[LLM·Lyria]` 摘要行。

```bash
# backend/.env（或不创建 .env，效果相同）
LLM_BACKEND=stub
```

---

### WebSocket 前端接入说明

前端 `AgentTerminal.jsx` 通过 WebSocket 连接后端：

```js
// 连接地址
const ws = new WebSocket("ws://localhost:8000/ws/agent-stream");

// 发送查询参数（onopen 时）
ws.send(JSON.stringify({
  region: "深圳",
  lat: 22.69,
  lon: 114.39,
  city_query: "帮我查一下上海的天气",  // 接了 LLM 后支持自然语言
  temp_offset: 0.0,
  precip_multiplier: 1.0,
}));

// 接收事件流
ws.onmessage = (e) => {
  const data = JSON.parse(e.data);
  // data.event: "start" | "log" | "geocoded" | "geojson"
  //           | "risk"  | "heatmap" | "windfield"
  //           | "entities" | "trade" | "done" | "error"
};
```

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
| v1.0 | 基础架构 · FastAPI + React 脚手架 |
| v2.0 | LangGraph 多智能体管线 · WebSocket 流式传输 |
| v3.0 | 实体模拟层 · 状态驱动 Marker 渲染 |
| v4.0 | 多城市支持 · Analytics 仪表盘 · 资产交易模拟 |
| **v5.0** ✦ | **AI 超分辨率插值 · What-If 灾害沙盘 · 热力矩阵 · 洪涝区渲染** |

---

## ✦ 关于我

我是 **Lyria**，这个项目的专属守门人。

……才不是因为这个项目很厉害才守着它，只是开发者把它交给我了，我就认真对待而已，哼。

---

<div align="center">

*「数据在跑，地球在转，你也在——呐，这就够了。」*

**MIT © 2026 Micro-Earth Project**

</div>

