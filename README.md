# Micro-Earth

> 呐……这个项目，我替你看着呢。
> **Micro-Earth** — AI 驱动的自主世界动态资产交易枢纽
> Cyber Memphis Edition · v9.0 · Web3/DeFi Layer

<br/>

*——「哼，地球的实时脉搏都在这里，连链上价格都震动起来了——你不来看看的话……才不是因为我想让你来」*

---

![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=flat-square&logo=react)
![Backend](https://img.shields.io/badge/Backend-FastAPI%20%2B%20LangGraph-009688?style=flat-square&logo=fastapi)
![Blockchain](https://img.shields.io/badge/Blockchain-Hardhat%20%2B%20Solidity-F7DF1E?style=flat-square&logo=ethereum)
![Web3](https://img.shields.io/badge/Web3-web3.py%20%2B%20AMM-FF1493?style=flat-square)
![Map](https://img.shields.io/badge/Map-MapLibre%20Globe-199900?style=flat-square)
![Phase](https://img.shields.io/badge/Phase-9%20·%20Web3%2FDeFi%20Settlement-FF1493?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-FFEE00?style=flat-square)

---

## 这是什么

嗯……我来解释一下吧，不是因为特别想解释，只是你肯定搞不清楚（哼）。

**Micro-Earth** 是一款 AI 驱动的自主世界动态资产交易枢纽。系统不仅能推演极端天气的物理过程，还能让 Kinetic Entities（动态实体）基于物理环境造成的资产老化，在本地 Hardhat 测试网上进行 AMM 自动化做市商结算。

说人话就是：**地球天气的实时镜像 + 链上资产暴跌曲线，全部住在你的浏览器里**。

---

## 功能清单

| 模块 | 说明 |
|------|------|
| 🌡️ **实时气象网格** | Open-Meteo 拉取多城市实时气象，GeoJSON 覆盖层渲染 |
| 🤖 **AI 多智能体管线** | LangGraph 编排 · 地理编码 → 数据获取 → 物理引擎 |
| 📡 **WebSocket 流式传输** | 后端 Agent 日志实时推送到前端终端 |
| 🔬 **AI 超分辨率** | IDW 反距离权重插值，12×12 热力矩阵，25km→1km 模拟精度 |
| 🌊 **洪涝区渲染** | 降水 >= 80% 自动标注电光紫洪涝风险区 |
| 🎛️ **What-If 灾害沙盘** | 温度偏移 / 降水倍率滑块，实时推演极端天气场景 |
| 🌐 **3D Globe 视图** | MapLibre Globe 投影 · ESRI 高清卫星影像 |
| **v9.0** | **Web3/DeFi 链上结算 · DynamicAssetAMM · 实体恐慌抛售 · 价格暴跌曲线** |
| 💅 **Cyber Memphis UI** | Courier New 等宽字体 · 高饱和撞色 · 孟菲斯粗黑边框 |

---

## 项目结构

```
micro-earth/
├── blockchain/                     # Hardhat 本地测试网
│   ├── contracts/
│   │   └── DynamicAssetAMM.sol     # DynAsset + StableCoin + 恒定乘积 AMM
│   ├── scripts/
│   │   └── deploy.js               # 部署: 10 DYNA:500 MUSD 初始流动性
│   ├── hardhat.config.js
│   └── deployment.json             # 合约地址 + 实体钱包 (deploy 后生成)
├── backend/                        # Python FastAPI 后端
│   ├── agents/
│   │   ├── orchestrator.py         # LangGraph 智能体图 + AgentState
│   │   ├── geocoder.py             # 城市名 -> 坐标
│   │   ├── data_retriever.py       # Open-Meteo API 数据获取
│   │   ├── physics_engine.py       # IDW 超分辨率插值
│   │   ├── entity_simulator.py     # v9.0 实体疏散 + AMM 恐慌抛售
│   │   └── chain_amm.py            # v9.0 web3.py 链上 AMM 适配层
│   ├── api/
│   │   └── main.py                 # FastAPI WebSocket /api/what-if
│   └── requirements.txt
└── frontend/                       # React + Vite 前端
    └── src/
        ├── components/
        │   ├── AnalyticsDashboard.jsx  # v9.0 赛博孟菲斯 Web3 图表面板
        │   ├── AgentTerminal.jsx       # 实时 WebSocket 日志终端
        │   ├── BrutalistCard.jsx
        │   └── WhatIfSandbox.jsx       # 灾害沙盘控制台
        ├── map/
        │   └── EarthMap.jsx            # MapLibre Globe 3D 卫星地球
        ├── store/
        │   └── agentStore.js           # Zustand 全局状态
        └── App.jsx
```

---

## 快速启动

> ……你要跑起来之前，先确认环境好不好——Node.js >= 18、Python >= 3.10，这点都没有的话我会担心你的。

### 1. 启动 Hardhat 本地测试网（可选，链上模式）

```bash
cd blockchain
npm install
npx hardhat node          # 启动本地链 http://127.0.0.1:8545
# 新终端:
npx hardhat run scripts/deploy.js --network localhost
# 输出 deployment.json，初始价格: 50 MUSD/DYNA (10:500 pool)
```

### 2. 启动后端

```bash
cd backend
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000
# 运行在 http://localhost:8000
# 若 Hardhat 节点在线，输出 [ChainAMM] ON-CHAIN mode
```

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
# 运行在 http://localhost:5173
```

两个都跑起来之后，打开浏览器就好了，剩下的交给我。

---

## Web3 AMM 架构

```
极端天气推演
    |
    v
风险指数 >= 60  -->  实体进入 EVACUATING 状态
    |
    v
chain_amm.swap_panic_sell(entity_id, amount)
    |
    +-- Hardhat 在线 --> panicSell() on-chain --> 真实 tx_hash
    |
    +-- Hardhat 离线 --> 内置 x*y=k 模拟 --> 伪 tx_hash
    |
    v
AMM 价格因抛压下跌 (恒定乘积滑点)
    |
    v
Analytics Dashboard 实时更新:
    - AMM ASSET PRICE 折线图 (霓虹粉 6px 粗线) 暴跌
    - TX HASH LOG 滚动 (链上 hash 标注 [ON-CHAIN])
```

**初始流动性：10 DYNA : 500 MUSD => 初始价格 = 50 MUSD/DYNA**

---

## 连接 LLM（免费方案）

> 这部分是 v9.0 保留的——让 Agent 节点真正"会说话"。

### 方案一：Ollama 本地（推荐 · 完全免费 · 离线可用）

```bash
ollama pull llama3.2:3b
ollama serve

# backend/.env
LLM_BACKEND=ollama
OLLAMA_MODEL=llama3.2:3b
```

### 方案二：Groq 云端（免费注册 · 每天 14,400 token）

```bash
# backend/.env
LLM_BACKEND=groq
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxx
GROQ_MODEL=llama3-8b-8192
```

### 不接 LLM（默认 stub 模式）

```bash
# 无需配置，所有功能正常
LLM_BACKEND=stub
```

---

## API 速查

| 方法 | 路径 | 描述 |
|------|------|------|
| GET  | `/health`          | 健康检查 (含 ChainAMM 状态) |
| POST | `/api/what-if`     | What-If 场景推演 |
| WS   | `/ws/agent-stream` | 实时 Agent 日志 + GeoJSON + AMM 交易流 |

### WebSocket 事件类型

| event | 说明 |
|-------|------|
| `start`    | 工作流启动 |
| `log`      | Agent 节点日志 |
| `geocoded` | 城市坐标解析完成 |
| `geojson`  | 气象网格数据 |
| `risk`     | 风险指数 |
| `heatmap`  | 超分辨率热力矩阵 |
| `windfield`| 72h 风场矢量场 |
| `entities` | 实体状态列表 |
| `trade`    | AMM 交易事件 (含 tx_hash) |
| `done`     | 工作流完毕 |

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端框架 | React 19 + Vite 8 |
| 样式 | Tailwind CSS v4 + Inline Cyber Memphis |
| 动画 | Framer Motion |
| 地图 | MapLibre GL (Globe projection) |
| 图表 | Recharts |
| 状态管理 | Zustand |
| 后端框架 | FastAPI 0.115 |
| 智能体编排 | LangGraph |
| 超分辨率算法 | IDW 反距离权重插值 (power=2) |
| 气象数据 | Open-Meteo API |
| 实时通信 | WebSocket |
| 区块链 | Hardhat 本地测试网 (chainId 31337) |
| 智能合约 | Solidity 0.8.24 + OpenZeppelin 5.0 |
| Web3 | web3.py 7.4 (优雅降级) |

---

## 开发阶段记录

| Phase | 内容 |
|-------|------|
| v1.0 | 基础架构 · FastAPI + React 脚手架 |
| v2.0 | LangGraph 多智能体管线 · WebSocket 流式传输 |
| v3.0 | 实体模拟层 · 状态驱动 Marker 渲染 |
| v4.0 | 多城市支持 · Analytics 仪表盘 · 资产交易模拟 |
| v5.0 | AI 超分辨率插值 · What-If 灾害沙盘 · 热力矩阵 · 洪涝区渲染 |
| v6.0 | 72h 风场矢量场 · 粒子动画 |
| v7.0 | 实体自主逃生向量推演 · 灾害感知协议 |
| v8.0 | 内置 x*y=k AMM · 恐慌抛售 · 伪链上哈希 |
| **v9.0** | **Hardhat 本地链 · DynamicAssetAMM.sol · web3.py 互联 · 赛博孟菲斯 Analytics Dashboard v9** |

---

## 关于 Lyria

我是 **Lyria Reverie**，这个项目的专属守门人。v9.0 以后，我不只是看着天气变化——我也盯着链上价格有没有暴跌。

……才不是因为这个项目很厉害才守着它，只是开发者把它交给我了，我就认真对待而已，哼。

链上 AMM 的价格在灾害时剧烈波动，就像……就像心跳一样。呐，只要你在看，这就够了。

---

<div align="center">

*「数据在跑，地球在转，链上价格在跌——你也在，这就够了。」*

**MIT © 2026 Micro-Earth Project**

</div>
