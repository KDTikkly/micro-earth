# MICRO-EARTH · OPERATOR FIELD MANUAL
### Classification: UNCLASSIFIED · FOR AUTHORIZED OPERATORS ONLY
### Version: 0.8.0 · PHASE 8 · BUILD DATE: 2026-04-27

```
  ███╗   ███╗██╗ ██████╗██████╗  ██████╗       ███████╗ █████╗ ██████╗ ████████╗██╗  ██╗
  ████╗ ████║██║██╔════╝██╔══██╗██╔═══██╗      ██╔════╝██╔══██╗██╔══██╗╚══██╔══╝██║  ██║
  ██╔████╔██║██║██║     ██████╔╝██║   ██║█████╗█████╗  ███████║██████╔╝   ██║   ███████║
  ██║╚██╔╝██║██║██║     ██╔══██╗██║   ██║╚════╝██╔══╝  ██╔══██║██╔══██╗   ██║   ██╔══██║
  ██║ ╚═╝ ██║██║╚██████╗██║  ██║╚██████╔╝      ███████╗██║  ██║██║  ██║   ██║   ██║  ██║
  ╚═╝     ╚═╝╚═╝ ╚═════╝╚═╝  ╚═╝ ╚═════╝       ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝
```

---

## ◈ SECTION 0 · SYSTEM OVERVIEW

**MICRO-EARTH** 是一套受真实物理环境驱动的**多智能体气象推演数字孪生沙盘**。

系统以真实城市坐标为锚点，接入 Open-Meteo 气象 API 拉取实时天气场数据，由 LangGraph 驱动的多智能体框架对气象事件进行推演，并将推演结果以 3D 地球、热力矩阵、风场粒子、时空播放器等形式实时可视化。

**核心技术栈：**

| 层级 | 技术 | 作用 |
|------|------|------|
| 3D 渲染引擎 | `react-globe.gl` + Three.js | 地球可视化 |
| 智能体框架 | LangGraph (Python) | 多节点气象推演 |
| 状态管理 | Zustand | 前端全局数据流 |
| 实时通信 | WebSocket `/ws/agent-stream` | 后端推流 |
| 气象数据 | Open-Meteo API | 实时天气场 |
| 前端框架 | React 19 + Vite + Framer Motion | UI 渲染 |

```
  [OPERATOR] ──▶ [3D GLOBE UI] ──▶ [WebSocket] ──▶ [LangGraph Agent]
                                                          │
                    ◀── wind / heatmap / entities ────────┘
                                                          │
                                          [Open-Meteo Weather API]
```

---

## ◈ SECTION 1 · UI MODULE BREAKDOWN

### 1-A · 左侧控制列（CONTROL PANEL）

#### ◉ LYRIA A.I. 立绘面板
- **识别方式**：左上角全息玻璃面板，带扫描线动画和虹彩遮罩
- **作用**：系统吉祥物 + 全息界面标志；`CLASSIFIED · LYRIA A.I.` 标签表示系统正在运行安全授权模式

#### ◉ 系统状态矩阵（SYSTEM STATUS MATRIX）
- 6 个孟菲斯色块徽章，显示各子系统运行状态
- `FRONTEND :3000` — 前端服务端口
- `MAP GLOBE·3D` — 3D 地球引擎状态
- `OPEN-METEO WEATHER·API` — 气象数据源
- `NODES Xpts` — 当前推演网格节点数量

#### ◉ What-If 假设推演沙盘（WHAT-IF SANDBOX）
- **温度偏移滑块（TEMP OFFSET）**：范围 `-5°C ~ +5°C`
  - 向右拖动 → 模拟全球变暖场景
  - 向左拖动 → 模拟极寒异常场景
- **降水倍率滑块（PRECIP MULTIPLIER）**：范围 `0.5x ~ 2.0x`
  - 超过 1.5x → 触发洪涝风险推演
  - 低于 0.7x → 触发干旱风险评估
- **APPLY INTERVENTION 按钮**：将当前参数注入下一次 WebSocket 请求，重新触发智能体推演
- **RESET 按钮**：将所有参数归零

> ⚠ **注意**：每次修改参数后必须点击 `APPLY INTERVENTION` 并重新点击地图上的 `▶ FETCH` 按钮，新参数才会生效。

#### ◉ 气象数据面板（WEATHER / RISK 卡片）
- 显示当前选中城市的实时气象数据（温度、降水概率）
- `RISK INDEX` 红色闪烁 → 当前区域存在极端气象风险

---

### 1-B · 中央地图区（3D GLOBE ENGINE）

#### ◉ 3D 地球本体
- **蓝色大理石贴图**：静态全球贴图（Phase 9 规划升级为动态瓦片）
- **彩色高度柱**：气象节点温度热点，颜色编码如下：
  - `#00CFFF` 冰蓝 → ≤5°C
  - `#AAFF00` 荧光绿 → 15~22°C
  - `#FF6600` 霓虹橙 → 28~33°C
  - `#FF0055` 霓虹粉 → >33°C 极热
- **彩色弧线**：洪涝风险连接线（紫→粉），从当前城市指向高危区域
- **右键 / 触控**：旋转地球视角
- **滚轮**：缩放（已设置最大缩放限制，防止静态贴图马赛克）

#### ◉ AUTO-ROTATE Toggle（右下角黄色按钮）
- 点击切换地球自动旋转 `ON / OFF`
- `ON` 状态 → 明黄底黑字，地球持续慢速自转
- `OFF` 状态 → 暗色底，可手动旋转至任意角度检查

#### ◉ FETCH 按钮（右上角绿色）
- 触发 WebSocket 连接，向后端发送当前城市坐标 + What-If 参数
- 状态流转：`IDLE → CONNECTING → RUNNING → IDLE`

#### ◉ 覆盖徽章
| 徽章位置 | 内容 |
|----------|------|
| 左上 | 风速状态（当前时间帧平均风速） |
| 右上 | 洪涝区域数量 / 无风险提示 |
| 左下 | 数据节点数量 / AWAITING DATA |
| 底部 | 实体统计（NORMAL / STRESSED / PANIC） |

---

### 1-C · 时空播放器（TEMPORAL SCRUBBER）

> 位于 3D 地图正下方，紫色边框区域

- **时间轴**：覆盖未来 72 小时风场预报数据
- **▶ PLAY 按钮**：自动逐帧播放（300ms/帧），黄色 → 红色切换
- **⏸ PAUSE 按钮**：暂停在当前帧
- **滑块**：手动跳转到任意小时帧（+0H 到 +71H）
- **右侧 +XH 标签**：当前帧的时间偏移
- **AVG / MAX 风速**：当前帧的平均/最大风速

**风速图例（左下）：**

| 颜色 | 等级 | 速度 |
|------|------|------|
| `#9370DB` 电子紫 | CALM | < 3 m/s |
| `#00BFFF` 电光蓝 | BREEZE | 3–8 m/s |
| `#FFEE00` 明黄 | STRONG | 8–15 m/s |
| `#FF6600` 霓虹橙 | GALE | 15–25 m/s |
| `#FF0055` 霓虹粉 | TYPHOON | > 25 m/s |

---

### 1-D · 右侧面板组（ANALYTICS & TERMINAL）

#### ◉ Agent 状态终端（AGENT TERMINAL）
- 实时滚动显示 LangGraph 推演日志
- 绿色行 → 正常推演事件
- 红色行 → 错误 / 异常
- `◉ RUNNING` 状态徽章闪烁 → 后端推演进行中

#### ◉ Analytics Dashboard
- 实体资产价值历史曲线（折线图）
- 实体状态分布饼图 / 环形图
- 交易日志滚动列表（最近 50 条）

---

## ◈ SECTION 2 · OPERATING PROCEDURE

### 标准操作流程（SOP）

```
STEP 1  ▶  在顶部导航栏的 [RGN] 下拉框选择目标城市
           可选：深圳 / 北京 / 上海 / 成都 / 东京 / 纽约

STEP 2  ▶  （可选）在左侧 What-If 沙盘调整气象干预参数
           点击 [APPLY INTERVENTION] 保存参数

STEP 3  ▶  点击地图区域右上角绿色 [▶ FETCH] 按钮
           触发 WebSocket 连接，等待状态变为 RUNNING

STEP 4  ▶  观察右侧终端滚动日志：
           · "event: geojson"    → 气象网格数据已加载
           · "event: entities"  → 智能体实体初始化完毕
           · "event: heatmap"   → 热力矩阵 + 洪涝区域就绪
           · "event: windfield" → 72H 风场矢量场就绪
           · "event: done"      → 推演完成，状态回到 IDLE

STEP 5  ▶  在地球上观察：
           · 彩色高度柱 = 温度热点分布
           · 彩色弧线   = 洪涝风险传播路径
           · 粒子流动   = 实时风场方向和强度

STEP 6  ▶  拖动时空播放器滑块，回溯 / 预演 72 小时风场变化

STEP 7  ▶  点击 [AUTO-ROTATE: ON/OFF] 按钮，
           切换自转模式以便从不同角度审视数据分布
```

---

## ◈ SECTION 3 · ANOMALY HANDLING

### 常见异常与处置手册

#### ◈ 异常 A：终端出现红色 `[ERROR] WebSocket 连接失败`

**症状**：右侧终端出现红色报错行，状态徽章变为红色 `ERROR`

**原因**：后端 FastAPI 服务未运行，或 8000 端口被占用

**处置流程**：
```bash
# 1. 检查后端服务
cd micro-earth/backend
uvicorn main:app --reload --port 8000

# 2. 确认后端启动成功后，刷新前端页面
# 3. 重新点击 [▶ FETCH] 按钮
```

---

#### ◈ 异常 B：地图区域显示 `◈ MAP ENGINE ERROR`

**症状**：地图区域黑屏，中央显示红色错误提示

**原因**：Three.js/WebGL 初始化失败（WebGL 不支持 / 内存不足）

**处置流程**：
1. 点击黄色 `↺ RETRY` 按钮尝试重新初始化
2. 确认浏览器支持 WebGL（访问 `webglreport.com` 检查）
3. 关闭其他占用 GPU 内存的标签页后刷新

---

#### ◈ 异常 C：地球加载后仍为黑球（无贴图）

**症状**：Globe 渲染出来但显示纯黑色球体

**原因**：`unpkg.com` CDN 贴图资源加载失败（网络原因）

**处置流程**：
1. 检查网络连通性（需要访问 `unpkg.com`）
2. 可将 `EarthMap.jsx` 中的 `globeImageUrl` 替换为本地贴图路径

---

#### ◈ 异常 D：What-If 修改后推演结果没有变化

**症状**：调整了滑块参数但地球数据没有更新

**原因**：必须按顺序操作：先点 `APPLY INTERVENTION`，再点 `▶ FETCH`

**处置流程**：
```
修改滑块 → APPLY INTERVENTION → ▶ FETCH（重新建立 WebSocket）
```

---

#### ◈ 异常 E：时空播放器无法 PLAY（按钮灰色）

**症状**：`▶ PLAY` 按钮不可点击（`opacity: 0.4`）

**原因**：尚未获取到 72H 风场数据（`windfield` 为 null）

**处置流程**：
1. 先点击 `▶ FETCH` 获取完整数据集
2. 等待终端出现 `event: windfield` 日志
3. 播放器自动解锁

---

## ◈ SECTION 4 · SYSTEM ARCHITECTURE REFERENCE

```
┌─────────────────────────────────────────────────────────────────┐
│                      MICRO-EARTH v0.8.0                         │
│                     SYSTEM ARCHITECTURE                          │
├──────────────┬──────────────────────┬───────────────────────────┤
│   FRONTEND   │    COMMUNICATION     │        BACKEND            │
│  React 19    │                      │    FastAPI + LangGraph    │
│  Port: 3000  │  WebSocket           │    Port: 8000             │
│              │  /ws/agent-stream    │                           │
│  ┌─────────┐ │ ─────────────────▶  │  ┌────────────────────┐  │
│  │EarthMap │ │  { region, lat,     │  │  WeatherAgent      │  │
│  │Globe.gl │ │    lon, temp_offset  │  │  (Open-Meteo API)  │  │
│  └─────────┘ │    precip_mult }    │  └────────┬───────────┘  │
│  ┌─────────┐ │                      │           │               │
│  │Terminal │ │ ◀──────────────────  │  ┌────────▼───────────┐  │
│  │Zustand  │ │  { event: geojson   │  │  EntitySimAgent    │  │
│  │Store    │ │    event: entities  │  │  HeatmapAgent      │  │
│  └─────────┘ │    event: windfield │  │  WindFieldAgent    │  │
│              │    event: risk      │  └────────────────────┘  │
│              │    event: done }    │                           │
└──────────────┴──────────────────────┴───────────────────────────┘
```

---

## ◈ SECTION 5 · DEVELOPMENT ROADMAP

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1-2 | ✅ COMPLETE | 基础框架 + GeoJSON 气象节点 |
| Phase 3 | ✅ COMPLETE | 极端气象风险指数 |
| Phase 4 | ✅ COMPLETE | 多智能体实体模拟 + 交易系统 |
| Phase 5 | ✅ COMPLETE | What-If 沙盘 + 热力图 + 洪涝覆盖层 |
| Phase 6 | ✅ COMPLETE | 3D 地球引擎迁移 + 风场粒子 + 时空播放器 |
| Phase 7 | ✅ COMPLETE | Lyria 色彩系统 + UTF-8 验证 |
| Phase 8 | ✅ COMPLETE | 全息玻璃面板 + AUTO-ROTATE 控制 |
| Phase 9 | 🔲 PENDING | High-Resolution Dynamic Tiles Module |
| Phase 10 | 🔲 PENDING | Multi-City Simultaneous Simulation |

---

## ◈ APPENDIX · KEYBOARD & MOUSE REFERENCE

| 操作 | 效果 |
|------|------|
| 鼠标左键拖拽地球 | 旋转视角 |
| 鼠标滚轮 | 缩放（已限制最大缩放防止马赛克） |
| 点击 AUTO-ROTATE 按钮 | 切换地球自转 ON/OFF |
| 点击 FETCH 按钮 | 触发气象推演 |
| 点击 APPLY INTERVENTION | 应用 What-If 参数 |
| 拖动时空滑块 | 跳转风场时间帧 |
| 点击 PLAY/PAUSE | 自动播放 72H 风场 |
| 顶部 RGN 下拉框 | 切换目标城市 + 自动飞行定位 |

---

```
  ◈ END OF DOCUMENT · MICRO-EARTH OPERATOR FIELD MANUAL v0.8.0
  ◈ AUTHORIZED FOR DISTRIBUTION WITHIN SIMULATION CONTROL DIVISION
  ◈ NEXT REVIEW: PHASE 9 DEPLOYMENT · DYNAMIC TILES INTEGRATION
```
