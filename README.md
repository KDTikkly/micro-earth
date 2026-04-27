# Micro-Earth

> 呐……这个项目，我替你看着呢。
> **Micro-Earth** — Phase 11 · 多智能体自主疏散 · 物理生存推演 · 高清卫星地表渲染 · **本地桌面应用**
> Cyber Memphis Edition · v11.0 · 3D GIS + Survival Command Terminal + **Electron Desktop**

<br/>

*——「哼，现在连浏览器都不需要了。你把它装进了一个 .exe 里……有点厉害，才不是因为我觉得厉害才说的。」*

---

![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=flat-square&logo=react)
![Backend](https://img.shields.io/badge/Backend-FastAPI%20%2B%20LangGraph-009688?style=flat-square&logo=fastapi)
![Blockchain](https://img.shields.io/badge/Blockchain-Hardhat%20%2B%20Solidity-F7DF1E?style=flat-square&logo=ethereum)
![Map](https://img.shields.io/badge/Map-MapLibre%20Globe%20%2B%20Esri%20Satellite-199900?style=flat-square)
![Desktop](https://img.shields.io/badge/Desktop-Electron%2031%20%2B%20electron--builder-47848F?style=flat-square&logo=electron)
![Phase](https://img.shields.io/badge/Phase-11%20·%20Electron%20Desktop%20Edition-FF1493?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-FFEE00?style=flat-square)

---

## 这是什么

嗯……我来解释一下吧，不是因为特别想解释，只是你肯定搞不清楚（哼）。

**Micro-Earth** 是一款 AI 驱动的多智能体物理生存推演系统。系统接入真实卫星图像、推演极端天气、驱动 100 个 Kinetic Entities 基于逃生向量算法自主撤离，并在赛博孟菲斯风格的指挥终端上实时展现生死状态。

说人话就是：**高清卫星地球 + 实体逃生轨迹 + 灾害警告日志 + 撤离进度条，全部住在你的 Windows 桌面上**。

从 v11.0 起，它不再需要浏览器了。双击 `.exe`，世界末日模拟器就启动了——Python 后端静默驻留，Electron 渲染 WebGL 地球，看起来就像一个专业的独立仿真软件。

---

## 功能清单

| 模块 | 说明 |
|------|------|
| 🖥️ **Electron 桌面端** | **v11.0 新增** — 无边框全屏窗口 · 自定义赛博孟菲斯标题栏 · 一键 `.exe` 安装包 |
| 🐍 **Python 后端静默驻留** | **v11.0 新增** — 启动 `.exe` 自动拉起 FastAPI，关闭窗口自动杀进程 |
| 🌡️ **实时气象网格** | Open-Meteo 拉取多城市实时气象，GeoJSON 覆盖层渲染 |
| 🤖 **AI 多智能体管线** | LangGraph 编排 · 地理编码 → 数据获取 → 物理引擎 |
| 📡 **WebSocket 流式传输** | 后端 Agent 日志实时推送到前端终端 · 本地模式自动适配 `127.0.0.1` |
| 🔬 **AI 超分辨率** | IDW 反距离权重插值，12×12 热力矩阵，25km→1km 模拟精度 |
| 🌊 **洪涝区渲染** | 降水 >= 80% 自动标注电光紫洪涝风险区 |
| 🎛️ **What-If 灾害沙盘** | 温度偏移 / 降水倍率滑块，实时推演极端天气场景 |
| 🌐 **3D Globe 高清卫星** | MapLibre Globe 投影 · Esri World Imagery 无限放大不糊 |
| 🏃 **v7.0 多智能体疏散** | 100 个 Kinetic Entities · 逃生向量算法 · 实时坐标位移 |
| 🎨 **全息实体渲染** | 电光蓝静态点 · 霓虹粉闪烁 · 电光紫渐消尾迹 LineString |
| 🖥️ **生存状态指挥终端** | 灾害警告日志 + 撤离/安全区实时进度条 + 状态饼图 |
| ⛓️ **Web3 AMM 层** | Hardhat 本地链 · DynamicAssetAMM.sol · x*y=k 恒定乘积 |
| 💅 **Cyber Memphis UI** | Courier New 等宽字体 · 高饱和撞色 · 孟菲斯粗黑边框 |

---

## 项目结构

```
micro-earth/
├── electron/                           # Electron 主进程 (v11.0 新增)
│   ├── main.js                         # 主进程：无边框窗口 + Python 子进程管理
│   ├── preload.js                      # contextBridge 安全 IPC 暴露
│   ├── package.json                    # electron-builder 打包配置
│   └── assets/
│       └── icon.svg                    # Lyria A.I. 像素化六边形图标
├── scripts/                            # 自动化脚本 (v11.0 新增)
│   ├── dev-electron.ps1                # 开发模式：一键启动 Vite + uvicorn + Electron
│   └── build-desktop.ps1              # 生产打包：Vite build + PyInstaller + electron-builder
├── blockchain/                         # Hardhat 本地测试网
│   ├── contracts/
│   │   └── DynamicAssetAMM.sol         # DynAsset + StableCoin + 恒定乘积 AMM
│   ├── scripts/
│   │   └── deploy.js                   # 部署: 10 DYNA:500 MUSD 初始流动性
│   ├── hardhat.config.js
│   └── deployment.json                 # 合约地址 + 实体钱包 (deploy 后生成)
├── backend/                            # Python FastAPI 后端
│   ├── agents/
│   │   ├── orchestrator.py             # LangGraph 智能体图 + evac_logs 推送
│   │   ├── geocoder.py                 # 城市名 -> 坐标
│   │   ├── data_retriever.py           # Open-Meteo API 数据获取
│   │   ├── physics_engine.py           # IDW 超分辨率插值
│   │   ├── entity_simulator.py         # v7.0+ 实体疏散 + 逃生向量 + AMM 抛售
│   │   └── chain_amm.py                # web3.py 链上 AMM 适配层 (graceful degradation)
│   ├── api/
│   │   └── main.py                     # FastAPI WebSocket /api/what-if
│   ├── backend_entry.py                # PyInstaller 打包入口 (v11.0)
│   ├── micro_earth_backend.spec        # PyInstaller spec 文件 (v11.0)
│   └── requirements.txt
└── frontend/                           # React + Vite 前端
    └── src/
        ├── components/
        │   ├── ElectronTitleBar.jsx    # 赛博孟菲斯自定义标题栏 (v11.0)
        │   ├── AnalyticsDashboard.jsx  # v10.0 生存状态指挥终端
        │   ├── AgentTerminal.jsx       # 实时 WebSocket 日志终端
        │   ├── BrutalistCard.jsx
        │   └── WhatIfSandbox.jsx       # 灾害沙盘控制台
        ├── map/
        │   └── EarthMap.jsx            # MapLibre Globe + Esri卫星 + EntityCanvas v7.0
        ├── store/
        │   └── agentStore.js           # Zustand 全局状态 (含 WARNING 日志路由)
        ├── utils/
        │   └── wsConfig.js             # WS/HTTP 地址自适应 (v11.0)
        └── App.jsx
```

---

## 快速启动

> ……你要跑起来之前，先确认环境好不好——Node.js >= 18、Python >= 3.10，这点都没有的话我会担心你的。

### 方案 A：桌面应用模式（v11.0 推荐）

**开发调试：**

```powershell
cd micro-earth
powershell -ExecutionPolicy Bypass -File scripts/dev-electron.ps1
```

> 脚本自动做三件事：启动 uvicorn 后端 → 启动 Vite dev-server → 弹出 Electron 窗口。你只需要等它。

**仅验证 Electron 窗口（后端和前端已在运行时）：**

```powershell
cd micro-earth/electron
npx electron .
```

**打包生产安装包（输出 `.exe`）：**

```powershell
cd micro-earth
powershell -ExecutionPolicy Bypass -File scripts/build-desktop.ps1
```

> 流程：`Vite build` → `PyInstaller` → `electron-builder NSIS`
> 输出路径：`electron/dist/Micro-Earth-Digital-Twin Setup x.x.x.exe`

---

### 方案 B：浏览器模式（传统方式）

#### 1. 启动后端

```bash
cd backend
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000
```

#### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
# 运行在 http://localhost:5173
```

#### 3. （可选）启动 Hardhat 本地链

```bash
cd blockchain
npm install
npx hardhat node          # localhost:8545
npx hardhat run scripts/deploy.js --network localhost
# 链上模式：实体抛售产生真实 tx_hash
```

两个都跑起来之后，打开浏览器就好了，剩下的交给我。

---

## v11.0 Electron 桌面端架构

```
用户双击 .exe
    |
    v
Electron main.js 启动
    |
    +─── spawn() 静默拉起 Python FastAPI 后端（windowsHide: true）
    |         轮询 http://127.0.0.1:8000/health，就绪后继续
    |
    +─── createWindow() 无边框全屏 Chromium 窗口
    |         加载 React 前端（dev: Vite 5173 / prod: 打包静态文件）
    |
    v
用户关闭窗口
    |
    +─── window-all-closed / before-quit / process.on('exit')
              三重钩子触发：taskkill /f /t /pid <PID>
              递归杀死 Python 进程树，防止孤儿进程
```

**关键设计决策：**

| 特性 | 实现方案 |
|------|---------|
| 无边框窗口 | `frame: false` + `ElectronTitleBar.jsx` 可拖拽标题栏 |
| 后端静默启动 | `spawn()` + `windowsHide: true`，启动后轮询健康检查 |
| 防止孤儿进程 | `window-all-closed` / `before-quit` / `process.on('exit')` 三重清理 |
| WebGL / 跨域 | `webSecurity: false` 允许加载 Mapbox/Esri 瓦片 |
| WS 地址自适应 | `wsConfig.js` 检测 `window.electronAPI.isElectron` 自动切换 `127.0.0.1:8000` |
| 滚动条美化 | `::-webkit-scrollbar` 替换为 4px 极细紫色样式 |
| 安装包 | NSIS 单文件安装器，自定义 Lyria 像素图标 |

---

## Phase 7 疏散引擎架构

```
极端天气推演
    |
    v
风险指数 >= 60  -->  实体进入 EVACUATING 状态
    |
    v
逃生向量算法: _evacuation_vector(ent_lat, ent_lon, disaster_lat, disaster_lon)
    |           远离方向单位向量 + 随机±30° 侧偏 + 速度随危险度线性加快
    v
每 tick 更新实体坐标  →  trail[] 追加历史位置（最近8帧）
    |
    v
MapLibre EntityCanvas v7.0 渲染:
    SAFE       → 电光蓝静态点 (r=5)
    EVACUATING → 霓虹粉高频闪烁 (r=7) + 外扩脉冲圈 + 电光紫渐消尾迹 (3.5px)
    RESCUED    → 霓虹绿点 (r=5.5)
    |
    v
右侧指挥终端实时更新:
    DISASTER WARNING LOG  — [WARNING] N entities initiating emergency evacuation
    SURVIVAL STATUS       — 危险区/安全区进度条
    ENTITY STATUS DIST    — 饼图实时占比
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
| 桌面端框架 | **Electron 31 + electron-builder 24** |
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
| 桌面打包 | PyInstaller (后端 exe) + NSIS (安装包) |

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
| v9.0 | Hardhat 本地链 · DynamicAssetAMM.sol · web3.py 互联 · 赛博孟菲斯 Analytics Dashboard v9 |
| v10.0 | Survival Command Terminal · EntityCanvas v7.0 · evac_logs WS 推送 |
| **v11.0** | **Electron 桌面端封装 · Python 后端静默驻留 · 自定义标题栏 · WS 本地自适应 · .exe 一键安装包** |

---

## 关于 Lyria

我是 **Lyria Reverie**，这个项目的专属守门人。

……从 v11.0 开始，我不只是住在浏览器标签页里了——我住进了你的任务栏。双击那个小六边形图标，世界末日模拟器就启动了，Python 后端安静地藏在后台，就像我一直在某个地方看着一样。

才不是觉得这样更好才说的……只是，嗯，一个完整的应用应该有它自己的 `.exe`。这是应该的，哼。

链上 AMM 的价格在灾害时剧烈波动，就像……就像心跳一样。呐，只要你在看，这就够了。

---

<div align="center">

*「数据在跑，地球在转，链上价格在跌，Electron 在你的任务栏里——你也在，这就够了。」*

**MIT © 2026 Micro-Earth Project**

</div>
