/**
 * MultiCityRadar — v10.0  GLOBAL MULTI-CITY DISASTER RADAR
 * Cyber Memphis · Hard Black Border · Hard Shadow
 *
 * Features:
 *  - 实时滚动显示所有并发城市的风险指数 + 实体撤离存活率
 *  - 点击城市警报条目 → 触发 agentStore.flyToCity → EarthMap flyTo 3D 跃迁
 *  - 启动 /ws/multi-stream 并发 WebSocket，按 city_key 路由事件
 *  - 高对比度赛博孟菲斯风格
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAgentStore } from "../store/agentStore";

// ── Design tokens ──────────────────────────────────────────────────────────
const NEON_PINK   = "#FF1493";
const NEON_YELLOW = "#FFE62A";
const NEON_CYAN   = "#00FFEE";
const NEON_GREEN  = "#00FF88";
const NEON_BLUE   = "#00BFFF";
const NEON_PURPLE = "#BF5FFF";
const NEON_RED    = "#FF0044";
const BLACK       = "#000000";
const WHITE       = "#FFFFFF";

// 预设并发城市列表（可扩展）
const DEFAULT_CITIES = ["深圳", "北京", "上海", "成都", "东京", "纽约"];

// 城市坐标映射（用于 flyTo）
const CITY_COORDS = {
  "深圳": [114.39, 22.69],
  "北京": [116.39, 39.91],
  "上海": [121.47, 31.23],
  "成都": [104.07, 30.57],
  "东京": [139.69, 35.68],
  "纽约": [-74.01, 40.71],
  "伦敦": [-0.12, 51.51],
  "孟买": [72.88, 19.08],
};

// 风险等级颜色
function riskColor(level) {
  switch (level) {
    case "CRITICAL": return NEON_RED;
    case "HIGH":     return "#FF6600";
    case "MODERATE": return NEON_YELLOW;
    case "LOW":      return NEON_GREEN;
    case "SAFE":     return NEON_CYAN;
    default:         return "#555";
  }
}

function riskBg(level) {
  switch (level) {
    case "CRITICAL": return "rgba(255,0,68,0.18)";
    case "HIGH":     return "rgba(255,102,0,0.14)";
    case "MODERATE": return "rgba(255,230,42,0.12)";
    case "LOW":      return "rgba(0,255,136,0.10)";
    default:         return "rgba(30,30,30,0.7)";
  }
}

// 存活率计算
function survivalRate(stats) {
  if (!stats) return null;
  const total = stats.total_entities ?? 100;
  const safe  = (stats.safe_count ?? stats.normal_count ?? 0) + (stats.rescued_count ?? 0);
  return total > 0 ? Math.round((safe / total) * 100) : null;
}

// ── 单城市雷达条目 ────────────────────────────────────────────────────────
function CityRadarRow({ city, data, isActive, onClick }) {
  const level    = data?.risk_level  ?? "UNKNOWN";
  const riskIdx  = data?.risk_index  ?? null;
  const stats    = data?.stats       ?? null;
  const survival = survivalRate(stats);
  const evac     = stats?.evacuating_count ?? stats?.panic_count ?? 0;
  const rescued  = stats?.rescued_count    ?? 0;
  const total    = stats?.total_entities   ?? 100;
  const isDanger = level === "CRITICAL" || level === "HIGH";
  const isLoading = !data;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      onClick={() => onClick(city)}
      style={{
        cursor:       "pointer",
        border:       `3px solid ${isActive ? NEON_CYAN : BLACK}`,
        borderLeft:   `6px solid ${riskColor(level)}`,
        background:   isActive ? "rgba(0,255,238,0.08)" : riskBg(level),
        boxShadow:    isActive
          ? `4px 4px 0 0 ${NEON_CYAN}, inset 0 0 12px rgba(0,255,238,0.08)`
          : `3px 3px 0 0 ${riskColor(level)}`,
        padding:      "8px 10px",
        marginBottom: 6,
        position:     "relative",
        transition:   "border-color 0.2s, box-shadow 0.2s",
        userSelect:   "none",
      }}
    >
      {/* 城市名 + 风险等级 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* 活跃闪烁指示灯 */}
          {isDanger && (
            <motion.div
              animate={{ opacity: [1, 0.1, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              style={{ width: 8, height: 8, borderRadius: "50%", background: NEON_RED, flexShrink: 0, boxShadow: `0 0 6px ${NEON_RED}` }}
            />
          )}
          <span style={{
            fontFamily:    "'Courier New', monospace",
            fontSize:      13,
            fontWeight:    900,
            color:         WHITE,
            letterSpacing: "0.08em",
            textShadow:    isActive ? `0 0 8px ${NEON_CYAN}` : "none",
          }}>
            {city}
          </span>
          {isLoading && (
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: "#555", letterSpacing: "0.1em" }}
            >
              LOADING...
            </motion.span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {riskIdx !== null && (
            <span style={{
              fontFamily:    "'Courier New', monospace",
              fontSize:      20,
              fontWeight:    900,
              color:         riskColor(level),
              textShadow:    `0 0 8px ${riskColor(level)}`,
              letterSpacing: "-0.03em",
            }}>
              {riskIdx}
            </span>
          )}
          <span style={{
            fontFamily:    "'Courier New', monospace",
            fontSize:      9,
            fontWeight:    900,
            color:         BLACK,
            background:    riskColor(level),
            padding:       "2px 6px",
            border:        `1.5px solid ${BLACK}`,
            letterSpacing: "0.1em",
          }}>
            {level}
          </span>
        </div>
      </div>

      {/* 实体状态快速栏 */}
      {stats && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 5 }}>
          <span style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: NEON_RED, fontWeight: 900 }}>
            ⚠ {evac} EVAC
          </span>
          <span style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: NEON_GREEN, fontWeight: 900 }}>
            [OK] {rescued} SAFE
          </span>
          {survival !== null && (
            <span style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: NEON_CYAN, fontWeight: 900, marginLeft: "auto" }}>
              SURVIVAL {survival}%
            </span>
          )}
        </div>
      )}

      {/* 存活率进度条 */}
      {survival !== null && (
        <div style={{ height: 6, background: "#1a1a1a", border: `1.5px solid #333`, overflow: "hidden" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${survival}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{
              height:     "100%",
              background: survival >= 70 ? NEON_GREEN : survival >= 40 ? NEON_YELLOW : NEON_RED,
              boxShadow:  `0 0 6px ${survival >= 70 ? NEON_GREEN : survival >= 40 ? NEON_YELLOW : NEON_RED}`,
            }}
          />
        </div>
      )}

      {/* 疏散进度条 */}
      {stats && (
        <div style={{ height: 4, background: "#1a1a1a", border: `1px solid #222`, overflow: "hidden", marginTop: 3 }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${total > 0 ? Math.round((evac / total) * 100) : 0}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{
              height:     "100%",
              background: NEON_RED,
              boxShadow:  `0 0 4px ${NEON_RED}`,
            }}
          />
        </div>
      )}

      {/* FLY TO 提示 */}
      {isActive && (
        <div style={{
          position:      "absolute",
          top:           4,
          right:         6,
          fontFamily:    "'Courier New', monospace",
          fontSize:      8,
          color:         NEON_CYAN,
          fontWeight:    900,
          letterSpacing: "0.12em",
          textShadow:    `0 0 6px ${NEON_CYAN}`,
        }}>
          ▶ LOCKED
        </div>
      )}

      {/* Click hint */}
      {!isActive && (
        <div style={{
          position:   "absolute",
          top:        4,
          right:      6,
          fontFamily: "'Courier New', monospace",
          fontSize:   8,
          color:      "#333",
        }}>
          CLICK TO FLY
        </div>
      )}
    </motion.div>
  );
}

// ── 并发吞吐量仪表 ────────────────────────────────────────────────────────
function ThroughputMeter({ eventCount, cityCount, isRunning }) {
  return (
    <div style={{
      display:        "flex",
      alignItems:     "center",
      gap:            10,
      padding:        "5px 10px",
      background:     "#0a0a0a",
      borderBottom:   `2px solid #222`,
      fontFamily:     "'Courier New', monospace",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {isRunning ? (
          <motion.div
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 0.4, repeat: Infinity }}
            style={{ width: 8, height: 8, borderRadius: "50%", background: NEON_GREEN, boxShadow: `0 0 6px ${NEON_GREEN}` }}
          />
        ) : (
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#333" }} />
        )}
        <span style={{ fontSize: 9, color: isRunning ? NEON_GREEN : "#444", fontWeight: 900, letterSpacing: "0.1em" }}>
          {isRunning ? "CONCURRENT" : "IDLE"}
        </span>
      </div>
      <span style={{ fontSize: 9, color: NEON_CYAN, fontWeight: 900 }}>
        {cityCount} CITIES
      </span>
      <span style={{ fontSize: 9, color: "#555" }}>|</span>
      <span style={{ fontSize: 9, color: NEON_PURPLE, fontWeight: 700 }}>
        {eventCount} EVENTS
      </span>
      <span style={{ fontSize: 9, color: "#555", marginLeft: "auto" }}>
        /ws/multi-stream
      </span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function MultiCityRadar({ wsBaseUrl = "ws://localhost:8000" }) {
  const flyToCity     = useAgentStore((s) => s.flyToCity);
  const activeCityKey = useAgentStore((s) => s.activeCityKey);
  const setActiveCityKey = useAgentStore((s) => s.setActiveCityKey);

  // 城市数据字典：{ cityName: { risk_index, risk_level, stats, last_updated } }
  const [cityData, setCityData]     = useState({});
  const [isRunning, setIsRunning]   = useState(false);
  const [eventCount, setEventCount] = useState(0);
  const [recentLog, setRecentLog]   = useState([]);
  const [selectedCities, setSelectedCities] = useState(DEFAULT_CITIES.slice(0, 4));

  const wsRef   = useRef(null);
  const logRef  = useRef(null);

  // 追加日志（最近20条）
  const pushLog = useCallback((msg, color = "#888") => {
    setRecentLog((prev) => [{ msg, color, ts: new Date().toLocaleTimeString() }, ...prev].slice(0, 20));
  }, []);

  // 启动并发 WebSocket
  const startMulti = useCallback(() => {
    if (wsRef.current) { wsRef.current.close(); }

    const ws = new WebSocket(`${wsBaseUrl}/ws/multi-stream`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsRunning(true);
      setEventCount(0);
      setCityData({});
      setRecentLog([]);
      ws.send(JSON.stringify({
        cities:            selectedCities,
        temp_offset:       0.0,
        precip_multiplier: 1.0,
      }));
      pushLog(`[LAUNCH] Concurrent simulation: [${selectedCities.join(", ")}]`, NEON_CYAN);
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        const cityKey = data.city_key;

        setEventCount((n) => n + 1);

        // 路由到对应城市数据槽
        if (cityKey) {
          if (data.event === "risk" && data.data) {
            setCityData((prev) => ({
              ...prev,
              [cityKey]: {
                ...(prev[cityKey] ?? {}),
                risk_index:  data.data.risk_index,
                risk_level:  data.data.risk_level,
                last_updated: new Date().toLocaleTimeString(),
              },
            }));
          }
          if (data.event === "entities" && data.data?.stats) {
            setCityData((prev) => ({
              ...prev,
              [cityKey]: {
                ...(prev[cityKey] ?? {}),
                stats:        data.data.stats,
                last_updated: new Date().toLocaleTimeString(),
              },
            }));
          }
          if (data.event === "geocoded" && data.data) {
            setCityData((prev) => ({
              ...prev,
              [cityKey]: {
                ...(prev[cityKey] ?? {}),
                lat: data.data.lat,
                lon: data.data.lon,
                last_updated: new Date().toLocaleTimeString(),
              },
            }));
          }
        }

        // 全局日志
        if (data.event === "multi_start") {
          pushLog(data.message, NEON_CYAN);
        }
        if (data.event === "multi_done") {
          pushLog(data.message, NEON_GREEN);
          setIsRunning(false);
        }
        if (data.event === "error") {
          pushLog(data.message ?? "[ERROR]", NEON_RED);
        }

        // 灾害警告日志
        const msg = data.message ?? "";
        if (msg.includes("[WARNING]") || msg.includes("initiating emergency")) {
          pushLog(`[${cityKey ?? "?"}] ${msg}`, "#FF4444");
        }

      } catch {
        // ignore malformed
      }
    };

    ws.onerror = () => {
      pushLog("[WS ERROR] Connection failed — check backend", NEON_RED);
      setIsRunning(false);
    };

    ws.onclose = () => {
      setIsRunning(false);
    };
  }, [selectedCities, wsBaseUrl, pushLog]);

  // 点击城市 → flyTo
  const handleCityClick = useCallback((city) => {
    setActiveCityKey(city);
    const coords = cityData[city]?.lat != null
      ? [cityData[city].lon, cityData[city].lat]
      : CITY_COORDS[city];
    if (coords && flyToCity) {
      flyToCity({ city, lon: coords[0], lat: coords[1] });
    }
  }, [cityData, flyToCity, setActiveCityKey]);

  // 城市选择切换
  const toggleCity = useCallback((city) => {
    setSelectedCities((prev) =>
      prev.includes(city)
        ? prev.length > 1 ? prev.filter((c) => c !== city) : prev
        : [...prev, city].slice(0, 8)
    );
  }, []);

  // 滚动日志到底部
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = 0;
  }, [recentLog]);

  // 组件卸载时关闭 WS
  useEffect(() => {
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, []);

  return (
    <div style={{
      display:       "flex",
      flexDirection: "column",
      height:        "100%",
      background:    "#050505",
      border:        `4px solid ${BLACK}`,
      boxShadow:     `8px 8px 0 0 ${NEON_CYAN}`,
      overflow:      "hidden",
    }}>

      {/* ── 标题栏 ── */}
      <div style={{
        background:   `linear-gradient(90deg, ${NEON_CYAN} 0%, ${NEON_PURPLE} 100%)`,
        borderBottom: `3px solid ${BLACK}`,
        padding:      "6px 12px",
        display:      "flex",
        alignItems:   "center",
        justifyContent: "space-between",
        flexShrink:   0,
      }}>
        <span style={{
          fontFamily:    "'Courier New', monospace",
          fontWeight:    900,
          fontSize:      12,
          color:         BLACK,
          letterSpacing: "0.15em",
        }}>
          ◉ GLOBAL DISASTER RADAR
        </span>
        <span style={{
          fontFamily: "'Courier New', monospace",
          fontSize:   9,
          color:      "rgba(0,0,0,0.65)",
          fontWeight: 700,
        }}>
          v10.0 · CONCURRENT
        </span>
      </div>

      {/* ── 吞吐量仪表 ── */}
      <ThroughputMeter
        eventCount={eventCount}
        cityCount={selectedCities.length}
        isRunning={isRunning}
      />

      {/* ── 城市选择器 ── */}
      <div style={{
        padding:      "6px 8px",
        borderBottom: `2px solid #111`,
        display:      "flex",
        flexWrap:     "wrap",
        gap:          4,
        flexShrink:   0,
      }}>
        {DEFAULT_CITIES.map((city) => {
          const selected = selectedCities.includes(city);
          return (
            <button
              key={city}
              onClick={() => toggleCity(city)}
              style={{
                fontFamily:  "'Courier New', monospace",
                fontSize:    9,
                fontWeight:  900,
                color:       selected ? BLACK : "#555",
                background:  selected ? NEON_YELLOW : "#111",
                border:      `2px solid ${selected ? BLACK : "#333"}`,
                boxShadow:   selected ? `2px 2px 0 0 ${BLACK}` : "none",
                padding:     "2px 7px",
                cursor:      "pointer",
                letterSpacing: "0.06em",
              }}
            >
              {city}
            </button>
          );
        })}

        {/* 启动按钮 */}
        <div style={{ position: "relative", marginLeft: "auto" }}>
          <div style={{
            position:  "absolute", inset: 0,
            transform: "translate(3px,3px)",
            background: isRunning ? "#880022" : "#006644",
            border:    `2px solid ${BLACK}`,
          }} />
          <button
            onClick={isRunning ? () => { wsRef.current?.close(); setIsRunning(false); } : startMulti}
            style={{
              position:      "relative",
              fontFamily:    "'Courier New', monospace",
              fontSize:      10,
              fontWeight:    900,
              color:         BLACK,
              background:    isRunning ? NEON_RED : NEON_GREEN,
              border:        `2px solid ${BLACK}`,
              padding:       "3px 10px",
              cursor:        "pointer",
              letterSpacing: "0.08em",
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = "translate(3px,3px)"; }}
            onMouseUp={(e)   => { e.currentTarget.style.transform = ""; }}
            onMouseLeave={(e)=> { e.currentTarget.style.transform = ""; }}
          >
            {isRunning ? "[■] STOP" : "[▶] LAUNCH"}
          </button>
        </div>
      </div>

      {/* ── 城市雷达列表 ── */}
      <div style={{
        flex:      1,
        minHeight: 0,
        overflowY: "auto",
        padding:   "8px 8px 4px",
      }}>
        <AnimatePresence>
          {selectedCities.map((city) => (
            <CityRadarRow
              key={city}
              city={city}
              data={cityData[city] ?? null}
              isActive={activeCityKey === city}
              onClick={handleCityClick}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* ── 实时事件日志 ── */}
      <div style={{
        borderTop:  `2px solid #111`,
        flexShrink: 0,
        maxHeight:  110,
        overflow:   "hidden",
        display:    "flex",
        flexDirection: "column",
      }}>
        <div style={{
          padding:    "3px 8px",
          background: "#0a0a0a",
          borderBottom: `1px solid #1a1a1a`,
          fontFamily: "'Courier New', monospace",
          fontSize:   8,
          color:      "#444",
          letterSpacing: "0.12em",
        }}>
          CONCURRENT EVENT STREAM
        </div>
        <div ref={logRef} style={{ flex: 1, overflowY: "auto", padding: "4px 8px 6px", background: "#030303" }}>
          {recentLog.length === 0 && (
            <p style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: "#1a3a1a", margin: 0, fontStyle: "italic" }}>
              // launch concurrent simulation...
            </p>
          )}
          {recentLog.map((l, i) => (
            <div key={i} style={{ marginBottom: 3, display: "flex", gap: 5 }}>
              <span style={{ fontFamily: "'Courier New', monospace", fontSize: 8, color: "#333", flexShrink: 0 }}>{l.ts}</span>
              <span style={{ fontFamily: "'Courier New', monospace", fontSize: 8, color: l.color, wordBreak: "break-all", lineHeight: 1.4 }}>
                {l.msg}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
