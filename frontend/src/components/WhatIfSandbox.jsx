/**
 * WhatIfSandbox — v5.0
 * 灾害沙盘控制台：Memphis 赛博风格滑块面板
 * 用户拖动滑块后，触发 What-If API 重新推演并更新热力矩阵
 */
import { useState, useCallback, useRef } from "react";
import { useAgentStore } from "../store/agentStore";
import { HTTP_BASE } from "../utils/wsConfig";

// ── 自定义粗犷滑块 ──────────────────────────────────────────────────────────
function MemphasSlider({ label, value, min, max, step, unit, accentColor, onChange }) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {/* 标签行 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{
          fontFamily: "'Courier New', monospace", fontSize: 10, fontWeight: 900,
          color: "#aaa", letterSpacing: "0.08em", textTransform: "uppercase",
        }}>
          {label}
        </span>
        <span style={{
          fontFamily: "'Courier New', monospace", fontSize: 14, fontWeight: 900,
          color: accentColor, background: "#000",
          border: `2px solid ${accentColor}`,
          padding: "1px 8px",
          boxShadow: `0 0 8px ${accentColor}55`,
          minWidth: 52, textAlign: "center",
        }}>
          {value > 0 && unit === "°C" ? `+${value}` : value}{unit}
        </span>
      </div>

      {/* 滑块轨道 */}
      <div style={{ position: "relative" }}>
        {/* 轨道背景 */}
        <div style={{
          height: 8, background: "#222",
          border: "2px solid #444", boxShadow: "inset 0 2px 0 0 #111",
        }}>
          {/* 填充条 */}
          <div style={{
            height: "100%",
            width: `${pct}%`,
            background: accentColor,
            boxShadow: `0 0 6px ${accentColor}`,
            transition: "width 0.1s",
          }} />
        </div>

        {/* 原生 input[range]，覆盖在轨道上 */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            opacity: 0, cursor: "pointer",
            margin: 0,
          }}
        />

        {/* 滑块手柄（视觉层） */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: `calc(${pct}% - 10px)`,
          transform: "translateY(-50%)",
          width: 20, height: 20,
          background: accentColor,
          border: "3px solid #000",
          boxShadow: `3px 3px 0 0 #000, 0 0 10px ${accentColor}`,
          pointerEvents: "none",
          transition: "left 0.1s",
        }} />
      </div>

      {/* 刻度标注 */}
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Courier New', monospace", fontSize: 9, color: "#555" }}>
        <span>{min}{unit}</span>
        <span>0{unit}</span>
        <span>+{max}{unit}</span>
      </div>
    </div>
  );
}

// ── 主组件 ──────────────────────────────────────────────────────────────────
export default function WhatIfSandbox() {
  const { region, lat, lon, whatIf, setWhatIf, setHeatmap, appendLog } = useAgentStore();
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const debounceRef = useRef(null);

  const triggerWhatIf = useCallback(async (tempOffset, precipMultiplier) => {
    setIsLoading(true);
    const ts = new Date().toLocaleTimeString();
    appendLog({
      event: "log", ts,
      message: `[${ts}] [WhatIf] [!] T${tempOffset >= 0 ? "+" : ""}${tempOffset} degC x P x${precipMultiplier.toFixed(2)} -- re-running...`,
      node: "WhatIf",
    });

    try {
      const res = await fetch(`${HTTP_BASE}/api/what-if`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region, lat, lon,
          temp_offset: tempOffset,
          precip_multiplier: precipMultiplier,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setHeatmap(data.heatmap);
        setLastResult({
          risk: data.risk_data,
          floodCount: data.heatmap?.flood_zones?.length ?? 0,
        });
        const ts2 = new Date().toLocaleTimeString();
        appendLog({
          event: "heatmap", ts: ts2,
          message: `[${ts2}] [WhatIf] [OK] simulation done | risk=${data.risk_data?.risk_index} [${data.risk_data?.risk_level}] | flood=${data.heatmap?.flood_zones?.length ?? 0}`,
          node: "WhatIf",
        });
      }
    } catch (e) {
      const ts3 = new Date().toLocaleTimeString();
      appendLog({
        event: "error", ts: ts3,
        message: `[${ts3}] [WhatIf] [ERROR] request failed: ${e.message}`,
        node: "WhatIf",
      });
    } finally {
      setIsLoading(false);
    }
  }, [region, lat, lon, setHeatmap, appendLog]);

  const handleTempChange = (val) => {
    setWhatIf({ tempOffset: val });
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      triggerWhatIf(val, whatIf.precipMultiplier);
    }, 600);
  };

  const handlePrecipChange = (val) => {
    setWhatIf({ precipMultiplier: val });
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      triggerWhatIf(whatIf.tempOffset, val);
    }, 600);
  };

  const handleReset = () => {
    setWhatIf({ tempOffset: 0.0, precipMultiplier: 1.0 });
    setLastResult(null);
    setHeatmap(null);
  };

  // 风险等级颜色
  const riskColor = {
    CRITICAL: "#FF0055",
    HIGH:     "#FF6600",
    MODERATE: "#FFEE00",
    LOW:      "#00FF00",
    SAFE:     "#00FFFF",
  }[lastResult?.risk?.risk_level] ?? "#555";

  return (
    <div style={{ border: "3px solid #000", boxShadow: "5px 5px 0 0 #FF0055", overflow: "hidden" }}>
      {/* 标题栏 — 霓虹粉 */}
      <div style={{
        background: "#FF0055", borderBottom: "2px solid #000",
        padding: "4px 10px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{
          fontFamily: "'Courier New', monospace", fontSize: 10,
          fontWeight: 900, color: "#fff", letterSpacing: "0.1em",
        }}>
          [!] WHAT-IF SANDBOX
        </span>
        <span style={{
          fontFamily: "'Courier New', monospace", fontSize: 9,
          color: "#ffccdd", fontWeight: 700,
        }}>v5.0</span>
      </div>

      {/* 面板体 — 黑底 */}
      <div style={{ background: "#111", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>

        {/* 温度偏移滑块 */}
        <MemphasSlider
          label="Global Temp Override"
          value={whatIf.tempOffset}
          min={-5}
          max={5}
          step={0.5}
          unit="°C"
          accentColor="#FF6600"
          onChange={handleTempChange}
        />

        {/* 降水倍率滑块 */}
        <MemphasSlider
          label="Precipitation Intensity"
          value={whatIf.precipMultiplier}
          min={0.5}
          max={2.0}
          step={0.05}
          unit="×"
          accentColor="#00FFFF"
          onChange={handlePrecipChange}
        />

        {/* 结果预览行 */}
        <div style={{ borderTop: "1.5px solid #333", paddingTop: 8 }}>
          {isLoading ? (
            <div style={{
              fontFamily: "'Courier New', monospace", fontSize: 11,
              color: "#FFEE00", fontWeight: 700, letterSpacing: "0.06em",
              animation: "none",
            }}>
              {"[>]"} COMPUTING...
            </div>
          ) : lastResult ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{
                background: riskColor, color: "#000",
                border: "2px solid #000", boxShadow: `0 0 8px ${riskColor}`,
                fontFamily: "'Courier New', monospace", fontSize: 10, fontWeight: 900,
                padding: "2px 8px",
              }}>
                {lastResult.risk?.risk_level} {lastResult.risk?.risk_index}
              </span>
              {lastResult.floodCount > 0 && (
                <span style={{
                  background: "#6200EE", color: "#fff",
                  border: "2px solid #000", boxShadow: "0 0 8px #6200EE",
                  fontFamily: "'Courier New', monospace", fontSize: 10, fontWeight: 900,
                  padding: "2px 8px",
                }}>
                  [*] {lastResult.floodCount} FLOOD ZONES
                </span>
              )}
            </div>
          ) : (
            <div style={{
              fontFamily: "'Courier New', monospace", fontSize: 10,
              color: "#555", letterSpacing: "0.04em",
            }}>
              // 拖动滑块触发推演
            </div>
          )}
        </div>

        {/* 重置按钮 */}
        {(whatIf.tempOffset !== 0 || whatIf.precipMultiplier !== 1.0) && (
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, transform: "translate(3px,3px)", background: "#333", border: "2px solid #000" }} />
            <button
              onClick={handleReset}
              style={{
                position: "relative", width: "100%",
                background: "#222", color: "#FFEE00",
                border: "2px solid #FFEE00",
                fontFamily: "'Courier New', monospace", fontWeight: 900,
                fontSize: 11, letterSpacing: "0.08em",
                padding: "5px 0", cursor: "pointer",
              }}
            >
              ↺ RESET TO BASELINE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

