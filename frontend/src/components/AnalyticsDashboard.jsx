/**
 * AnalyticsDashboard — v10.0  PHASE 7 SURVIVAL COMMAND TERMINAL
 * Cyber Memphis · Hard Black Border · Hard Shadow
 *
 * Panels:
 *   1. RISK ANALYTICS          — Risk index + evacuation alert
 *   2. DISASTER WARNING LOG    — Physical hazard logs (last 50)
 *   3. SURVIVAL STATUS BAR     — Danger-zone / Safe-zone real-time counter
 *   4. ENTITY STATUS PIE       — SAFE / EVACUATING / RESCUED distribution
 */
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell,
} from "recharts";
import { useAgentStore } from "../store/agentStore";

// ── Design tokens ─────────────────────────────────────────────────────────
const NEON_PINK   = "#FF1493";
const NEON_YELLOW = "#FFE62A";
const NEON_CYAN   = "#00FFEE";
const NEON_GREEN  = "#00FF88";
const NEON_BLUE   = "#00BFFF";
const NEON_PURPLE = "#BF5FFF";
const BLACK       = "#000000";
const WHITE       = "#FFFFFF";

const RISK_COLORS = {
  CRITICAL: { bg: "#FF0044", text: WHITE,    accent: NEON_YELLOW },
  HIGH:     { bg: "#FF6B00", text: WHITE,    accent: NEON_YELLOW },
  MODERATE: { bg: NEON_YELLOW, text: BLACK,  accent: NEON_PINK   },
  LOW:      { bg: "#B5EAD7", text: BLACK,    accent: NEON_CYAN   },
  SAFE:     { bg: "#C7B8EA", text: BLACK,    accent: "#B5EAD7"   },
  UNKNOWN:  { bg: "#1A1A1A", text: "#555",   accent: "#333"      },
};

// Pie: 明黄 → 霓虹粉 → 霓虹绿
const PIE_COLORS = [NEON_BLUE, NEON_PINK, NEON_GREEN];
const PIE_LABELS = ["SAFE", "EVACUATING", "RESCUED"];

// ── Cyber Memphis Card ────────────────────────────────────────────────────
function Card({ title, tag, children, accent = NEON_PINK, shadowColor = BLACK, style = {} }) {
  return (
    <div style={{
      background: WHITE,
      border:     `4px solid ${BLACK}`,
      boxShadow:  `8px 8px 0 0 ${shadowColor}`,
      flexShrink: 0,
      ...style,
    }}>
      <div style={{
        background:     BLACK,
        borderBottom:   `3px solid ${BLACK}`,
        padding:        "5px 12px",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        gap:            8,
      }}>
        <span style={{
          fontFamily:    "'Courier New', monospace",
          fontWeight:    900,
          fontSize:      11,
          color:         accent,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}>
          {title}
        </span>
        {tag && (
          <span style={{
            fontFamily:    "'Courier New', monospace",
            fontSize:      9,
            color:         "#555",
            letterSpacing: "0.05em",
          }}>
            {tag}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Survival Progress Bar ─────────────────────────────────────────────────
function EvacProgressBar({ label, value, total, color, shadow }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        display:        "flex",
        justifyContent: "space-between",
        alignItems:     "center",
        marginBottom:   4,
      }}>
        <span style={{
          fontFamily:    "'Courier New', monospace",
          fontSize:      10,
          fontWeight:    900,
          color:         BLACK,
          letterSpacing: "0.1em",
        }}>
          {label}
        </span>
        <span style={{
          fontFamily: "'Courier New', monospace",
          fontSize:   13,
          fontWeight: 900,
          color:      color,
          background: BLACK,
          padding:    "1px 8px",
          border:     `2px solid ${color}`,
          boxShadow:  `3px 3px 0 0 ${color}`,
        }}>
          {value} <span style={{ fontSize: 9, opacity: 0.7 }}>/ {total}</span>
        </span>
      </div>
      <div style={{
        height:     14,
        background: "#e8e8e8",
        border:     `2.5px solid ${BLACK}`,
        boxShadow:  `2px 2px 0 0 ${BLACK}`,
        overflow:   "hidden",
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            height:     "100%",
            background: color,
            boxShadow:  `0 0 10px ${shadow ?? color}`,
          }}
        />
      </div>
      <div style={{
        fontFamily: "'Courier New', monospace",
        fontSize:   9,
        color:      "#888",
        marginTop:  2,
        textAlign:  "right",
      }}>
        {pct}%
      </div>
    </div>
  );
}

// ── Warning log entry classifier ──────────────────────────────────────────
function logColor(msg = "") {
  if (msg.includes("[CRITICAL]") || msg.includes("Danger radius") || msg.includes("Emergency broadcast")) return "#CC4400";
  if (msg.includes("[WARNING]") || msg.includes("EVACUATING"))  return "#CC1111";
  if (msg.includes("[ON-CHAIN]") || msg.includes("ON-CHAIN"))   return "#007744";
  if (msg.includes("[SIMULATED]") || msg.includes("SWAP"))      return "#007788";
  if (msg.includes("[INFO]") || msg.includes("reached safe"))   return "#007744";
  if (msg.includes("[AMM]"))                                      return "#886600";
  return "#333333";
}

// ── Main component ────────────────────────────────────────────────────────
export default function AnalyticsDashboard({ riskData = null, region = "—" }) {
  const risk    = riskData?.risk_index ?? null;
  const level   = riskData?.risk_level ?? "UNKNOWN";
  const summary = riskData?.summary    ?? "Awaiting simulation data...";
  const hourly  = riskData?.hourly_temps ?? [];

  const isDanger = level === "CRITICAL" || level === "HIGH";
  const colorSet = RISK_COLORS[level] ?? RISK_COLORS.UNKNOWN;

  const entityData       = useAgentStore((s) => s.entityData);
  const tradeLog         = useAgentStore((s) => s.tradeLog);
  const evacuationHistory = useAgentStore((s) => s.evacuationHistory);
  const logs             = useAgentStore((s) => s.logs);

  const stats           = entityData?.stats ?? null;
  const safeCount       = stats?.safe_count       ?? stats?.normal_count ?? 0;
  const evacuatingCount = stats?.evacuating_count ?? stats?.panic_count  ?? 0;
  const rescuedCount    = stats?.rescued_count    ?? 0;
  const total           = stats?.total_entities   ?? 100;
  const disasterActive  = stats?.disaster_active  ?? false;
  const disasterLat     = stats?.disaster_lat     ?? null;
  const disasterLon     = stats?.disaster_lon     ?? null;

  // ── Collect disaster warning logs from agent stream ──────────────────
  const warningLogs = [];
  // priority: tradeLog evac events (contain WARNING/AMM lines)
  for (const evt of tradeLog) {
    if (evt.message && (
      evt.message.includes("[WARNING]") ||
      evt.message.includes("[CRITICAL]") ||
      evt.message.includes("[AMM]") ||
      evt.message.includes("[INFO]")
    )) {
      warningLogs.push({ ts: evt.ts, msg: evt.message });
    }
  }
  // also pull from main logs (evac_logs are piped here by orchestrator)
  for (const l of logs) {
    if (l.event === "entities" || l.event === "trade") continue;
    const msg = l.message ?? "";
    if (
      msg.includes("[WARNING]") ||
      msg.includes("[CRITICAL]") ||
      msg.includes("[AMM]") ||
      msg.includes("[INFO]") ||
      msg.includes("EVACUATING") ||
      msg.includes("evacuat") ||
      msg.includes("Danger radius") ||
      msg.includes("Emergency broadcast")
    ) {
      warningLogs.push({ ts: l.ts, msg });
    }
  }
  // reverse + deduplicate + limit 50
  const seen = new Set();
  const dedupLogs = [];
  for (const l of [...warningLogs].reverse()) {
    if (!seen.has(l.msg)) {
      seen.add(l.msg);
      dedupLogs.push(l);
      if (dedupLogs.length >= 50) break;
    }
  }

  // ── Pie chart ────────────────────────────────────────────────────────
  const pieData = [
    { name: "SAFE",       value: Math.max(safeCount, 0) },
    { name: "EVACUATING", value: Math.max(evacuatingCount, 0) },
    { name: "RESCUED",    value: Math.max(rescuedCount, 0) },
  ];
  const hasPie = pieData.some((d) => d.value > 0);

  return (
    <div style={{
      display:       "flex",
      flexDirection: "column",
      gap:           10,
      height:        "100%",
      overflow:      "hidden",
    }}>

      {/* ──────────────────────────────────────────────────────
          1. RISK ANALYTICS
      ─────────────────────────────────────────────────────── */}
      <Card
        title="RISK ANALYTICS"
        tag={region.toUpperCase()}
        accent={isDanger ? "#FF0044" : NEON_PINK}
        shadowColor={isDanger ? "#FF0044" : BLACK}
        style={{ flexShrink: 0 }}
      >
        <div style={{ padding: "12px 14px 10px", background: colorSet.bg }}>
          {risk !== null ? (
            <>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 6 }}>
                <motion.div
                  animate={isDanger ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  style={{
                    fontFamily:    "'Courier New', monospace",
                    fontSize:      58,
                    fontWeight:    900,
                    color:         colorSet.text,
                    lineHeight:    1,
                    letterSpacing: "-0.04em",
                  }}
                >
                  {risk}
                </motion.div>
                <div style={{ paddingBottom: 6 }}>
                  <div style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: colorSet.text, opacity: 0.7, fontWeight: 700 }}>/100</div>
                  <div style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: colorSet.text, opacity: 0.7 }}>RISK IDX</div>
                </div>
                <div style={{
                  marginLeft:    "auto",
                  background:    BLACK,
                  color:         colorSet.accent,
                  border:        `2px solid ${colorSet.accent}`,
                  padding:       "3px 10px",
                  fontFamily:    "'Courier New', monospace",
                  fontWeight:    900,
                  fontSize:      13,
                  letterSpacing: "0.1em",
                  display:       "flex",
                  alignItems:    "center",
                  gap:           5,
                  boxShadow:     `3px 3px 0 0 ${colorSet.accent}`,
                }}>
                  {isDanger && (
                    <motion.span
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity }}
                    >!!</motion.span>
                  )}
                  {level}
                </div>
              </div>

              {/* Risk bar */}
              <div style={{ height: 10, background: "rgba(0,0,0,0.2)", border: `2px solid ${BLACK}`, marginBottom: 7 }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${risk}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{ height: "100%", background: isDanger ? "#FF0044" : BLACK }}
                />
              </div>

              {disasterLat != null && (
                <p style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: colorSet.text, opacity: 0.85, margin: "0 0 4px" }}>
                  DISASTER: ({disasterLat}, {disasterLon})
                </p>
              )}

              <p style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: colorSet.text, opacity: 0.9, lineHeight: 1.5, margin: 0 }}>
                {summary}
              </p>

              {level === "CRITICAL" && (
                <motion.div
                  animate={{ opacity: [1, 0.15, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  style={{
                    marginTop:     8,
                    border:        `3px solid ${BLACK}`,
                    background:    NEON_YELLOW,
                    boxShadow:     `4px 4px 0 0 ${BLACK}`,
                    padding:       "5px 0",
                    textAlign:     "center",
                    fontFamily:    "'Courier New', monospace",
                    fontWeight:    900,
                    fontSize:      15,
                    letterSpacing: "0.15em",
                    color:         BLACK,
                  }}
                >
                  !! EVACUATION ALERT !!
                </motion.div>
              )}
            </>
          ) : (
            <p style={{ fontFamily: "'Courier New', monospace", fontSize: 12, color: "#555", margin: 0 }}>
              // awaiting simulation...
            </p>
          )}
        </div>
      </Card>

      {/* ──────────────────────────────────────────────────────
          2. DISASTER WARNING LOG (滚动日志)
      ─────────────────────────────────────────────────────── */}
      <Card
        title="DISASTER WARNING LOG"
        tag="LAST 50 EVENTS"
        accent="#FF4444"
        shadowColor="#FF4444"
        style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
      >
        <div style={{
          flex:       1,
          minHeight:  0,
          overflowY:  "scroll",
          overflowX:  "hidden",
          background: "#FFFFFF",
          padding:    "6px 10px",
        }}>
          {dedupLogs.length === 0 && (
            <p style={{
              fontFamily:  "'Courier New', monospace",
              fontSize:    11,
              color:       "#aaaaaa",
              margin:      0,
              fontStyle:   "italic",
            }}>
              // awaiting disaster events...
            </p>
          )}
          {dedupLogs.map((l, i) => (
            <div key={i} style={{ marginBottom: 5, display: "flex", gap: 6, alignItems: "flex-start" }}>
              <span style={{
                fontFamily:  "'Courier New', monospace",
                fontSize:    9,
                color:       "#FF69B4",
                flexShrink:  0,
                paddingTop:  1,
              }}>
                [{l.ts ?? "--:--:--"}]
              </span>
              <span style={{
                fontFamily:  "'Courier New', monospace",
                fontSize:    10,
                fontWeight:  700,
                color:       logColor(l.msg),
                wordBreak:   "break-all",
                lineHeight:  1.45,
              }}>
                {l.msg}
              </span>
            </div>
          ))}

          {/* fallback: 无日志时，展示 tradeLog 事件 */}
          {dedupLogs.length === 0 && tradeLog.map((evt, i) => (
            <div key={i} style={{ marginBottom: 4 }}>
              <span style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: "#FF69B4" }}>{evt.ts} </span>
              <span style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: "#CC1111", fontWeight: 900 }}>
                [WARNING] Entity #{String(evt.entity_id ?? 0).padStart(3, "0")} {evt.action ?? "EVACUATE"}{" "}
              </span>
              <span style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: "#007744" }}>
                — status: {evt.status ?? "EVACUATING"}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* ──────────────────────────────────────────────────────
          3. SURVIVAL STATUS — 进度条
      ─────────────────────────────────────────────────────── */}
      <Card
        title="SURVIVAL STATUS"
        tag={`TOTAL ${total} ENTITIES`}
        accent={NEON_PURPLE}
        shadowColor={NEON_PURPLE}
        style={{ flexShrink: 0 }}
      >
        <div style={{ padding: "12px 14px 8px", background: WHITE }}>
          {/* 危险区滞留 */}
          <EvacProgressBar
            label="[!] IN DANGER ZONE"
            value={evacuatingCount}
            total={total}
            color="#FF0044"
            shadow="#FF4444"
          />
          {/* 已抵达安全区 */}
          <EvacProgressBar
            label="[OK] REACHED SAFE ZONE"
            value={rescuedCount}
            total={total}
            color={NEON_GREEN}
            shadow="#00FFAA"
          />
          {/* 当前安全静止 */}
          <EvacProgressBar
            label="[~] HOLDING POSITION"
            value={safeCount}
            total={total}
            color={NEON_BLUE}
            shadow="#00DFFF"
          />

          {disasterActive && (
            <motion.div
              animate={{ opacity: [1, 0.25, 1] }}
              transition={{ duration: 0.7, repeat: Infinity }}
              style={{
                marginTop:     6,
                background:    "#FF0044",
                border:        `3px solid ${BLACK}`,
                boxShadow:     `4px 4px 0 0 ${BLACK}`,
                padding:       "4px 0",
                textAlign:     "center",
                fontFamily:    "'Courier New', monospace",
                fontWeight:    900,
                fontSize:      11,
                letterSpacing: "0.15em",
                color:         WHITE,
              }}
            >
              !! {evacuatingCount} ENTITIES IN EMERGENCY EVACUATION
            </motion.div>
          )}
        </div>
      </Card>

      {/* ──────────────────────────────────────────────────────
          4. ENTITY STATUS PIE
      ─────────────────────────────────────────────────────── */}
      {hasPie && (
        <Card
          title="ENTITY STATUS DIST"
          tag={`T+${evacuationHistory.length ?? 0} TICKS`}
          accent={NEON_YELLOW}
          shadowColor={NEON_YELLOW}
          style={{ flexShrink: 0 }}
        >
          <div style={{
            display:    "flex",
            alignItems: "center",
            padding:    "8px 10px",
            background: BLACK,
            gap:        12,
          }}>
            <PieChart width={92} height={92}>
              <Pie
                data={pieData}
                cx={42} cy={42}
                innerRadius={18}
                outerRadius={42}
                dataKey="value"
                strokeWidth={4}
                stroke={BLACK}
                isAnimationActive={false}
              >
                {pieData.map((_, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>

            <div style={{ flex: 1 }}>
              {pieData.map((d, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                  <div style={{
                    width:      14,
                    height:     14,
                    background: PIE_COLORS[idx],
                    border:     `2px solid ${WHITE}`,
                    flexShrink: 0,
                    boxShadow:  `2px 2px 0 0 ${WHITE}`,
                  }} />
                  <span style={{
                    fontFamily: "'Courier New', monospace",
                    fontSize:   10,
                    fontWeight: 900,
                    color:      WHITE,
                    flex:       1,
                  }}>
                    {PIE_LABELS[idx]}
                  </span>
                  <span style={{
                    fontFamily:  "'Courier New', monospace",
                    fontSize:    14,
                    fontWeight:  900,
                    color:       PIE_COLORS[idx],
                    textShadow:  `0 0 8px ${PIE_COLORS[idx]}`,
                  }}>
                    {d.value}
                  </span>
                </div>
              ))}

              {disasterActive && (
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  style={{
                    fontFamily:    "'Courier New', monospace",
                    fontSize:      9,
                    color:         "#FF0044",
                    fontWeight:    900,
                    marginTop:     5,
                    letterSpacing: "0.1em",
                    background:    NEON_YELLOW,
                    border:        `2px solid #FF0044`,
                    padding:       "2px 6px",
                    display:       "inline-block",
                  }}
                >
                  !! DISASTER ACTIVE
                </motion.div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
