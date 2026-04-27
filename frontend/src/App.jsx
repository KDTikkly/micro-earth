import "./index.css";
import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import BrutalistCard from "./components/BrutalistCard";
import AgentTerminal from "./components/AgentTerminal";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
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

/* ── 漂浮 SVG 几何装饰 ──────────────────────────────────────── */
function FloatingDecorations() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {/* 蓝色空心三角形 */}
      <motion.div style={{ position: "absolute", top: "11%", left: "5%" }}
        animate={{ y: [0, -14, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
        <svg width="72" height="64" viewBox="0 0 72 64" fill="none">
          <polygon points="36,4 68,60 4,60" stroke="#9BF6FF" strokeWidth="2.5" fill="none" />
        </svg>
      </motion.div>

      {/* 绿色波浪线 */}
      <motion.div style={{ position: "absolute", top: "7%", left: "37%" }}
        animate={{ y: [0, -8, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}>
        <svg width="140" height="36" viewBox="0 0 140 36" fill="none">
          <path d="M0,18 C18,4 36,32 54,18 C72,4 90,32 108,18 C126,4 140,18 140,18"
            stroke="#B5EAD7" strokeWidth="2.5" fill="none" />
        </svg>
      </motion.div>

      {/* 黄色空心大圆 */}
      <motion.div style={{ position: "absolute", top: "9%", right: "7%" }}
        animate={{ y: [0, 10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}>
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
          <circle cx="36" cy="36" r="30" stroke="#FFE66D" strokeWidth="2.5" fill="none" />
        </svg>
      </motion.div>

      {/* 黄色空心小圆 */}
      <motion.div style={{ position: "absolute", top: "6%", right: "15%" }}
        animate={{ y: [0, -10, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}>
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          <circle cx="22" cy="22" r="18" stroke="#FFE66D" strokeWidth="2" fill="none" />
        </svg>
      </motion.div>

      {/* 粉色小方块 */}
      <motion.div style={{ position: "absolute", top: "50%", left: "2%" }}
        animate={{ y: [0, -8, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}>
        <div style={{ width: 16, height: 16, background: "#FFB5A7", border: "2px solid #1A1A1A" }} />
      </motion.div>

      {/* 蓝色菱形 */}
      <motion.div style={{ position: "absolute", bottom: "14%", right: "2.5%" }}
        animate={{ y: [0, -12, 0], rotate: [45, 55, 45] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}>
        <div style={{ width: 16, height: 16, background: "#9BF6FF", border: "2px solid #1A1A1A", transform: "rotate(45deg)" }} />
      </motion.div>

      {/* 细线十字 */}
      <motion.div style={{ position: "absolute", top: "42%", right: "4%" }}
        animate={{ rotate: [0, 180] }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <line x1="11" y1="0" x2="11" y2="22" stroke="#E0E0E0" strokeWidth="1.5" />
          <line x1="0" y1="11" x2="22" y2="11" stroke="#E0E0E0" strokeWidth="1.5" />
        </svg>
      </motion.div>
    </div>
  );
}

/* ── 状态徽章 ────────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const cfg = {
    IDLE:       { bg: "#f5f5f5", dot: "#bbb" },
    CONNECTING: { bg: "#FFE66D", dot: "#D4A017" },
    RUNNING:    { bg: "#B5EAD7", dot: "#2D6A4F" },
    ERROR:      { bg: "#FFB5A7", dot: "#C0392B" },
  }[status] ?? { bg: "#f5f5f5", dot: "#bbb" };
  return (
    <span style={{
      background: cfg.bg, color: "#1A1A1A",
      border: "2px solid #1A1A1A", boxShadow: "2px 2px 0 0 #1A1A1A",
      fontFamily: "'Courier New', monospace", fontSize: 11, fontWeight: 700,
      padding: "2px 10px", display: "inline-flex", alignItems: "center", gap: 5, letterSpacing: "0.06em",
    }}>
      <span style={{ color: cfg.dot }}>◉</span>{status}
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

  return (
    <div className="bg-blueprint min-h-screen" style={{ position: "relative" }}>
      <FloatingDecorations />

      {/* ── 顶部导航 ── */}
      <header style={{
        position: "relative", zIndex: 10, background: "#fff",
        borderBottom: "2px solid #1A1A1A", padding: "8px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        minHeight: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            background: "#FFE66D", border: "2px solid #1A1A1A", boxShadow: "2px 2px 0 0 #1A1A1A",
            padding: "4px 12px", fontFamily: "'Courier New', monospace",
            fontWeight: 900, fontSize: 16, letterSpacing: "0.1em", color: "#1A1A1A",
            whiteSpace: "nowrap",
          }}>MICRO-EARTH</div>
          <span style={{ fontFamily: "'Courier New', monospace", fontSize: 13, color: "#999", letterSpacing: "0.04em", fontWeight: 600 }}>
            v0.4.0 · PHASE 4
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <StatusBadge status={status} />
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "'Courier New', monospace", fontSize: 14 }}>
            <span style={{ color: "#999", fontWeight: 700 }}>RGN</span>
            <select value={region} onChange={handleRegionChange} style={{
              background: "#fff", border: "2px solid #1A1A1A", boxShadow: "2px 2px 0 0 #1A1A1A",
              fontFamily: "'Courier New', monospace", fontWeight: 700, fontSize: 14,
              padding: "3px 8px", color: "#1A1A1A", outline: "none", cursor: "pointer",
            }}>
              {REGIONS.map((r) => <option key={r.label} value={r.label}>{r.label}</option>)}
            </select>
          </div>
          <span style={{ fontFamily: "'Courier New', monospace", fontSize: 13, color: "#aaa", whiteSpace: "nowrap" }}>
            {lat.toFixed(2)}, {lon.toFixed(2)}
          </span>
        </div>
      </header>

      {/* ── 主体网格 ── */}
      <main style={{
        position: "relative", zIndex: 5,
        display: "grid",
        gridTemplateColumns: "240px 1fr 260px 280px",
        gap: 10,
        padding: "12px 16px",
        height: "calc(100vh - 50px - 36px)",
        overflow: "hidden",
      }}>

        {/* 左列：头像 + 标题 + 状态 + 气象 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, overflow: "hidden", minWidth: 0 }}>
          {/* 头像 + 标题区 */}
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              {/* 头像 */}
              <div style={{
                position: "relative", flexShrink: 0,
                width: 80, height: 80,
                border: "2px solid #1A1A1A", boxShadow: "3px 3px 0 0 #1A1A1A",
                overflow: "hidden", background: "#e8f4fc",
              }}>
                <img src={lyriaImg} alt="LYRIA" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 10%" }} />
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  background: "rgba(255,230,109,0.92)", borderTop: "1px solid #1A1A1A",
                  padding: "2px 4px", fontFamily: "'Courier New', monospace",
                  fontSize: 8, fontWeight: 900, letterSpacing: "0.06em", color: "#1A1A1A",
                  textAlign: "center",
                }}>LYRIA · A.I.</div>
              </div>
              {/* 标题文字 */}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: 11, fontWeight: 700, color: "#bbb", letterSpacing: "0.1em", marginBottom: 4 }}>
                  // DIGITAL TWIN
                </div>
                <div style={{ fontSize: 38, fontWeight: 900, color: "#1A1A1A", lineHeight: 1, letterSpacing: "-0.03em" }}>
                  Micro<br />Earth.
                </div>
                <div style={{ marginTop: 6, height: 4, width: 56, background: "#FFB5A7", border: "1.5px solid #1A1A1A" }} />
                <p style={{ marginTop: 6, fontFamily: "'Courier New', monospace", fontSize: 12, color: "#666", lineHeight: 1.6, fontWeight: 500 }}>
                  LangGraph · Open-Meteo<br />实时气象数字孪生
                </p>
              </div>
            </div>
          </motion.div>

          {/* 系统状态标签 */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
            <BrutalistCard title="SYSTEM" accent="yellow">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 5px" }}>
                {[
                  { label: "BACKEND",  val: ":8000",      bg: "#B5EAD7" },
                  { label: "FRONTEND", val: ":3000",      bg: "#9BF6FF" },
                  { label: "MAP",      val: "LEAFLET",    bg: "#FFE66D" },
                  { label: "API",      val: "OPEN-METEO", bg: "#FFB5A7" },
                  { label: "GRAPH",    val: "LANGGRAPH",  bg: "#C7B8EA" },
                  { label: "NODES",    val: nodeCount ? `${nodeCount}pts` : "—", bg: "#FFE66D" },
                ].map(({ label, val, bg }) => (
                  <div key={label} style={{
                    display: "flex", flexDirection: "column",
                    border: "1.5px solid #1A1A1A", boxShadow: "1.5px 1.5px 0 0 #1A1A1A",
                    padding: "4px 7px", background: bg, minWidth: 0,
                    fontFamily: "'Courier New', monospace",
                  }}>
                    <span style={{ fontSize: 11, color: "#555", fontWeight: 700, letterSpacing: "0.06em" }}>{label}</span>
                    <span style={{ fontWeight: 900, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{val}</span>
                  </div>
                ))}
              </div>
            </BrutalistCard>
          </motion.div>

          {/* 气象快照 */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.2 }} style={{ flex: 1, minHeight: 0 }}>
            <BrutalistCard title="WEATHER" accent="pink" headerExtra={region}>
              <div style={{ fontFamily: "'Courier New', monospace", fontSize: 13 }}>
                {geojsonData?.features?.length ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {geojsonData.features.slice(0, 4).map((f, i) => {
                      const p = f.properties;
                      const isRainy = (p.precipitation_probability ?? 0) > 50;
                      return (
                        <div key={i} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          background: isRainy ? "#FFB5A7" : "#FFE66D",
                          border: "1.5px solid #1A1A1A", boxShadow: "1.5px 1.5px 0 0 #1A1A1A",
                          padding: "5px 8px", gap: 4,
                        }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#666", whiteSpace: "nowrap" }}>N{i + 1}</span>
                          <span style={{ fontWeight: 900, fontSize: 15 }}>{p.temperature_2m}°C</span>
                          <span style={{ fontSize: 11, color: "#444", fontWeight: 600, whiteSpace: "nowrap" }}>{p.precipitation_probability}%☂</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ color: "#bbb", fontSize: 13 }}>// 等待 Agent 数据...</p>
                )}
              </div>
            </BrutalistCard>
          </motion.div>
        </div>

        {/* 中央地图 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.12 }}
          style={{ minWidth: 0, display: "flex", flexDirection: "column" }}
        >
          <div style={{
            border: "2px solid #1A1A1A", boxShadow: "4px 4px 0 0 #1A1A1A",
            background: "#fff", height: "100%", display: "flex", flexDirection: "column",
          }}>
            {/* 地图标题栏 */}
            <div style={{
              borderBottom: "2px solid #1A1A1A", padding: "8px 12px",
              display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff",
              flexShrink: 0,
            }}>
              <span style={{
                fontFamily: "'Courier New', monospace", fontWeight: 900, fontSize: 14,
                letterSpacing: "0.06em", textTransform: "uppercase", color: "#1A1A1A",
                whiteSpace: "nowrap",
              }}>
                GEO VIZ — {region.toUpperCase()} WEATHER GRID
              </span>
              <div className="blueprint-label" style={{ flexShrink: 0, marginLeft: 12, fontSize: 13 }}>MAP: ON</div>
            </div>
            {/* 地图本体 */}
            <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
              <Suspense fallback={
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "'Courier New', monospace", fontSize: 11, color: "#bbb" }}>
                  LOADING MAP...
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
          {/* Tab */}
          <div style={{ display: "flex", borderBottom: "2px solid #1A1A1A", flexShrink: 0 }}>
            {["STREAM", "CONFIG"].map((tab, i) => (
              <div key={tab} style={{
                flex: 1, padding: "6px 0", fontFamily: "'Courier New', monospace", fontWeight: 700,
                fontSize: 13, letterSpacing: "0.08em", textAlign: "center",
                borderRight: i === 0 ? "2px solid #1A1A1A" : "none",
                background: i === 0 ? "#FFE66D" : "#f8f8f8",
                color: i === 0 ? "#1A1A1A" : "#bbb",
              }}>{tab}</div>
            ))}
          </div>
          <div style={{
            border: "2px solid #1A1A1A", borderTop: "none",
            boxShadow: "4px 4px 0 0 #1A1A1A",
            flex: 1, display: "flex", flexDirection: "column", background: "#fafafa",
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

      {/* ── 底部状态栏 ── */}
      <footer style={{
        position: "relative", zIndex: 10,
        borderTop: "2px solid #1A1A1A", padding: "6px 16px",
        background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between",
        fontFamily: "'Courier New', monospace", fontSize: 12, color: "#bbb",
        height: 36, flexShrink: 0,
      }}>
        <span>MICRO-EARTH © 2026</span>
        <span style={{ color: "#1A1A1A", fontWeight: 700 }}>BLUEPRINT NEO-BRUTALISM · PHASE 4</span>
        <span style={{ color: geojsonData ? "#2D6A4F" : "#ccc" }}>
          {geojsonData ? `✓ open-meteo.com` : "// NO DATA"}
        </span>
      </footer>
    </div>
  );
}
