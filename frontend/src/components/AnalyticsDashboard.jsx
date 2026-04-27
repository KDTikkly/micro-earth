/**
 * AnalyticsDashboard — v9.0  Web3/DeFi Edition
 * Cyber Memphis · Hard Black Border · Drop Shadow
 *
 * Panels:
 *   1. RISK ANALYTICS          — Risk index + animated alert
 *   2. AMM ASSET PRICE CHART   — Bold solid line chart (霓虹粉 6px)
 *   3. ENTITY STATUS PIE       — High-contrast明黄 / 霓虹粉
 *   4. TX HASH LOG             — Real on-chain hashes (last 50)
 *   5. 24H TEMP BARS           — Legacy temperature bars
 */
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
  PieChart, Pie, Cell,
} from "recharts";
import { useAgentStore } from "../store/agentStore";

// ── Design tokens ─────────────────────────────────────────────────────────
const NEON_PINK   = "#FF1493";
const NEON_YELLOW = "#FFE62A";
const NEON_CYAN   = "#00FFEE";
const NEON_GREEN  = "#00FF88";
const NEON_BLUE   = "#00BFFF";
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
const PIE_COLORS  = [NEON_YELLOW, NEON_PINK, NEON_GREEN];
const PIE_LABELS  = ["SAFE", "EVACUATING", "RESCUED"];

// ── Cyber Memphis Card container ──────────────────────────────────────────
function Card({ title, tag, children, accent = NEON_PINK, shadowColor = BLACK, style = {} }) {
  return (
    <div style={{
      background: WHITE,
      border:     `4px solid ${BLACK}`,
      boxShadow:  `8px 8px 0 0 ${shadowColor}`,
      flexShrink: 0,
      ...style,
    }}>
      {/* Header bar */}
      <div style={{
        background:    BLACK,
        borderBottom:  `3px solid ${BLACK}`,
        padding:       "5px 12px",
        display:       "flex",
        alignItems:    "center",
        justifyContent:"space-between",
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
            fontFamily: "'Courier New', monospace",
            fontSize:   9,
            color:      "#555",
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

// ── Price label on line chart ─────────────────────────────────────────────
function PriceTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].value;
  return (
    <div style={{
      background:  BLACK,
      border:      `2px solid ${NEON_PINK}`,
      padding:     "4px 8px",
      fontFamily:  "'Courier New', monospace",
      fontSize:    11,
      color:       NEON_PINK,
      boxShadow:   `4px 4px 0 0 ${NEON_PINK}`,
    }}>
      {typeof p === "number" ? p.toFixed(4) : "—"} MUSD
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function AnalyticsDashboard({ riskData = null, region = "—" }) {
  const risk     = riskData?.risk_index ?? null;
  const level    = riskData?.risk_level ?? "UNKNOWN";
  const summary  = riskData?.summary    ?? "Awaiting simulation data...";
  const hourly   = riskData?.hourly_temps ?? [];
  const isDanger = level === "CRITICAL" || level === "HIGH";
  const colorSet = RISK_COLORS[level] ?? RISK_COLORS.UNKNOWN;

  const maxTemp   = hourly.length ? Math.max(...hourly) : 40;
  const minTemp   = hourly.length ? Math.min(...hourly) : 0;
  const tempRange = maxTemp - minTemp || 1;

  const entityData      = useAgentStore((s) => s.entityData);
  const ammPriceHistory = useAgentStore((s) => s.ammPriceHistory);
  const tradeHashLog    = useAgentStore((s) => s.tradeHashLog);
  const tradeLog        = useAgentStore((s) => s.tradeLog);
  const stats           = entityData?.stats ?? null;

  const safeCount       = stats?.safe_count       ?? stats?.normal_count ?? 0;
  const evacuatingCount = stats?.evacuating_count ?? stats?.panic_count  ?? 0;
  const rescuedCount    = stats?.rescued_count    ?? 0;
  const total           = stats?.total_entities   ?? 100;
  const disasterActive  = stats?.disaster_active  ?? false;
  const chainMode       = (tradeHashLog[0]?.chain_mode) ?? false;

  // ── AMM line chart data ──────────────────────────────────────────────
  // Pad with flat 50.0 baseline if no trades yet
  const INITIAL_PRICE = 50.0;
  const lineData = ammPriceHistory.length > 0
    ? ammPriceHistory.map((p, i) => ({ i, price: p.price ?? INITIAL_PRICE, t: p.t ?? i }))
    : Array.from({ length: 16 }, (_, i) => ({ i, price: INITIAL_PRICE, t: i }));

  const currentPrice  = ammPriceHistory.length
    ? (ammPriceHistory[ammPriceHistory.length - 1].price ?? INITIAL_PRICE)
    : INITIAL_PRICE;
  const priceChange   = currentPrice - INITIAL_PRICE;
  const priceChangePct = ((priceChange / INITIAL_PRICE) * 100).toFixed(2);

  // ── Pie chart data ──────────────────────────────────────────────────
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

              {/* Risk progress bar */}
              <div style={{ height: 10, background: "rgba(0,0,0,0.2)", border: `2px solid ${BLACK}`, marginBottom: 7 }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${risk}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{ height: "100%", background: isDanger ? "#FF0044" : BLACK }}
                />
              </div>

              <p style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: colorSet.text, opacity: 0.9, lineHeight: 1.5, margin: 0 }}>
                {summary}
              </p>

              {level === "CRITICAL" && (
                <motion.div
                  animate={{ opacity: [1, 0.15, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  style={{
                    marginTop:  8,
                    border:     `3px solid ${BLACK}`,
                    background: NEON_YELLOW,
                    boxShadow:  `4px 4px 0 0 ${BLACK}`,
                    padding:    "5px 0",
                    textAlign:  "center",
                    fontFamily: "'Courier New', monospace",
                    fontWeight: 900,
                    fontSize:   15,
                    letterSpacing: "0.15em",
                    color:      BLACK,
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
          2. AMM ASSET PRICE LINE CHART
      ─────────────────────────────────────────────────────── */}
      <Card
        title="AMM ASSET PRICE"
        tag={chainMode ? "ON-CHAIN | HARDHAT" : "SIMULATED | x*y=k"}
        accent={NEON_PINK}
        shadowColor={NEON_PINK}
        style={{ flexShrink: 0 }}
      >
        {/* Price header row */}
        <div style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          padding:        "6px 12px 0",
          background:     WHITE,
        }}>
          <span style={{ fontFamily: "'Courier New', monospace", fontSize: 22, fontWeight: 900, color: BLACK, letterSpacing: "-0.02em" }}>
            {currentPrice.toFixed(4)}
            <span style={{ fontSize: 10, marginLeft: 4, color: "#666" }}>MUSD/DYNA</span>
          </span>
          <span style={{
            fontFamily: "'Courier New', monospace",
            fontSize:   11,
            fontWeight: 900,
            color:      priceChange < 0 ? "#FF0044" : NEON_GREEN,
            background: BLACK,
            padding:    "2px 8px",
            border:     `2px solid ${priceChange < 0 ? "#FF0044" : NEON_GREEN}`,
            boxShadow:  `3px 3px 0 0 ${priceChange < 0 ? "#FF0044" : NEON_GREEN}`,
          }}>
            {priceChange >= 0 ? "+" : ""}{priceChangePct}%
          </span>
        </div>

        <div style={{ padding: "4px 4px 8px", background: WHITE }}>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={lineData} margin={{ top: 6, right: 10, left: -22, bottom: 0 }}>
              <CartesianGrid stroke="#e0e0e0" strokeWidth={1} strokeDasharray="3 3" />
              <XAxis dataKey="i" hide />
              <YAxis
                tick={{ fontFamily: "'Courier New', monospace", fontSize: 9, fill: BLACK, fontWeight: 700 }}
                axisLine={{ stroke: BLACK, strokeWidth: 2 }}
                tickLine={{ stroke: BLACK }}
                domain={["auto", "auto"]}
              />
              {/* Initial price reference line */}
              <ReferenceLine
                y={INITIAL_PRICE}
                stroke={NEON_YELLOW}
                strokeWidth={2}
                strokeDasharray="6 3"
              />
              <Tooltip content={<PriceTooltip />} />
              <Line
                type="linear"
                dataKey="price"
                stroke={NEON_PINK}
                strokeWidth={6}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>

          {ammPriceHistory.length === 0 && (
            <p style={{
              fontFamily: "'Courier New', monospace", fontSize: 10,
              color: "#bbb", margin: "0 12px 4px", textAlign: "center",
            }}>
              // initial price: {INITIAL_PRICE} MUSD/DYNA (10:500 pool)
            </p>
          )}
        </div>
      </Card>

      {/* ──────────────────────────────────────────────────────
          3. ENTITY STATUS PIE CHART
      ─────────────────────────────────────────────────────── */}
      {hasPie && (
        <Card
          title="ENTITY STATUS"
          tag={`TOTAL ${total}`}
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
                    width: 14, height: 14,
                    background: PIE_COLORS[idx],
                    border:     `2px solid ${WHITE}`,
                    flexShrink: 0,
                    boxShadow:  `2px 2px 0 0 ${WHITE}`,
                  }} />
                  <span style={{
                    fontFamily: "'Courier New', monospace",
                    fontSize:   10, fontWeight: 900, color: WHITE, flex: 1,
                  }}>
                    {PIE_LABELS[idx]}
                  </span>
                  <span style={{
                    fontFamily:  "'Courier New', monospace",
                    fontSize:    14, fontWeight: 900,
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
                    fontSize:      9, color: "#FF0044", fontWeight: 900,
                    marginTop:     5, letterSpacing: "0.1em",
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

      {/* ──────────────────────────────────────────────────────
          4. TX HASH LOG — real on-chain hashes
      ─────────────────────────────────────────────────────── */}
      <Card
        title="TX HASH LOG"
        tag="LAST 50 TRADES"
        accent={NEON_GREEN}
        shadowColor={NEON_GREEN}
        style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
      >
        <div style={{
          flex:       1,
          minHeight:  0,
          overflowY:  "scroll",
          overflowX:  "hidden",
          background: "#000",
          padding:    "6px 10px",
        }}>
          {tradeHashLog.length === 0 && tradeLog.length === 0 && (
            <p style={{
              fontFamily: "'Courier New', monospace", fontSize: 11,
              color: "#1a3a1a", margin: 0, fontStyle: "italic",
            }}>
              // awaiting trade events...
            </p>
          )}

          {/* Real hash entries */}
          {tradeHashLog.map((t, i) => (
            <div key={i} style={{ marginBottom: 4, display: "flex", flexDirection: "column", gap: 1 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: NEON_CYAN,    flexShrink: 0 }}>{t.ts}</span>
                <span style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: NEON_YELLOW,  flexShrink: 0, fontWeight: 900 }}>
                  #{String(t.entity_id ?? 0).padStart(3, "0")}
                </span>
                <span style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: NEON_PINK,    flexShrink: 0, fontWeight: 900 }}>
                  {(t.action ?? "").slice(0, 10)}
                </span>
                {t.chain_mode && (
                  <span style={{ fontFamily: "'Courier New', monospace", fontSize: 8, color: NEON_GREEN, border: `1px solid ${NEON_GREEN}`, padding: "0 3px" }}>
                    ON-CHAIN
                  </span>
                )}
              </div>
              <span style={{ fontFamily: "'Courier New', monospace", fontSize: 8, color: NEON_GREEN, wordBreak: "break-all", paddingLeft: 2 }}>
                {t.hash}
              </span>
            </div>
          ))}

          {/* Fallback: tradeLog without hashes */}
          {tradeHashLog.length === 0 && tradeLog.map((evt, i) => (
            <div key={i} style={{ marginBottom: 3 }}>
              <span style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: NEON_CYAN }}>{evt.ts} </span>
              <span style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: NEON_PINK, fontWeight: 900 }}>
                {evt.action}{" "}
              </span>
              <span style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: NEON_GREEN }}>
                #{String(evt.entity_id ?? 0).padStart(3, "0")} {evt.status ?? ""}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* ──────────────────────────────────────────────────────
          5. 24H TEMP BARS (legacy)
      ─────────────────────────────────────────────────────── */}
      {hourly.length > 0 && (
        <Card
          title="24H TEMP"
          tag={`${minTemp}~${maxTemp}C`}
          accent={NEON_YELLOW}
          shadowColor={BLACK}
          style={{ flexShrink: 0 }}
        >
          <div style={{ padding: "8px 10px 6px", background: WHITE }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 60 }}>
              {hourly.map((t, i) => {
                const pct  = ((t - minTemp) / tempRange) * 100;
                const barH = Math.max(pct * 0.5, 3);
                const hot  = t > 32; const cold = t < 10;
                return (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: barH }}
                    transition={{ duration: 0.4, delay: i * 0.015 }}
                    title={`${i}:00 - ${t}C`}
                    style={{
                      flex: 1, height: barH,
                      background: hot ? "#FF6B00" : cold ? NEON_CYAN : NEON_YELLOW,
                      border: `1.5px solid ${BLACK}`,
                      minWidth: 3,
                    }}
                  />
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
              {[0, 6, 12, 18, 23].map(h => (
                <span key={h} style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: BLACK, fontWeight: 700 }}>
                  {String(h).padStart(2, "0")}h
                </span>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
