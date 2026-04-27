/**
 * AnalyticsDashboard — v8.0  Cosmolyra Economic Layer
 * Cyber Memphis Edition
 * - AMM 动态资产价格折线图（Recharts · linear · 霓虹粉 4px 线）
 * - 实体状态分布饼图（高对比纯色 · 4px 黑描边）
 * - 交易哈希滚动日志（黑底绿字）
 * - 风险指数主卡
 */
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { useAgentStore } from "../store/agentStore";

const RISK_COLORS = {
  CRITICAL: { bg: "#FF0044", text: "#fff",    accent: "#FFE66D" },
  HIGH:     { bg: "#FF6B00", text: "#fff",    accent: "#FFE66D" },
  MODERATE: { bg: "#FFE66D", text: "#1A1A1A", accent: "#FFB5A7" },
  LOW:      { bg: "#B5EAD7", text: "#1A1A1A", accent: "#9BF6FF" },
  SAFE:     { bg: "#C7B8EA", text: "#1A1A1A", accent: "#B5EAD7" },
  UNKNOWN:  { bg: "#f0f0f0", text: "#bbb",    accent: "#ddd"    },
};

const PIE_COLORS = ["#00BFFF", "#FF1493", "#00FF88"];
const PIE_LABELS = ["SAFE", "EVACUATING", "RESCUED"];

/* ── 卡片外壳 ── */
function Card({ title, tag, children, accent = "#FF1493", style = {} }) {
  return (
    <div style={{
      background: "#fff",
      border: "4px solid #000",
      boxShadow: `6px 6px 0 0 ${accent}`,
      flexShrink: 0,
      ...style,
    }}>
      <div style={{
        background: "#000",
        borderBottom: "3px solid #000",
        padding: "5px 12px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontFamily: "'Courier New', monospace", fontWeight: 900, fontSize: 11, color: accent, letterSpacing: "0.1em" }}>
          {title}
        </span>
        {tag && (
          <span style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: "#666" }}>{tag}</span>
        )}
      </div>
      {children}
    </div>
  );
}

export default function AnalyticsDashboard({ riskData = null, region = "—" }) {
  const risk     = riskData?.risk_index ?? null;
  const level    = riskData?.risk_level ?? "UNKNOWN";
  const summary  = riskData?.summary ?? "等待推演数据...";
  const hourly   = riskData?.hourly_temps ?? [];
  const isDanger = level === "CRITICAL" || level === "HIGH";
  const colorSet = RISK_COLORS[level] ?? RISK_COLORS.UNKNOWN;

  const maxTemp  = hourly.length ? Math.max(...hourly) : 40;
  const minTemp  = hourly.length ? Math.min(...hourly) : 0;
  const tempRange = maxTemp - minTemp || 1;

  const entityData       = useAgentStore((s) => s.entityData);
  const tradeLog         = useAgentStore((s) => s.tradeLog);
  const ammPriceHistory  = useAgentStore((s) => s.ammPriceHistory);
  const tradeHashLog     = useAgentStore((s) => s.tradeHashLog);
  const stats            = entityData?.stats ?? null;

  const safeCount       = stats?.safe_count       ?? stats?.normal_count ?? 0;
  const evacuatingCount = stats?.evacuating_count ?? stats?.panic_count  ?? 0;
  const rescuedCount    = stats?.rescued_count    ?? 0;
  const total           = stats?.total_entities   ?? 100;
  const disasterActive  = stats?.disaster_active  ?? false;

  // AMM 折线图数据
  const lineData = ammPriceHistory.length > 0
    ? ammPriceHistory.map((p, i) => ({ i, price: p.price ?? 1000, t: p.t ?? i }))
    : Array.from({ length: 12 }, (_, i) => ({ i, price: 1000, t: i }));

  // 饼图数据
  const pieData = [
    { name: "SAFE",       value: Math.max(safeCount, 0) },
    { name: "EVACUATING", value: Math.max(evacuatingCount, 0) },
    { name: "RESCUED",    value: Math.max(rescuedCount, 0) },
  ];
  const hasPie = pieData.some((d) => d.value > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%", overflow: "hidden" }}>

      {/* ── 风险指数主卡 ── */}
      <Card title="RISK ANALYTICS" tag={region.toUpperCase()} accent={isDanger ? "#FF0044" : "#FF1493"} style={{ flexShrink: 0 }}>
        <div style={{ padding: "12px 14px 10px", background: colorSet.bg }}>
          {risk !== null ? (
            <>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 6 }}>
                <motion.div
                  animate={isDanger ? { scale: [1, 1.04, 1] } : {}}
                  transition={{ duration: 1, repeat: Infinity }}
                  style={{
                    fontFamily: "'Courier New', monospace",
                    fontSize: 58, fontWeight: 900,
                    color: colorSet.text, lineHeight: 1, letterSpacing: "-0.04em",
                  }}
                >
                  {risk}
                </motion.div>
                <div style={{ paddingBottom: 6 }}>
                  <div style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: colorSet.text, opacity: 0.7, fontWeight: 700 }}>/100</div>
                  <div style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: colorSet.text, opacity: 0.7 }}>RISK IDX</div>
                </div>
                <div style={{
                  marginLeft: "auto",
                  background: "#000", color: colorSet.accent,
                  padding: "3px 10px",
                  fontFamily: "'Courier New', monospace", fontWeight: 900, fontSize: 13,
                  letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 5,
                }}>
                  {isDanger && <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.7, repeat: Infinity }}>!!</motion.span>}
                  {level}
                </div>
              </div>
              <div style={{ height: 10, background: "rgba(0,0,0,0.15)", border: "2px solid #000", marginBottom: 7 }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${risk}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{ height: "100%", background: isDanger ? "#FF0044" : "#1A1A1A" }}
                />
              </div>
              <p style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: colorSet.text, opacity: 0.85, lineHeight: 1.5, margin: 0 }}>
                {summary}
              </p>
              {level === "CRITICAL" && (
                <motion.div
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  style={{ marginTop: 8, border: "3px solid #000", background: "#FFE66D", padding: "5px 0", textAlign: "center", fontFamily: "'Courier New', monospace", fontWeight: 900, fontSize: 16, letterSpacing: "0.15em", color: "#000" }}
                >
                  !! EVACUATION ALERT !!
                </motion.div>
              )}
            </>
          ) : (
            <p style={{ fontFamily: "'Courier New', monospace", fontSize: 12, color: "#bbb", margin: 0 }}>
              // 等待推演结果...
            </p>
          )}
        </div>
      </Card>

      {/* ── AMM 动态资产价格折线图 ── */}
      <Card title="AMM ASSET PRICE" tag="v8.0 · COSMOLYRA" accent="#FF1493" style={{ flexShrink: 0 }}>
        <div style={{ padding: "10px 4px 6px", background: "#fff" }}>
          <ResponsiveContainer width="100%" height={90}>
            <LineChart data={lineData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid stroke="#000" strokeWidth={1} strokeDasharray="0" />
              <XAxis dataKey="i" hide />
              <YAxis
                tick={{ fontFamily: "'Courier New', monospace", fontSize: 9, fill: "#000", fontWeight: 700 }}
                axisLine={{ stroke: "#000", strokeWidth: 2 }}
                tickLine={{ stroke: "#000" }}
              />
              <Tooltip
                contentStyle={{
                  background: "#000", border: "2px solid #FF1493",
                  fontFamily: "'Courier New', monospace", fontSize: 11, color: "#FF1493",
                }}
                labelStyle={{ color: "#FF1493" }}
                formatter={(v) => [`${v.toFixed(2)}`, "PRICE"]}
              />
              <Line
                type="linear"
                dataKey="price"
                stroke="#FF1493"
                strokeWidth={4}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
          {ammPriceHistory.length === 0 && (
            <p style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: "#bbb", margin: "2px 12px 0", textAlign: "center" }}>
              // 等待 AMM 交易数据...
            </p>
          )}
        </div>
      </Card>

      {/* ── 实体状态饼图 ── */}
      {hasPie && (
        <Card title="ENTITY STATUS" tag={`TOTAL ${total}`} accent="#00BFFF" style={{ flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", padding: "6px 8px", background: "#fff", gap: 10 }}>
            <PieChart width={90} height={90}>
              <Pie
                data={pieData}
                cx={40} cy={40}
                innerRadius={0}
                outerRadius={38}
                dataKey="value"
                strokeWidth={4}
                stroke="#000000"
                isAnimationActive={false}
              >
                {pieData.map((_, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
            <div style={{ flex: 1 }}>
              {pieData.map((d, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <div style={{ width: 12, height: 12, background: PIE_COLORS[idx], border: "2px solid #000", flexShrink: 0 }} />
                  <span style={{ fontFamily: "'Courier New', monospace", fontSize: 10, fontWeight: 900, color: "#000" }}>
                    {PIE_LABELS[idx]}
                  </span>
                  <span style={{ fontFamily: "'Courier New', monospace", fontSize: 12, fontWeight: 900, color: PIE_COLORS[idx], marginLeft: "auto", textShadow: `0 0 4px ${PIE_COLORS[idx]}` }}>
                    {d.value}
                  </span>
                </div>
              ))}
              {disasterActive && (
                <motion.div
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 0.7, repeat: Infinity }}
                  style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: "#FF0044", fontWeight: 900, marginTop: 4, letterSpacing: "0.05em" }}
                >
                  !! DISASTER ACTIVE
                </motion.div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* ── 交易哈希日志 （黑底绿字等宽滚动）── */}
      <Card title="TX HASH LOG" tag="LAST 50 TRADES" accent="#00FF88" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <div
          className="tx-hash-log"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "scroll",
            overflowX: "hidden",
            background: "#000",
            padding: "6px 10px",
          }}
        >
          {tradeHashLog.length === 0 && tradeLog.length === 0 && (
            <p style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: "#1a4a1a", margin: 0, fontStyle: "italic" }}>
              // 等待交易事件...
            </p>
          )}
          {/* 有真实哈希时显示哈希日志 */}
          {tradeHashLog.map((t, i) => (
            <div key={i} style={{ marginBottom: 3, display: "flex", gap: 6, alignItems: "flex-start" }}>
              <span style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: "#00BFFF", flexShrink: 0 }}>{t.ts}</span>
              <span style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: "#FF1493", flexShrink: 0, fontWeight: 900 }}>{t.action?.slice(0, 8)}</span>
              <span style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: "#00FF88", wordBreak: "break-all" }}>{t.hash}</span>
            </div>
          ))}
          {/* 无哈希但有 tradeLog 时降级展示 */}
          {tradeHashLog.length === 0 && tradeLog.map((evt, i) => (
            <div key={i} style={{ marginBottom: 3 }}>
              <span style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: "#00BFFF" }}>{evt.ts} </span>
              <span style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: "#FF1493", fontWeight: 900 }}>{evt.action} </span>
              <span style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: "#00FF88" }}>
                #{String(evt.entity_id ?? 0).padStart(3, "0")} · {evt.status ?? ""}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* ── 24h 气温柱状图（保留）── */}
      {hourly.length > 0 && (
        <Card title="24H TEMP" tag={`${minTemp}~${maxTemp}°C`} accent="#FFEE00" style={{ flexShrink: 0 }}>
          <div style={{ padding: "8px 10px 6px", background: "#fff" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 60 }}>
              {hourly.map((t, i) => {
                const pct = ((t - minTemp) / tempRange) * 100;
                const barH = Math.max(pct * 0.5, 3);
                const hot = t > 32; const cold = t < 10;
                return (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: barH }}
                    transition={{ duration: 0.4, delay: i * 0.015 }}
                    title={`${i}:00 — ${t}°C`}
                    style={{ flex: 1, height: barH, background: hot ? "#FF6B00" : cold ? "#9BF6FF" : "#FFE66D", border: "1.5px solid #000", minWidth: 3 }}
                  />
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
              {[0, 6, 12, 18, 23].map(h => (
                <span key={h} style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: "#000", fontWeight: 700 }}>
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
