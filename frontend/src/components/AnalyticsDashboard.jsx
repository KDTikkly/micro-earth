/**
 * AnalyticsDashboard — Phase 3 野兽派数据仪表盘
 * 显示极端天气风险指数、24h 气温柱状图
 */
import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";

const RISK_COLORS = {
  CRITICAL: { bg: "#FF0044", text: "#fff",    accent: "#FFE66D" },
  HIGH:     { bg: "#FF6B00", text: "#fff",    accent: "#FFE66D" },
  MODERATE: { bg: "#FFE66D", text: "#1A1A1A", accent: "#FFB5A7" },
  LOW:      { bg: "#B5EAD7", text: "#1A1A1A", accent: "#9BF6FF" },
  SAFE:     { bg: "#C7B8EA", text: "#1A1A1A", accent: "#B5EAD7" },
  UNKNOWN:  { bg: "#f0f0f0", text: "#bbb",    accent: "#ddd"    },
};

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}
    >
      {/* ── 风险指数主卡 ── */}
      <div style={{
        border: "3px solid #1A1A1A",
        boxShadow: isDanger ? "6px 6px 0 0 #FF0044" : "5px 5px 0 0 #1A1A1A",
        background: colorSet.bg,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* 标题栏 */}
        <div style={{
          borderBottom: "2px solid #1A1A1A",
          padding: "6px 12px",
          background: "#1A1A1A",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontFamily: "'Courier New', monospace", fontWeight: 900, fontSize: 11, color: "#FFE66D", letterSpacing: "0.1em" }}>
            RISK ANALYTICS
          </span>
          <span style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: "#888" }}>
            {region.toUpperCase()}
          </span>
        </div>

        <div style={{ padding: "14px 14px 12px" }}>
          {risk !== null ? (
            <>
              {/* 指数大字 */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 8 }}>
                <motion.div
                  animate={isDanger ? { scale: [1, 1.04, 1] } : {}}
                  transition={{ duration: 1, repeat: Infinity }}
                  style={{
                    fontFamily: "'Courier New', monospace",
                    fontSize: 64, fontWeight: 900,
                    color: colorSet.text,
                    lineHeight: 1,
                    letterSpacing: "-0.04em",
                  }}
                >
                  {risk}
                </motion.div>
                <div style={{ paddingBottom: 8 }}>
                  <div style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: colorSet.text, opacity: 0.7, fontWeight: 700 }}>/100</div>
                  <div style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: colorSet.text, opacity: 0.7 }}>RISK IDX</div>
                </div>
              </div>

              {/* 等级标签 */}
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "#1A1A1A", color: colorSet.accent,
                padding: "3px 10px",
                fontFamily: "'Courier New', monospace", fontWeight: 900, fontSize: 13,
                letterSpacing: "0.1em", marginBottom: 8,
              }}>
                {isDanger && <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.7, repeat: Infinity }}>⚠</motion.span>}
                {level}
              </div>

              {/* 进度条 */}
              <div style={{ marginBottom: 8 }}>
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

              {/* 摘要 */}
              <p style={{
                fontFamily: "'Courier New', monospace", fontSize: 11,
                color: colorSet.text, opacity: 0.85, lineHeight: 1.5, margin: 0,
              }}>
                {summary}
              </p>

              {/* DANGER 闪烁警告（CRITICAL 时） */}
              {level === "CRITICAL" && (
                <motion.div
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  style={{
                    marginTop: 10,
                    border: "3px solid #1A1A1A",
                    background: "#FFE66D",
                    padding: "6px 0",
                    textAlign: "center",
                    fontFamily: "'Courier New', monospace",
                    fontWeight: 900, fontSize: 18,
                    letterSpacing: "0.15em", color: "#1A1A1A",
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

      {/* ── 24h 气温柱状图 ── */}
      <div style={{
        border: "3px solid #1A1A1A",
        boxShadow: "4px 4px 0 0 #1A1A1A",
        background: "#C7B8EA",
        flex: 1,
      }}>
        {/* 标题栏 */}
        <div style={{
          borderBottom: "2px solid #1A1A1A",
          padding: "6px 12px",
          background: "#1A1A1A",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontFamily: "'Courier New', monospace", fontWeight: 900, fontSize: 11, color: "#C7B8EA", letterSpacing: "0.1em" }}>
            24H TEMP CHART
          </span>
          {hourly.length > 0 && (
            <span style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: "#888" }}>
              {minTemp}°~{maxTemp}°C
            </span>
          )}
        </div>

        <div style={{ padding: "10px 10px 6px" }}>
          {hourly.length > 0 ? (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 90 }}>
              {hourly.map((t, i) => {
                const pct = ((t - minTemp) / tempRange) * 100;
                const barH = Math.max(pct * 0.82, 6);
                const hot = t > 32;
                const cold = t < 10;
                const barColor = hot ? "#FF6B00" : cold ? "#9BF6FF" : "#FFE66D";
                return (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: barH }}
                    transition={{ duration: 0.5, delay: i * 0.02 }}
                    title={`${i}:00 — ${t}°C`}
                    style={{
                      flex: 1,
                      height: barH,
                      background: barColor,
                      border: "1.5px solid #1A1A1A",
                      minWidth: 4,
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <p style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: "#999", margin: 0 }}>
              // 气温序列等待中...
            </p>
          )}

          {/* X 轴标签 */}
          {hourly.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              {[0, 6, 12, 18, 23].map(h => (
                <span key={h} style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: "#666", fontWeight: 700 }}>
                  {String(h).padStart(2, "0")}h
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
