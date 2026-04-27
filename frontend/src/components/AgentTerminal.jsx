/**
 * AgentTerminal — Blueprint Neo-Brutalism 版
 * 白底 + 粉彩按钮 + 图纸风日志打印
 */
import { useEffect, useRef, useCallback, useState } from "react";
import { useAgentStore } from "../store/agentStore";

const NODE_COLORS = {
  FetchData:      "#00FF00",
  DataRetriever:  "#00FF00",
  Geocoder:       "#00FFFF",
  PhysicsEngine:  "#FF00FF",
  EntitySimulator:"#FFEE00",
  Process:        "#00FFFF",
  Finish:         "#6200EE",
  start:          "#FF6600",
  done:           "#00FF00",
  error:          "#FF0055",
  geojson:        "#00FFFF",
  geocoded:       "#00FFFF",
  risk:           "#FF0055",
  trade:          "#FFEE00",
  entities:       "#00FF00",
  cmd:            "#FF6600",
};

export default function AgentTerminal({ region = "深圳", lat = 22.69, lon = 114.39 }) {
  const { logs, status, appendLog, setStatus, setGeoJson, clearLogs, setRegion, setCoords } = useAgentStore();
  const bottomRef = useRef(null);
  const wsRef     = useRef(null);
  const [cmdInput, setCmdInput] = useState("");
  const [cmdFocus, setCmdFocus] = useState(false);

  const connect = useCallback((cityQuery = "") => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    clearLogs();
    setStatus("CONNECTING");

    const ws = new WebSocket(`ws://localhost:8000/ws/agent-stream`);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("RUNNING");
      ws.send(JSON.stringify({
        region,
        lat,
        lon,
        city_query: cityQuery || region,
      }));
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        const ts   = new Date().toLocaleTimeString();
        if (data.event === "geojson")  setGeoJson(data.data);
        if (data.event === "geocoded" && data.data) {
          setRegion(data.data.region);
          setCoords(data.data.lat, data.data.lon);
        }
        if (data.event === "risk" && data.data) {
          useAgentStore.getState().setRiskData(data.data);
        }
        if (data.event === "entities" && data.data) {
          useAgentStore.getState().setEntityData(data.data);
        }
        if (data.event === "trade" && data.data) {
          useAgentStore.getState().appendTrade(data.data);
        }
        if (data.event === "done")  setStatus("IDLE");
        if (data.event === "error") setStatus("ERROR");
        appendLog({ ...data, ts });
      } catch {
        appendLog({ event: "raw", message: e.data, ts: new Date().toLocaleTimeString() });
      }
    };

    ws.onerror = () => {
      setStatus("ERROR");
      appendLog({ event: "error", message: "[ERROR] WebSocket 连接失败", ts: new Date().toLocaleTimeString() });
    };

    ws.onclose = () => { if (status !== "ERROR") setStatus("IDLE"); };
  }, [region, lat, lon, appendLog, setStatus, setGeoJson, clearLogs, setRegion, setCoords, status]);

  const handleCommand = (e) => {
    if (e.key !== "Enter") return;
    const cmd = cmdInput.trim();
    if (!cmd) return;
    setCmdInput("");
    appendLog({ event: "cmd", message: `> ${cmd}`, ts: new Date().toLocaleTimeString() });
    connect(cmd);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const isRunning = status === "RUNNING" || status === "CONNECTING";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* 工具栏 */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 12px", borderBottom: "2px solid #000",
        background: "#000",
        fontFamily: "'Courier New', monospace", fontSize: 13, color: "#999",
        flexShrink: 0, gap: 8,
      }}>
        <span style={{ fontWeight: 900, color: "#00FF00", fontSize: 12, whiteSpace: "nowrap", letterSpacing: "0.1em" }}>▶ AGENT STREAM</span>
        <span style={{ color: "#FFEE00", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 700 }}>{region}</span>
      </div>

      {/* 日志区 */}
      <div className="terminal-panel" style={{
        flex: 1, padding: "10px 12px",
        minHeight: 0,
        overflowY: "auto", lineHeight: 1.7,
        fontFamily: "'Courier New', monospace", fontSize: 14,
      }}>
        {logs.length === 0 && (
          <p style={{ color: "#ccc", fontStyle: "italic", fontSize: 14 }}>// 等待工作流启动...</p>
        )}
        {logs.map((log, i) => {
          const nodeColor = NODE_COLORS[log.node] ?? NODE_COLORS[log.event] ?? "#555";
          return (
            <div key={i} style={{ marginBottom: 3 }}>
              <span style={{ color: "#aaa", fontSize: 13 }}>[{log.ts}] </span>
              <span style={{ color: nodeColor, fontWeight: 700, fontSize: 14 }}>{log.message}</span>
            </div>
          );
        })}
        {isRunning && (
          <div className="cursor-blink" style={{ color: "#1A1A1A" }}>&nbsp;</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 指令输入框 */}
      <div style={{
        padding: "8px 12px",
        borderTop: "2px solid #1A1A1A",
        background: "#0D0D0D",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span style={{ fontFamily: "'Courier New', monospace", fontSize: 12, color: "#555", fontWeight: 700, letterSpacing: "0.1em" }}>CITY CMD</span>
        </div>
        <div style={{
          display: "flex", alignItems: "center",
          border: "2px solid #1A1A1A",
          boxShadow: cmdFocus ? "4px 4px 0px 0px #FF0055" : "2px 2px 0 0 #333",
          transition: "box-shadow 0.1s",
          background: "#0D0D0D",
          overflow: "hidden",
        }}>
          <span style={{ padding: "0 8px", color: "#00FF88", fontFamily: "'Courier New', monospace", fontSize: 16, fontWeight: 700 }}>$</span>
          <input
            type="text"
            value={cmdInput}
            onChange={(e) => setCmdInput(e.target.value)}
            onKeyDown={handleCommand}
            onFocus={() => setCmdFocus(true)}
            onBlur={() => setCmdFocus(false)}
            placeholder="输入城市... e.g. Tokyo"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#00FF88",
              fontFamily: "'Courier New', monospace",
              fontSize: 14,
              fontWeight: 700,
              padding: "8px 4px",
              letterSpacing: "0.04em",
            }}
          />
          <span style={{
            padding: "0 8px",
            color: "#444",
            fontFamily: "'Courier New', monospace",
            fontSize: 13,
          }}>↵</span>
        </div>
      </div>

      {/* 操作按钮 */}
      <div style={{
        display: "flex", gap: 8, padding: "8px 12px",
        borderTop: "2px solid #000", background: "#111",
      }}>
        {/* RUN 按钮 */}
        <div style={{ flex: 1, position: "relative" }}>
          <div style={{
            position: "absolute", inset: 0,
            transform: "translate(4px, 4px)",
            background: "#00AA00",
            border: "2px solid #000",
          }} />
          <button
            onClick={connect}
            disabled={isRunning}
            style={{
              position: "relative",
              width: "100%",
              padding: "10px 0",
              background: isRunning ? "#333" : "#00FF00",
              color: isRunning ? "#555" : "#000",
              border: "2px solid #000",
              fontFamily: "'Courier New', monospace",
              fontWeight: 900, fontSize: 15,
              letterSpacing: "0.08em", textTransform: "uppercase",
              cursor: isRunning ? "not-allowed" : "pointer",
              boxShadow: isRunning ? "none" : "0 0 10px rgba(0,255,0,0.5)",
            }}
            onMouseEnter={(e) => { if (!isRunning) e.currentTarget.style.transform = "translate(2px,2px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translate(0,0)"; }}
            onMouseDown={(e) => { if (!isRunning) e.currentTarget.style.transform = "translate(4px,4px)"; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = "translate(0,0)"; }}
          >
            {isRunning ? "▶ RUNNING..." : "▶ RUN WORKFLOW"}
          </button>
        </div>

        {/* CLEAR 按钮 */}
        <div style={{ position: "relative" }}>
          <div style={{
            position: "absolute", inset: 0,
            transform: "translate(3px, 3px)",
            background: "#AA0033", border: "2px solid #000",
          }} />
          <button
            onClick={clearLogs}
            style={{
              position: "relative",
              padding: "10px 18px",
              background: "#FF0055",
              color: "#fff",
              border: "2px solid #000",
              fontFamily: "'Courier New', monospace",
              fontWeight: 900, fontSize: 14,
              letterSpacing: "0.08em",
              cursor: "pointer",
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = "translate(3px,3px)"; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = "translate(0,0)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translate(0,0)"; }}
          >
            CLR
          </button>
        </div>
      </div>
    </div>
  );
}
