import "./index.css";
import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import BrutalistCard from "./components/BrutalistCard";
import AgentTerminal from "./components/AgentTerminal";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import WhatIfSandbox from "./components/WhatIfSandbox";
import { useAgentStore } from "./store/agentStore";
import lyriaImg from "./assets/lyria-reverie.png";

const EarthMap = lazy(() => import("./map/EarthMap"));

const REGIONS = [
  { label: "深圳", lat: 22.69, lon: 114.39 },
  { label: "北京", lat: 39.91, lon: 116.39 },
  { label: "上海", lat: 31.23, lon: 121.47 },
  { label: "成都", lat: 30.57, lon: 104.07 },
  { label: "东京", lat: 35.68, lon: 139.69 },
  { label: "纽约", lat: 40.71, lon: -74.01 },
];

/* ── Memphis 漂浮 SVG 几何装饰 ── */
function FloatingDecorations() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>

      {/* 电光紫大波浪线 — 顶部横穿 */}
      <motion.div style={{ position: "absolute", top: "3%", left: "-5%" }}
        animate={{ y: [0, -10, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}>
        <svg width="900" height="60" viewBox="0 0 900 60" fill="none">
          <path d="M0,30 C80,5 160,55 240,30 C320,5 400,55 480,30 C560,5 640,55 720,30 C800,5 870,30 900,30"
            stroke="#6200EE" strokeWidth="3.5" fill="none" strokeDasharray="12 6" />
        </svg>
      </motion.div>

      {/* 霓虹粉空心大三角 */}
      <motion.div style={{ position: "absolute", top: "8%", left: "3%" }}
        animate={{ y: [0, -18, 0], rotate: [0, 4, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}>
        <svg width="96" height="84" viewBox="0 0 96 84" fill="none">
          <polygon points="48,4 92,80 4,80" stroke="#FF0055" strokeWidth="3" fill="none" />
        </svg>
      </motion.div>

      {/* 明黄大圆环 */}
      <motion.div style={{ position: "absolute", top: "6%", right: "5%" }}
        animate={{ y: [0, 14, 0], rotate: [0, -6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}>
        <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="42" stroke="#FFEE00" strokeWidth="3.5" fill="none" />
        </svg>
      </motion.div>

      {/* 终端绿小圆环 */}
      <motion.div style={{ position: "absolute", top: "5%", right: "16%" }}
        animate={{ y: [0, -12, 0], rotate: [0, 8, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}>
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
          <circle cx="26" cy="26" r="20" stroke="#00FF00" strokeWidth="2.5" fill="none" />
        </svg>
      </motion.div>

      {/* 电光紫空心菱形 */}
      <motion.div style={{ position: "absolute", top: "52%", left: "1.5%" }}
        animate={{ y: [0, -10, 0], rotate: [45, 60, 45] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}>
        <div style={{ width: 22, height: 22, border: "3px solid #6200EE", transform: "rotate(45deg)" }} />
      </motion.div>

      {/* 霓虹粉实心方块 */}
      <motion.div style={{ position: "absolute", top: "44%", left: "1%" }}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}>
        <div style={{ width: 14, height: 14, background: "#FF0055", border: "2px solid #000" }} />
      </motion.div>

      {/* 明黄实心三角 */}
      <motion.div style={{ position: "absolute", bottom: "16%", right: "2%" }}
        animate={{ y: [0, -14, 0], rotate: [0, -5, 0] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}>
        <svg width="30" height="26" viewBox="0 0 30 26" fill="none">
          <polygon points="15,2 28,24 2,24" fill="#FFEE00" stroke="#000" strokeWidth="2" />
        </svg>
      </motion.div>

      {/* 旋转十字 — 终端绿 */}
      <motion.div style={{ position: "absolute", top: "38%", right: "3%" }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}>
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <line x1="13" y1="0" x2="13" y2="26" stroke="#00FF00" strokeWidth="2.5" />
          <line x1="0" y1="13" x2="26" y2="13" stroke="#00FF00" strokeWidth="2.5" />
        </svg>
      </motion.div>

      {/* 底部霓虹橙波浪 */}
      <motion.div style={{ position: "absolute", bottom: "4%", right: "20%" }}
        animate={{ x: [0, 10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}>
        <svg width="120" height="28" viewBox="0 0 120 28" fill="none">
          <path d="M0,14 C15,2 30,26 45,14 C60,2 75,26 90,14 C105,2 115,14 120,14"
            stroke="#FF6600" strokeWidth="2.5" fill="none" />
        </svg>
      </motion.div>
    </div>
  );
}

/* ── 状态徽章 ── */
function StatusBadge({ status }) {
  const cfg = {
    IDLE:       { bg: "#f5f5f5",  dot: "#aaa",    border: "#000" },
    CONNECTING: { bg: "#FFEE00",  dot: "#FF6600", border: "#000" },
    RUNNING:    { bg: "#00FF00",  dot: "#000",    border: "#000" },
    ERROR:      { bg: "#FF0055",  dot: "#fff",    border: "#000" },
  }[status] ?? { bg: "#f5f5f5", dot: "#aaa", border: "#000" };
  return (
    <span style={{
      background: cfg.bg, color: "#000",
      border: `2.5px solid ${cfg.border}`, boxShadow: "3px 3px 0 0 #000",
      fontFamily: "'Courier New', monospace", fontSize: 11, fontWeight: 900,
      padding: "2px 10px", display: "inline-flex", alignItems: "center", gap: 5, letterSpacing: "0.08em",
    }}>
      <span style={{ color: cfg.dot, fontSize: 13 }}>◉</span>{status}
    </span>
  );
}

export default function App() {
  const { region, lat, lon, setRegion, setCoords, geojsonData, riskData, status } = useAgentStore();

  const handleRegionChange = (e) => {
    const found = REGIONS.find((r) => r.label === e.target.value);
    if (found) { setRegion(found.label); setCoords(found.lat, found.lon); }
  };

  const nodeCount = geojsonData?.features?.length ?? 0;

  // 系统状态色块配置（Memphis高饱和撞色）
  const sysItems = [
    { label: "BACKEND",  val: ":8000",      bg: "#00FF00", color: "#000" },
    { label: "FRONTEND", val: ":3000",      bg: "#00FFFF", color: "#000" },
    { label: "MAP",      val: "LEAFLET",    bg: "#FFEE00", color: "#000" },
    { label: "API",      val: "OPEN-METEO", bg: "#FF0055", color: "#fff" },
    { label: "GRAPH",    val: "LANGGRAPH",  bg: "#6200EE", color: "#fff" },
    { label: "NODES",    val: nodeCount ? `${nodeCount}pts` : "—", bg: "#FF6600", color: "#fff" },
  ];

  return (
    <div style={{
      position: "relative",
      minHeight: "100vh",
      background: "#FDFDFD",
      backgroundImage: "linear-gradient(to right, #e8e8e8 1px, transparent 1px), linear-gradient(to bottom, #e8e8e8 1px, transparent 1px)",
      backgroundSize: "40px 40px",
    }}>
      <FloatingDecorations />

      {/* ── 顶部导航 — 电光紫底 ── */}
      <header style={{
        position: "relative", zIndex: 10,
        background: "#6200EE",
        borderBottom: "3px solid #000",
        boxShadow: "0 4px 0 0 #000",
        padding: "8px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        minHeight: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            background: "#FFEE00", border: "2.5px solid #000", boxShadow: "3px 3px 0 0 #000",
            padding: "4px 14px", fontFamily: "'Courier New', monospace",
            fontWeight: 900, fontSize: 16, letterSpacing: "0.12em", color: "#000",
            whiteSpace: "nowrap",
          }}>MICRO-EARTH</div>
          <span style={{
            fontFamily: "'Courier New', monospace", fontSize: 12, color: "#FFEE00",
            letterSpacing: "0.06em", fontWeight: 700,
            border: "1.5px solid #FFEE00", padding: "1px 6px",
          }}>
            v0.5.0 · PHASE 5
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <StatusBadge status={status} />
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "'Courier New', monospace", fontSize: 13 }}>
            <span style={{ color: "#FFEE00", fontWeight: 900 }}>RGN</span>
            <select value={region} onChange={handleRegionChange} style={{
              background: "#000", border: "2.5px solid #FFEE00", boxShadow: "2px 2px 0 0 #FFEE00",
              fontFamily: "'Courier New', monospace", fontWeight: 900, fontSize: 13,
              padding: "3px 8px", color: "#FFEE00", outline: "none", cursor: "pointer",
            }}>
              {REGIONS.map((r) => <option key={r.label} value={r.label}>{r.label}</option>)}
            </select>
          </div>
          <span style={{ fontFamily: "'Courier New', monospace", fontSize: 12, color: "#C5A3FF", whiteSpace: "nowrap" }}>
            {lat.toFixed(2)}, {lon.toFixed(2)}
          </span>
        </div>
      </header>

      {/* ── 主体网格 ── */}
      <main style={{
        position: "relative", zIndex: 5,
        display: "grid",
        gridTemplateColumns: "260px 1fr 260px 280px",
        gap: 10,
        padding: "12px 16px",
        height: "calc(100vh - 50px - 36px)",
        overflow: "hidden",
      }}>

        {/* 左列：头像 + 标题 + 系统状态 + 气象 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, overflow: "hidden", minWidth: 0 }}>

          {/* 立绘 — 竖向大展示 */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* 立绘框 */}
              <div style={{ position: "relative" }}>
                <div style={{
                  border: "3px solid #000", boxShadow: "6px 6px 0 0 #FF0055",
                  overflow: "hidden", background: "#e8f4fc",
                  width: "100%", height: 200,
                }}>
                  <img src={lyriaImg} alt="LYRIA" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 8%" }} />
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    background: "#FF0055", borderTop: "2px solid #000",
                    padding: "4px 8px", fontFamily: "'Courier New', monospace",
                    fontSize: 12, fontWeight: 900, letterSpacing: "0.1em", color: "#fff",
                    textAlign: "center",
                  }}>LYRIA · A.I.</div>
                </div>
              </div>

              {/* 超大标题 */}
              <div style={{
                border: "3px solid #000", boxShadow: "6px 6px 0 0 #FFEE00",
                background: "#fff", padding: "10px 12px",
              }}>
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: 10, fontWeight: 700, color: "#6200EE", letterSpacing: "0.15em", marginBottom: 4 }}>
                  // DIGITAL TWIN
                </div>
                <div style={{
                  fontSize: 52, fontWeight: 900, color: "#000", lineHeight: 0.9,
                  letterSpacing: "-0.04em", fontFamily: "'Courier New', monospace",
                }}>
                  Micro<br />Earth.
                </div>
                {/* 孟菲斯下划线 */}
                <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                  <div style={{ height: 5, flex: 2, background: "#FF0055", border: "1.5px solid #000" }} />
                  <div style={{ height: 5, flex: 1, background: "#FFEE00", border: "1.5px solid #000" }} />
                  <div style={{ height: 5, flex: 1, background: "#6200EE", border: "1.5px solid #000" }} />
                </div>
                <p style={{ marginTop: 8, fontFamily: "'Courier New', monospace", fontSize: 13, color: "#444", lineHeight: 1.5, fontWeight: 600 }}>
                  LangGraph · Open-Meteo<br />实时气象数字孪生
                </p>
              </div>
            </div>
          </motion.div>

          {/* 系统状态 — 高饱和撞色块 */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
            <div style={{ border: "3px solid #000", boxShadow: "5px 5px 0 0 #000", overflow: "hidden" }}>
              {/* 标题栏 */}
              <div style={{ background: "#000", padding: "4px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "'Courier New', monospace", fontSize: 11, fontWeight: 900, color: "#00FF00", letterSpacing: "0.12em" }}>
                  ▶ SYSTEM STATUS
                </span>
                <span style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: "#FFEE00" }}>ONLINE</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                {sysItems.map(({ label, val, bg, color }, idx) => (
                  <div key={label} style={{
                    display: "flex", flexDirection: "column",
                    border: "1.5px solid #000",
                    padding: "6px 8px", background: bg,
                    fontFamily: "'Courier New', monospace",
                  }}>
                    <span style={{ fontSize: 10, color: color, fontWeight: 700, letterSpacing: "0.08em", opacity: 0.8 }}>{label}</span>
                    <span style={{ fontWeight: 900, fontSize: 12, color: color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Phase 5: What-If 灾害沙盘 */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15 }}>
            <WhatIfSandbox />
          </motion.div>

          {/* 气象快照 */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.2 }} style={{ flex: 1, minHeight: 0 }}>
            <div style={{ border: "3px solid #000", boxShadow: "5px 5px 0 0 #FFEE00", overflow: "hidden", height: "100%" }}>
              <div style={{ background: "#FFEE00", borderBottom: "2px solid #000", padding: "4px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "'Courier New', monospace", fontSize: 11, fontWeight: 900, color: "#000", letterSpacing: "0.1em" }}>☁ WEATHER</span>
                <span style={{ fontFamily: "'Courier New', monospace", fontSize: 11, fontWeight: 700, color: "#000" }}>{region}</span>
              </div>
              <div style={{ padding: 8, fontFamily: "'Courier New', monospace", fontSize: 13, background: "#fff", height: "calc(100% - 30px)", overflowY: "auto" }}>
                {geojsonData?.features?.length ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {geojsonData.features.slice(0, 4).map((f, i) => {
                      const p = f.properties;
                      const isRainy = (p.precipitation_probability ?? 0) > 50;
                      return (
                        <div key={i} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          background: isRainy ? "#FF0055" : "#00FF00",
                          border: "2px solid #000", boxShadow: "2px 2px 0 0 #000",
                          padding: "5px 8px", gap: 4,
                          color: isRainy ? "#fff" : "#000",
                        }}>
                          <span style={{ fontSize: 10, fontWeight: 900 }}>N{i + 1}</span>
                          <span style={{ fontWeight: 900, fontSize: 16 }}>{p.temperature_2m}°C</span>
                          <span style={{ fontSize: 11, fontWeight: 700 }}>{p.precipitation_probability}%☂</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ color: "#bbb", fontSize: 13, fontFamily: "'Courier New', monospace" }}>// 等待 Agent 数据...</p>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* 中央地图 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.12 }}
          style={{ minWidth: 0, display: "flex", flexDirection: "column" }}
        >
          <div style={{
            border: "3px solid #000", boxShadow: "6px 6px 0 0 #000",
            background: "#fff", height: "100%", display: "flex", flexDirection: "column",
          }}>
            {/* 地图标题栏 — 明黄底 */}
            <div style={{
              borderBottom: "3px solid #000", padding: "8px 12px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "#FFEE00", flexShrink: 0,
            }}>
              <span style={{
                fontFamily: "'Courier New', monospace", fontWeight: 900, fontSize: 13,
                letterSpacing: "0.06em", textTransform: "uppercase", color: "#000",
                whiteSpace: "nowrap",
              }}>
                ◈ GEO VIZ — {region.toUpperCase()} WEATHER GRID
              </span>
              <div style={{
                background: "#000", color: "#00FF00", border: "none",
                fontFamily: "'Courier New', monospace", fontSize: 12, fontWeight: 900,
                padding: "2px 8px", letterSpacing: "0.06em",
                boxShadow: "0 0 8px #00FF00, 0 0 16px rgba(0,255,0,0.3)",
              }}>MAP: ON</div>
            </div>
            {/* 地图本体 */}
            <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
              <Suspense fallback={
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "'Courier New', monospace", fontSize: 12, color: "#6200EE", background: "#000" }}>
                  ▶ LOADING MAP...
                </div>
              }>
                <EarthMap region={region} lat={lat} lon={lon} />
              </Suspense>
            </div>
          </div>
        </motion.div>

        {/* 右侧：Agent 终端 */}
        <motion.div
          initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
          style={{ display: "flex", flexDirection: "column", minWidth: 0 }}
        >
          {/* Tab — Memphis撞色 */}
          <div style={{ display: "flex", border: "3px solid #000", borderBottom: "none", flexShrink: 0 }}>
            {["STREAM", "CONFIG"].map((tab, i) => (
              <div key={tab} style={{
                flex: 1, padding: "6px 0", fontFamily: "'Courier New', monospace", fontWeight: 900,
                fontSize: 12, letterSpacing: "0.1em", textAlign: "center",
                borderRight: i === 0 ? "2px solid #000" : "none",
                background: i === 0 ? "#00FF00" : "#f0f0f0",
                color: i === 0 ? "#000" : "#aaa",
                boxShadow: i === 0 ? "inset 0 0 0 0 transparent" : "none",
              }}>{tab}</div>
            ))}
          </div>
          <div style={{
            border: "3px solid #000", borderTop: "none",
            boxShadow: "5px 5px 0 0 #6200EE",
            flex: 1, display: "flex", flexDirection: "column", background: "#0a0a0a",
            minHeight: 0, overflow: "hidden",
          }}>
            <AgentTerminal region={region} lat={lat} lon={lon} />
          </div>
        </motion.div>

        {/* 最右侧：Analytics 仪表盘 */}
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.15 }}
          style={{ display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}
        >
          <AnalyticsDashboard riskData={riskData} region={region} />
        </motion.div>
      </main>

      {/* ── 底部状态栏 — Memphis黑底 ── */}
      <footer style={{
        position: "relative", zIndex: 10,
        borderTop: "3px solid #000",
        background: "#000",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontFamily: "'Courier New', monospace", fontSize: 12, color: "#555",
        height: 36, flexShrink: 0, padding: "0 16px",
      }}>
        <span style={{ color: "#FFEE00", fontWeight: 700 }}>MICRO-EARTH © 2026</span>
        <span style={{ color: "#FF0055", fontWeight: 900, letterSpacing: "0.08em" }}>CYBER-LAB MEMPHIS · PHASE 5</span>
        <span style={{ color: geojsonData ? "#00FF00" : "#333", fontWeight: 700 }}>
          {geojsonData ? `✓ open-meteo.com` : "// NO DATA"}
        </span>
      </footer>
    </div>
  );
}
