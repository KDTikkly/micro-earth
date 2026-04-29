import "./index.css";
import { useState, useEffect, useRef, Component } from "react";
import ElectronTitleBar from "./components/ElectronTitleBar";
import { motion } from "framer-motion";

/* ── ErrorBoundary — 防止子组件崩溃导致白屏 ── */
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("[ErrorBoundary]", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          height: "100%", background: "#0a0a0a", fontFamily: "'Courier New', monospace", padding: 16,
        }}>
          <div style={{ color: "#FF0055", fontWeight: 900, fontSize: 13, letterSpacing: "0.1em", marginBottom: 8 }}>
            [!] MAP ENGINE ERROR
          </div>
          <div style={{ color: "#555", fontSize: 11, textAlign: "center", maxWidth: 240 }}>
            {String(this.state.error?.message ?? "Unknown error")}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: 12, background: "#FFEE00", border: "2.5px solid #000",
              fontFamily: "'Courier New', monospace", fontWeight: 900, fontSize: 12,
              padding: "4px 14px", cursor: "pointer",
            }}
          >↺ RETRY</button>
        </div>
      );
    }
    return this.props.children;
  }
}
import BrutalistCard from "./components/BrutalistCard";
import AgentTerminal from "./components/AgentTerminal";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import WhatIfSandbox from "./components/WhatIfSandbox";
import { useAgentStore } from "./store/agentStore";
import lyriaImg from "./assets/lyria-reverie.png";
import EarthMap from "./map/EarthMap";
import MultiCityRadar from "./components/MultiCityRadar";
import { WS_BASE } from "./utils/wsConfig";

const REGIONS = [
  { label: "深圳", lat: 22.69, lon: 114.39 },
  { label: "北京", lat: 39.91, lon: 116.39 },
  { label: "上海", lat: 31.23, lon: 121.47 },
  { label: "成都", lat: 30.57, lon: 104.07 },
  { label: "东京", lat: 35.68, lon: 139.69 },
  { label: "纽约", lat: 40.71, lon: -74.01 },
];

/* ── v6.0: Temporal Scrubber 时空播放器 ── */
function TemporalScrubber() {
  const { windfield, timelineHour, setTimelineHour } = useAgentStore();
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef(null);
  const maxHour = Math.max((windfield?.total_hours ?? 72) - 1, 0);
  const hasData = !!windfield?.total_hours;

  // 当前帧时间标签
  const currentTime = windfield?.hourly_vectors?.[timelineHour]?.time ?? `+${timelineHour}h`;
  const currentSpeed = windfield?.hourly_vectors?.[timelineHour]?.avg_speed ?? "--";
  const currentMaxSpeed = windfield?.hourly_vectors?.[timelineHour]?.max_speed ?? "--";

  // PLAY 自动推进
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setTimelineHour((prev) => {
          const next = prev >= maxHour ? 0 : prev + 1;
          if (next === 0) setPlaying(false);
          return next;
        });
      }, 300);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing, maxHour, setTimelineHour]);

  const windSpeedColor = (s) => {
    if (s === "--") return "#888";
    if (s < 3)  return "#9370DB";
    if (s < 8)  return "#00BFFF";
    if (s < 15) return "#FFEE00";
    if (s < 25) return "#FF6600";
    return "#FF0055";
  };

  return (
    <div style={{
      border: "3px solid #000",
      boxShadow: "5px 5px 0 0 #9370DB",
      background: "#000",
      padding: 0,
      flexShrink: 0,
    }}>
      {/* 标题栏 */}
      <div style={{
        borderBottom: "2px solid #9370DB",
        padding: "4px 10px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(147,112,219,0.15)",
      }}>
        <span style={{
          fontFamily: "'Courier New', monospace", fontSize: 11, fontWeight: 900,
          color: "#9370DB", letterSpacing: "0.15em",
        }}>⏱ TEMPORAL SCRUBBER · 72H WIND FORECAST</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* 当前风速显示 */}
          <span style={{
            fontFamily: "'Courier New', monospace", fontSize: 10, fontWeight: 900,
            color: windSpeedColor(currentSpeed),
            textShadow: `0 0 6px ${windSpeedColor(currentSpeed)}`,
          }}>
            AVG {currentSpeed}m/s  MAX {currentMaxSpeed}m/s
          </span>
          <span style={{
            fontFamily: "'Courier New', monospace", fontSize: 10, color: "#00BFFF",
            fontWeight: 700,
          }}>{currentTime}</span>
        </div>
      </div>

      {/* 主体区域 */}
      <div style={{
        padding: "8px 12px 10px",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        {/* PLAY/PAUSE 按钮 */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{
            position: "absolute", inset: 0,
            transform: "translate(3px,3px)",
            background: playing ? "#AA0030" : "#AA8800",
            border: "2.5px solid #000",
          }} />
          <button
            onClick={() => setPlaying((p) => !p)}
            disabled={!hasData}
            style={{
              position: "relative",
              background: playing ? "#FF0055" : "#FFEE00",
              border: "2.5px solid #000",
              padding: "6px 14px",
              fontFamily: "'Courier New', monospace",
              fontSize: 12, fontWeight: 900,
              color: "#000", cursor: hasData ? "pointer" : "not-allowed",
              letterSpacing: "0.08em",
              opacity: hasData ? 1 : 0.4,
            }}
            onMouseDown={(e) => { if (hasData) e.currentTarget.style.transform = "translate(3px,3px)"; }}
            onMouseUp={(e)   => { e.currentTarget.style.transform = ""; }}
            onMouseLeave={(e)=> { e.currentTarget.style.transform = ""; }}
          >
            {playing ? "[||] PAUSE" : "[>] PLAY"}
          </button>
        </div>

        {/* 时间轴滑块 — 极度粗犷孟菲斯风格 */}
        <div style={{ flex: 1, position: "relative" }}>
          {/* 滑轨刻度背景 */}
          <div style={{
            position: "absolute", top: "50%", left: 0, right: 0,
            transform: "translateY(-50%)",
            height: 8,
            background: "#111",
            border: "2px solid #333",
            zIndex: 1,
          }}>
            {/* 已播放进度条 */}
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0,
              width: `${(timelineHour / Math.max(maxHour, 1)) * 100}%`,
              background: "linear-gradient(90deg, #9370DB, #00BFFF)",
              boxShadow: "0 0 8px rgba(147,112,219,0.6)",
              transition: "width 0.1s linear",
            }} />
            {/* 刻度线：+0h, +24h, +48h, +72h */}
            {[0, 24, 48, 72].map((h) => (
              <div key={h} style={{
                position: "absolute",
                left: `${(h / 72) * 100}%`,
                top: -6, transform: "translateX(-50%)",
                width: 2, height: 20,
                background: "#444",
                zIndex: 2,
              }} />
            ))}
          </div>
          {/* 实际 range input */}
          <input
            type="range"
            className="temporal-scrubber"
            min={0}
            max={maxHour > 0 ? maxHour : 71}
            step={1}
            value={timelineHour}
            onChange={(e) => setTimelineHour(Number(e.target.value))}
            style={{
              position: "relative", zIndex: 2,
              width: "100%",
              height: 36,
              background: "transparent",
              cursor: hasData ? "pointer" : "not-allowed",
              outline: "none",
            }}
            disabled={!hasData}
          />
        </div>

        {/* 时间偏移标签 */}
        <div style={{
          flexShrink: 0,
          background: "#FFEE00",
          border: "2.5px solid #000",
          boxShadow: "3px 3px 0 0 #000",
          padding: "4px 10px",
          fontFamily: "'Courier New', monospace",
          fontSize: 14, fontWeight: 900, color: "#000",
          minWidth: 52, textAlign: "center",
        }}>
          +{timelineHour}H
        </div>
      </div>

      {/* 风速图例 */}
      <div style={{
        borderTop: "1px solid #222",
        padding: "4px 12px",
        display: "flex", gap: 12, alignItems: "center",
      }}>
        <span style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: "#555", letterSpacing: "0.1em" }}>WIND LEGEND:</span>
        {[["CALM", "#9370DB", "<3"], ["BREEZE", "#00BFFF", "3-8"], ["STRONG", "#FFEE00", "8-15"], ["GALE", "#FF6600", "15-25"], ["TYPHOON", "#FF0055", ">25"]].map(([label, color, range]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <div style={{ width: 8, height: 3, background: color, boxShadow: `0 0 4px ${color}` }} />
            <span style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color, fontWeight: 700 }}>{label}</span>
            <span style={{ fontFamily: "'Courier New', monospace", fontSize: 8, color: "#555" }}>{range}m/s</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 全息粒子代码雨背景（仅左列） ── */
function HoloParticlesBg() {
  const chars = ["0","1","A","F","3","7","B","E","#","*","<",">","V","@","+"];
  const cols = 8;
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
      overflow: "hidden",
      background: "linear-gradient(180deg, rgba(10,5,30,0) 0%, rgba(30,10,60,0.06) 100%)",
    }}>
      {Array.from({ length: cols }, (_, c) => (
        <div key={c} style={{
          position: "absolute",
          left: `${(c / cols) * 100 + 2}%`,
          top: 0,
          width: 20,
          display: "flex", flexDirection: "column", alignItems: "center",
          animation: `matrixRain ${3 + c * 0.7}s linear infinite`,
          animationDelay: `${c * 0.4}s`,
          gap: 8,
        }}>
          {Array.from({ length: 8 }, (_, r) => (
            <span key={r} style={{
              fontFamily: "'Courier New', monospace",
              fontSize: 10, fontWeight: 900,
              color: c % 3 === 0 ? "rgba(147,112,219,0.6)" : c % 3 === 1 ? "rgba(0,191,255,0.5)" : "rgba(255,105,180,0.45)",
              opacity: 1 - r * 0.1,
            }}>
              {chars[(c * 3 + r * 7) % chars.length]}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── Memphis 漂浮 SVG 几何装饰 ── */
function FloatingDecorations() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>

      {/* 电子紫大波浪线 — 顶部横穿 */}
      <motion.div style={{ position: "absolute", top: "3%", left: "-5%" }}
        animate={{ y: [0, -10, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}>
        <svg width="900" height="60" viewBox="0 0 900 60" fill="none">
          <path d="M0,30 C80,5 160,55 240,30 C320,5 400,55 480,30 C560,5 640,55 720,30 C800,5 870,30 900,30"
            stroke="#9370DB" strokeWidth="3.5" fill="none" strokeDasharray="12 6" />
        </svg>
      </motion.div>

      {/* 霓虹粉空心大三角 */}
      <motion.div style={{ position: "absolute", top: "8%", left: "3%" }}
        animate={{ y: [0, -18, 0], rotate: [0, 4, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}>
        <svg width="96" height="84" viewBox="0 0 96 84" fill="none">
          <polygon points="48,4 92,80 4,80" stroke="#FF69B4" strokeWidth="3" fill="none" />
        </svg>
      </motion.div>

      {/* 电光蓝大圆环 */}
      <motion.div style={{ position: "absolute", top: "6%", right: "5%" }}
        animate={{ y: [0, 14, 0], rotate: [0, -6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}>
        <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="42" stroke="#00BFFF" strokeWidth="3.5" fill="none" />
        </svg>
      </motion.div>

      {/* 霓虹粉小圆环 */}
      <motion.div style={{ position: "absolute", top: "5%", right: "16%" }}
        animate={{ y: [0, -12, 0], rotate: [0, 8, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}>
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
          <circle cx="26" cy="26" r="20" stroke="#FF69B4" strokeWidth="2.5" fill="none" />
        </svg>
      </motion.div>

      {/* 电子紫空心菱形 */}
      <motion.div style={{ position: "absolute", top: "52%", left: "1.5%" }}
        animate={{ y: [0, -10, 0], rotate: [45, 60, 45] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}>
        <div style={{ width: 22, height: 22, border: "3px solid #9370DB", transform: "rotate(45deg)" }} />
      </motion.div>

      {/* 霓虹粉实心方块 */}
      <motion.div style={{ position: "absolute", top: "44%", left: "1%" }}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}>
        <div style={{ width: 14, height: 14, background: "#FF69B4", border: "2px solid #000" }} />
      </motion.div>

      {/* 明黄实心三角 */}
      <motion.div style={{ position: "absolute", bottom: "16%", right: "2%" }}
        animate={{ y: [0, -14, 0], rotate: [0, -5, 0] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}>
        <svg width="30" height="26" viewBox="0 0 30 26" fill="none">
          <polygon points="15,2 28,24 2,24" fill="#FFEE00" stroke="#000" strokeWidth="2" />
        </svg>
      </motion.div>

      {/* 旋转十字 — 电光蓝 */}
      <motion.div style={{ position: "absolute", top: "38%", right: "3%" }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}>
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <line x1="13" y1="0" x2="13" y2="26" stroke="#00BFFF" strokeWidth="2.5" />
          <line x1="0" y1="13" x2="26" y2="13" stroke="#00BFFF" strokeWidth="2.5" />
        </svg>
      </motion.div>

      {/* 底部电子紫波浪 */}
      <motion.div style={{ position: "absolute", bottom: "4%", right: "20%" }}
        animate={{ x: [0, 10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}>
        <svg width="120" height="28" viewBox="0 0 120 28" fill="none">
          <path d="M0,14 C15,2 30,26 45,14 C60,2 75,26 90,14 C105,2 115,14 120,14"
            stroke="#9370DB" strokeWidth="2.5" fill="none" />
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
      <span style={{ color: cfg.dot, fontSize: 13 }}>[*]</span>{status}
    </span>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}

function AppInner() {
  const { region, lat, lon, setRegion, setCoords, geojsonData, riskData, status } = useAgentStore();
  const isElectron = typeof window !== "undefined" && !!window.electronAPI;

  // Electron 模式：给 body 挂 electron-mode 类，触发 padding-top 留出标题栏空间
  useEffect(() => {
    if (isElectron) document.body.classList.add('electron-mode');
    return () => document.body.classList.remove('electron-mode');
  }, [isElectron]);

  const handleRegionChange = (e) => {
    const found = REGIONS.find((r) => r.label === e.target.value);
    if (found) { setRegion(found.label); setCoords(found.lat, found.lon); }
  };

  const nodeCount = geojsonData?.features?.length ?? 0;

  // 系统状态色块配置（Lyria 角色高饱和色系）
  const sysItems = [
    { label: "BACKGROUND", val: "GRID·BG",    bg: "#FF69B4", color: "#000" },  // 霓虹粉
    { label: "FRONTEND",   val: ":3000",       bg: "#00BFFF", color: "#000" },  // 电光蓝
    { label: "MAP",        val: "GLOBE·3D",    bg: "#9370DB", color: "#fff" },  // 电子紫
    { label: "OPEN-METEO", val: "WEATHER·API", bg: "#FFEE00", color: "#000" },  // 明黄
    { label: "GRAPH",      val: "LANGGRAPH",   bg: "#FF69B4", color: "#000" },  // 霓虹粉
    { label: "NODES",      val: nodeCount ? `${nodeCount}pts` : "—", bg: "#00BFFF", color: "#000" },  // 电光蓝
  ];

  return (
    <div style={{
      position: "relative",
      minHeight: "100vh",
      background: "#FDFDFD",
      backgroundImage: "linear-gradient(to right, #e8e8e8 1px, transparent 1px), linear-gradient(to bottom, #e8e8e8 1px, transparent 1px)",
      backgroundSize: "40px 40px",
    }}>
      {/* Electron 自定义标题栏（仅桌面端显示） */}
      <ElectronTitleBar />
      <FloatingDecorations />

      {/* ── 顶部导航 — 霓虹粉底 ── */}
      <header style={{
        position: "relative", zIndex: 10,
        background: "linear-gradient(90deg, #FF69B4 0%, #FF1493 50%, #FF69B4 100%)",
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
            fontFamily: "'Courier New', monospace", fontSize: 12, color: "#fff",
            letterSpacing: "0.06em", fontWeight: 700,
            border: "1.5px solid #fff", padding: "1px 6px",
          }}>
            v11.3
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <StatusBadge status={status} />
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "'Courier New', monospace", fontSize: 13 }}>
            <span style={{ color: "#fff", fontWeight: 900 }}>RGN</span>
            <select value={region} onChange={handleRegionChange} style={{
              background: "#000", border: "2.5px solid #fff", boxShadow: "2px 2px 0 0 #000",
              fontFamily: "'Courier New', monospace", fontWeight: 900, fontSize: 13,
              padding: "3px 8px", color: "#FFEE00", outline: "none", cursor: "pointer",
            }}>
              {REGIONS.map((r) => <option key={r.label} value={r.label}>{r.label}</option>)}
            </select>
          </div>
          <span style={{ fontFamily: "'Courier New', monospace", fontSize: 12, color: "rgba(255,255,255,0.85)", whiteSpace: "nowrap" }}>
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
        <div style={{
          display: "flex", flexDirection: "column", gap: 10,
          overflowY: "auto", overflowX: "hidden", minWidth: 0,
          position: "relative",
        }}>
          {/* 全息粒子代码雨 — 左列背景 */}
          <HoloParticlesBg />

          {/* ── 全息霓虹玻璃面板：立绘 + 标题一体化 ── */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
            <div style={{
              position: "relative",
              border: "3px solid #000",
              animation: "holoGlow 2.5s ease-in-out infinite",
              overflow: "hidden",
              background: "linear-gradient(135deg, #0a051e 0%, #1e0a3c 50%, #0a1432 100%)",
            }}>
              {/* 全息虹彩遮罩层（oil-slick 效果） */}
              <div style={{
                position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
                background: "linear-gradient(125deg, rgba(147,112,219,0.18) 0%, rgba(0,191,255,0.12) 30%, rgba(255,105,180,0.15) 60%, rgba(147,112,219,0.18) 100%)",
                backgroundSize: "200% 200%",
                animation: "iridescent 6s ease-in-out infinite",
              }} />

              {/* 扫描线动画层 */}
              <div style={{
                position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none", overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute", left: 0, right: 0, height: 2,
                  background: "linear-gradient(90deg, transparent, rgba(0,191,255,0.6), transparent)",
                  animation: "scanLine 4s linear infinite",
                }} />
              </div>

              {/* ── 右上角 CLASSIFIED 标签 ── */}
              <div style={{
                position: "absolute", top: 0, right: 0, zIndex: 10, pointerEvents: "none",
                background: "#FF69B4", border: "2px solid #000",
                borderTop: "none", borderRight: "none",
                padding: "2px 7px",
                fontFamily: "'Courier New', monospace", fontSize: 9, fontWeight: 900,
                color: "#000", letterSpacing: "0.1em",
              }}>CLASSIFIED · LYRIA A.I.</div>

              {/* ── 左上角全息图标 ── */}
              <div style={{
                position: "absolute", top: 6, left: 8, zIndex: 10, pointerEvents: "none",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <polygon points="7,1 13,5 13,9 7,13 1,9 1,5" stroke="#00BFFF" strokeWidth="1.5" fill="none" />
                  <circle cx="7" cy="7" r="2" fill="#9370DB" />
                </svg>
                <span style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: "#00BFFF", fontWeight: 700, letterSpacing: "0.15em" }}>HOLO·SYS</span>
              </div>

              {/* ── 立绘区域 ── */}
              <div style={{ position: "relative", height: 220 }}>
                {/* 立绘图片 */}
                <img
                  src={lyriaImg}
                  alt="LYRIA"
                  style={{
                    width: "100%", height: "100%",
                    objectFit: "cover", objectPosition: "center 5%",
                    imageRendering: "high-quality",
                    display: "block",
                    filter: "saturate(1.3) brightness(1.05)",
                    zIndex: 3, position: "relative",
                    willChange: "transform",
                    transform: "translateZ(0)",
                  }}
                />
                {/* 底部渐变遮罩 — 深紫色 */}
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0, height: 80,
                  background: "linear-gradient(0deg, rgba(14,5,40,0.95) 0%, transparent 100%)",
                  zIndex: 4,
                }} />
                {/* 底部 LYRIA·A.I. 名字栏 */}
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  padding: "6px 10px",
                  zIndex: 5, display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span style={{
                    fontFamily: "'Courier New', monospace", fontSize: 12, fontWeight: 900,
                    letterSpacing: "0.15em", color: "#FF69B4",
                    textShadow: "0 0 8px #FF69B4, 0 0 20px rgba(255,105,180,0.6)",
                  }}>LYRIA · A.I.</span>
                  <span style={{
                    background: "rgba(0,191,255,0.15)",
                    border: "1.5px solid rgba(0,191,255,0.6)",
                    padding: "2px 6px",
                    fontFamily: "'Courier New', monospace", fontSize: 9, fontWeight: 900,
                    color: "#00BFFF", letterSpacing: "0.1em",
                    textShadow: "0 0 6px #00BFFF",
                    boxShadow: "0 0 6px rgba(0,191,255,0.3)",
                  }}>DIGITAL TWIN</span>
                </div>
              </div>

              {/* ── 底部全息数据格 ── */}
              <div style={{
                borderTop: "2px solid rgba(147,112,219,0.5)",
                padding: "8px 10px 10px",
                position: "relative", zIndex: 5,
                background: "rgba(10,5,30,0.6)",
              }}>
                {/* 标题行 */}
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: 9, fontWeight: 700, color: "#9370DB", letterSpacing: "0.2em", marginBottom: 4 }}>
                  // DIGITAL TWIN · SYS_ID:0x7F3A
                </div>
                <div style={{
                  fontSize: 48, fontWeight: 900, lineHeight: 0.88,
                  letterSpacing: "-0.04em", fontFamily: "'Courier New', monospace",
                  color: "#fff",
                  textShadow: "0 0 15px rgba(147,112,219,0.8), 0 0 30px rgba(147,112,219,0.4)",
                }}>
                  Micro<br />Earth.
                </div>
                {/* 全息彩虹下划线 */}
                <div style={{ display: "flex", gap: 3, marginTop: 7 }}>
                  <div style={{ height: 3, flex: 2, background: "#FF69B4", boxShadow: "0 0 6px #FF69B4" }} />
                  <div style={{ height: 3, flex: 1, background: "#9370DB", boxShadow: "0 0 6px #9370DB" }} />
                  <div style={{ height: 3, flex: 1, background: "#00BFFF", boxShadow: "0 0 6px #00BFFF" }} />
                  <div style={{ height: 3, flex: 1, background: "#FFEE00", boxShadow: "0 0 6px #FFEE00" }} />
                </div>
                <p style={{ marginTop: 6, fontFamily: "'Courier New', monospace", fontSize: 11, color: "rgba(0,191,255,0.85)", lineHeight: 1.5, fontWeight: 600 }}>
                  LangGraph · Open-Meteo<br />实时气象数字孪生
                </p>
                {/* 底部全息数据行 */}
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <span style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: "rgba(147,112,219,0.7)", letterSpacing: "0.08em" }}>SYS·ONLINE</span>
                  <span style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: "rgba(255,105,180,0.7)", letterSpacing: "0.08em" }}>v0.8.0·P8</span>
                  <span style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: "rgba(0,191,255,0.7)", letterSpacing: "0.08em" }}>HOLO·MODE</span>
                </div>
              </div>

            </div>
          </motion.div>

          {/* 系统状态 — 粉白亮化 */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
            <div style={{ border: "3px solid #000", boxShadow: "5px 5px 0 0 #FF69B4", overflow: "hidden" }}>
              {/* 标题栏 — 霓虹粉底 */}
              <div style={{ background: "#FF1493", padding: "4px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "'Courier New', monospace", fontSize: 11, fontWeight: 900, color: "#fff", letterSpacing: "0.12em" }}>
                  SYSTEM STATUS
                </span>
                <span style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: "#FFE0EF", fontWeight: 700 }}>ONLINE</span>
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

          {/* v5.0: What-If 灾害沙盘 */}
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

        {/* 中央地图 + Temporal Scrubber */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.12 }}
          style={{ minWidth: 0, display: "flex", flexDirection: "column", height: "100%", gap: 8 }}
        >
          {/* 地图卡片 */}
          <div style={{
            border: "3px solid #000", boxShadow: "6px 6px 0 0 #000",
            background: "#000", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
            minHeight: 0,
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
                [*] GEO VIZ -- {region.toUpperCase()} WEATHER GRID
              </span>
              <div style={{
                background: "#FF69B4", color: "#000", border: "none",
                fontFamily: "'Courier New', monospace", fontSize: 12, fontWeight: 900,
                padding: "2px 8px", letterSpacing: "0.06em",
                boxShadow: "0 0 8px #FF69B4, 0 0 16px rgba(255,105,180,0.3)",
              }}>MAP: ON</div>
            </div>
            {/* 地图本体 */}
            <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
              <ErrorBoundary>
                <EarthMap region={region} lat={lat} lon={lon} />
              </ErrorBoundary>
            </div>
          </div>

          {/* v6.0: Temporal Scrubber — 地图正下方 */}
          <TemporalScrubber />
        </motion.div>

        {/* 右侧：Agent 终端 — 粉白主题 */}
        <motion.div
          initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
          style={{ display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden", height: "100%" }}
        >
          {/* Tab 标题栏 — 霓虹粉主色 */}
          <div style={{ display: "flex", border: "3px solid #000", borderBottom: "none", flexShrink: 0 }}>
            {["STREAM", "LOG"].map((tab, i) => (
              <div key={tab} style={{
                flex: 1, padding: "6px 0", fontFamily: "'Courier New', monospace", fontWeight: 900,
                fontSize: 12, letterSpacing: "0.1em", textAlign: "center",
                borderRight: i === 0 ? "2px solid #000" : "none",
                background: i === 0 ? "#FF1493" : "#ffe0ef",
                color: i === 0 ? "#fff" : "#FF69B4",
              }}>{tab}</div>
            ))}
          </div>
          <div style={{
            border: "3px solid #000", borderTop: "none",
            boxShadow: "5px 5px 0 0 #FF69B4",
            flex: 1, display: "flex", flexDirection: "column",
            background: "#fff",
            minHeight: 0, overflow: "hidden",
          }}>
            <AgentTerminal region={region} lat={lat} lon={lon} />
          </div>
        </motion.div>

        {/* 最右侧：Analytics 仪表盘 + 多城并发雷达 */}
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.15 }}
          style={{ display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden", gap: 8, height: "100%" }}
        >
          <div style={{ flex: "1 1 0", minHeight: 0, overflow: "auto" }}>
            <AnalyticsDashboard riskData={riskData} region={region} />
          </div>
          <div style={{ flex: "1 1 0", minHeight: 0, display: "flex", flexDirection: "column" }}>
            <MultiCityRadar wsBaseUrl={WS_BASE} />
          </div>
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
        <span style={{ color: "#FF69B4", fontWeight: 900, letterSpacing: "0.08em" }}>CYBER-LAB MEMPHIS · v11.3</span>
        <span style={{ color: geojsonData ? "#00FF00" : "#333", fontWeight: 700 }}>
          {geojsonData ? `[OK] open-meteo.com` : "// NO DATA"}
        </span>
      </footer>
    </div>
  );
}

