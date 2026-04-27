/**
 * AnalyticsDashboard — Phase 4
 * 新增：Dynamic Asset Trading Hub
 * - 实时资产均值折线图
 * - 交易事件滚动日志
 * - 实体状态分布条
 */
import { motion } from "framer-motion";
import { useAgentStore } from "../store/agentStore";

const RISK_COLORS = {
  CRITICAL: { bg: "#FF0044", text: "#fff",    accent: "#FFE66D" },
  HIGH:     { bg: "#FF6B00", text: "#fff",    accent: "#FFE66D" },
  MODERATE: { bg: "#FFE66D", text: "#1A1A1A", accent: "#FFB5A7" },
  LOW:      { bg: "#B5EAD7", text: "#1A1A1A", accent: "#9BF6FF" },
  SAFE:     { bg: "#C7B8EA", text: "#1A1A1A", accent: "#B5EAD7" },
  UNKNOWN:  { bg: "#f0f0f0", text: "#bbb",    accent: "#ddd"    },
};

const ACTION_COLORS = {
  EMERGENCY_SELL:      "#FF0044",
  FORCED_LIQUIDATION:  "#FF0044",
  DISTRESS_SWAP:       "#FF6B00",
  PARTIAL_SELL:        "#FF6B00",
  HEDGE_SWAP:          "#FFE66D",
  RISK_TRANSFER:       "#FFE66D",
  DEFENSIVE_REBALANCE: "#9BF6FF",
  SHORT_HEDGE:         "#9BF6FF",
  REBALANCE:           "#B5EAD7",
  HOLD:                "#C7B8EA",
  MICRO_ADJUST:        "#C7B8EA",
};

// ── 极简折线图组件 ──────────────────────────────────────────
function Sparkline({ data, width = "100%", height = 56 }) {
  if (!data || data.length < 2) {
    return (
      <div style={{
        height, display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Courier New', monospace", fontSize: 11, color: "#bbb",
      }}>
        // 等待数据...
      </div>
    );
  }

  const W = 260;
  const H = height;
  const pad = 4;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v - min) / range) * (H - pad * 2);
    return `${x},${y}`;
  });

  const polyline = pts.join(" ");
  const last = pts[pts.length - 1].split(",");

  // 填充区域
  const areaPath = `M${pts[0]} L${pts.join(" L")} L${last[0]},${H} L${pad},${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width, height, display: "block" }}>
      {/* 填充区 */}
      <path d={areaPath} fill="rgba(155,246,255,0.18)" />
      {/* 折线 */}
      <polyline points={polyline} fill="none" stroke="#9BF6FF" strokeWidth="2" strokeLinejoin="round" />
      {/* 最新点高亮 */}
      <circle cx={last[0]} cy={last[1]} r="3.5" fill="#FFE66D" stroke="#1A1A1A" strokeWidth="1.5" />
    </svg>
  );
}

export default function AnalyticsDashboard({ riskData = null, region = "—" }) {
  const risk      = riskData?.risk_index ?? null;
  const level     = riskData?.risk_level ?? "UNKNOWN";
  const summary   = riskData?.summary ?? "等待推演数据...";
  const hourly    = riskData?.hourly_temps ?? [];
  const isDanger  = level === "CRITICAL" || level === "HIGH";
  const colorSet  = RISK_COLORS[level] ?? RISK_COLORS.UNKNOWN;

  const maxTemp = hourly.length ? Math.max(...hourly) : 40;
  const minTemp = hourly.length ? Math.min(...hourly) : 0;
  const tempRange = maxTemp - minTemp || 1;

  // Phase 4 数据
  const entityData   = useAgentStore((s) => s.entityData);
  const tradeLog     = useAgentStore((s) => s.tradeLog);
  const assetHistory = useAgentStore((s) => s.assetHistory);
  const stats        = entityData?.stats ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%", overflow: "hidden" }}
    >
      {/* ── 风险指数主卡 ── */}
      <div style={{
        border: "3px solid #1A1A1A",
        boxShadow: isDanger ? "6px 6px 0 0 #FF0044" : "5px 5px 0 0 #1A1A1A",
        background: colorSet.bg,
        position: "relative",
        flexShrink: 0,
      }}>
        <div style={{
          borderBottom: "2px solid #1A1A1A", padding: "6px 12px",
          background: "#1A1A1A",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontFamily: "'Courier New', monospace", fontWeight: 900, fontSize: 12, color: "#FFE66D", letterSpacing: "0.1em" }}>
            RISK ANALYTICS
          </span>
          <span style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: "#888" }}>
            {region.toUpperCase()}
          </span>
        </div>

        <div style={{ padding: "12px 14px 10px" }}>
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
              </div>

              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "#1A1A1A", color: colorSet.accent,
                padding: "3px 10px", marginBottom: 7,
                fontFamily: "'Courier New', monospace", fontWeight: 900, fontSize: 13,
                letterSpacing: "0.1em",
              }}>
                {isDanger && <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.7, repeat: Infinity }}>⚠</motion.span>}
                {level}
              </div>

              <div style={{ marginBottom: 7 }}>
                <div style={{ height: 10, background: "rgba(0,0,0,0.2)", border: "2px solid #1A1A1A", position: "relative" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${risk}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    style={{
                      height: "100%",
                      background: isDanger
                        ? "repeating-linear-gradient(45deg,#fff,#fff 4px,transparent 4px,transparent 8px)"
                        : "#1A1A1A",
                    }}
                  />
                </div>
              </div>

              <p style={{
                fontFamily: "'Courier New', monospace", fontSize: 11,
                color: colorSet.text, opacity: 0.85, lineHeight: 1.5, margin: 0,
              }}>
                {summary}
              </p>

              {level === "CRITICAL" && (
                <motion.div
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  style={{
                    marginTop: 8, border: "3px solid #1A1A1A", background: "#FFE66D",
                    padding: "5px 0", textAlign: "center",
                    fontFamily: "'Courier New', monospace",
                    fontWeight: 900, fontSize: 16, letterSpacing: "0.15em", color: "#1A1A1A",
                  }}
                >
                  !! DANGER !!
                </motion.div>
              )}
            </>
          ) : (
            <p style={{ fontFamily: "'Courier New', monospace", fontSize: 12, color: "#bbb", margin: 0 }}>
              // 等待推演结果...
            </p>
          )}
        </div>
      </div>

      {/* ── Phase 4: Dynamic Asset Trading Hub ── */}
      <div style={{
        border: "3px solid #1A1A1A",
        boxShadow: "4px 4px 0 0 #1A1A1A",
        background: "#0D0D0D",
        display: "flex", flexDirection: "column",
        flex: 1, minHeight: 0, overflow: "hidden",
      }}>
        {/* 标题栏 */}
        <div style={{
          borderBottom: "2px solid #333",
          padding: "6px 12px",
          background: "#1A1A1A",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <span style={{ fontFamily: "'Courier New', monospace", fontWeight: 900, fontSize: 12, color: "#FFE66D", letterSpacing: "0.08em" }}>
            ◈ ASSET TRADING HUB
          </span>
          {stats && (
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: "#00FF88", fontWeight: 700 }}
            >
              LIVE
            </motion.span>
          )}
        </div>

        {/* 实体状态分布条 */}
        {stats ? (
          <div style={{ padding: "8px 12px", borderBottom: "1px solid #222", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <div style={{ flex: 1, textAlign: "center", background: "#0D3A5C", border: "1.5px solid #1A6AFF", padding: "4px 0" }}>
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: 18, fontWeight: 900, color: "#9BF6FF" }}>
                  {stats.normal_count}
                </div>
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: "#9BF6FF", letterSpacing: "0.06em" }}>NORMAL</div>
              </div>
              <div style={{ flex: 1, textAlign: "center", background: "#3A2D00", border: "1.5px solid #FFE66D", padding: "4px 0" }}>
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: 18, fontWeight: 900, color: "#FFE66D" }}>
                  {stats.stressed_count}
                </div>
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: "#FFE66D", letterSpacing: "0.06em" }}>STRESSED</div>
              </div>
              <div style={{ flex: 1, textAlign: "center", background: "#3A0014", border: "1.5px solid #FF0044", padding: "4px 0" }}>
                <motion.div
                  animate={stats.panic_count > 0 ? { opacity: [1, 0.5, 1] } : {}}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  style={{ fontFamily: "'Courier New', monospace", fontSize: 18, fontWeight: 900, color: "#FF0044" }}
                >
                  {stats.panic_count}
                </motion.div>
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: "#FF0044", letterSpacing: "0.06em" }}>PANIC</div>
              </div>
            </div>

            {/* 均值资产 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: "#555", fontWeight: 700 }}>AVG ASSET</span>
              <span style={{
                fontFamily: "'Courier New', monospace", fontSize: 16, fontWeight: 900,
                color: stats.avg_asset_value < 600 ? "#FF6B00" : "#00FF88",
              }}>
                {stats.avg_asset_value}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ padding: "8px 12px", borderBottom: "1px solid #222", flexShrink: 0 }}>
            <p style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: "#444", margin: 0 }}>
              // 等待实体模拟器...
            </p>
          </div>
        )}

        {/* 资产历史折线图 */}
        <div style={{ padding: "8px 12px", borderBottom: "1px solid #222", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: "#555", fontWeight: 700, letterSpacing: "0.08em" }}>
              AVG ASSET CURVE
            </span>
            {assetHistory.length > 0 && (
              <span style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: "#555" }}>
                {assetHistory.length} ticks
              </span>
            )}
          </div>
          <Sparkline data={assetHistory} height={52} />
        </div>

        {/* 交易事件滚动日志 */}
        <div style={{
          flex: 1, minHeight: 0, overflowY: "auto",
          padding: "6px 10px",
        }}>
          {tradeLog.length === 0 ? (
            <p style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: "#333", margin: 0, fontStyle: "italic" }}>
              // 等待交易触发...
            </p>
          ) : (
            tradeLog.map((evt, i) => {
              const accentColor = ACTION_COLORS[evt.action] ?? "#9BF6FF";
              const isPanic = evt.status === "PANIC";
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    marginBottom: 4,
                    padding: "4px 8px",
                    borderLeft: `3px solid ${accentColor}`,
                    background: isPanic ? "rgba(255,0,68,0.08)" : "rgba(255,255,255,0.03)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                    <span style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: "#555" }}>
                      {evt.ts}
                    </span>
                    <span style={{
                      fontFamily: "'Courier New', monospace", fontSize: 10, fontWeight: 900,
                      color: accentColor, letterSpacing: "0.04em",
                    }}>
                      {evt.action}
                    </span>
                  </div>
                  <div style={{
                    fontFamily: "'Courier New', monospace", fontSize: 12, fontWeight: 700,
                    color: isPanic ? "#FF6B6B" : "#ccc",
                    marginTop: 1,
                  }}>
                    Entity #{String(evt.entity_id).padStart(3, "0")}
                    <span style={{ color: "#555", fontWeight: 400, fontSize: 11 }}> ↓{evt.depreciation_pct}% → </span>
                    <span style={{ color: accentColor }}>{evt.asset_value?.toFixed(0)}</span>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* ── 24h 气温柱状图（精简版） ── */}
      {hourly.length > 0 && (
        <div style={{
          border: "3px solid #1A1A1A",
          boxShadow: "4px 4px 0 0 #1A1A1A",
          background: "#C7B8EA",
          flexShrink: 0,
        }}>
          <div style={{
            borderBottom: "2px solid #1A1A1A",
            padding: "5px 12px",
            background: "#1A1A1A",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontFamily: "'Courier New', monospace", fontWeight: 900, fontSize: 11, color: "#C7B8EA", letterSpacing: "0.1em" }}>
              24H TEMP
            </span>
            <span style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: "#888" }}>
              {minTemp}°~{maxTemp}°C
            </span>
          </div>
          <div style={{ padding: "8px 10px 6px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 72 }}>
              {hourly.map((t, i) => {
                const pct = ((t - minTemp) / tempRange) * 100;
                const barH = Math.max(pct * 0.65, 4);
                const hot = t > 32; const cold = t < 10;
                return (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: barH }}
                    transition={{ duration: 0.4, delay: i * 0.015 }}
                    title={`${i}:00 — ${t}°C`}
                    style={{
                      flex: 1, height: barH,
                      background: hot ? "#FF6B00" : cold ? "#9BF6FF" : "#FFE66D",
                      border: "1.5px solid #1A1A1A", minWidth: 3,
                    }}
                  />
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
              {[0, 6, 12, 18, 23].map(h => (
                <span key={h} style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: "#666", fontWeight: 700 }}>
                  {String(h).padStart(2, "0")}h
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
