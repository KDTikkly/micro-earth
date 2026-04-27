/**
 * AgentTerminal — Blueprint Neo-Brutalism 版
 * 白底 + 粉彩按钮 + 图纸风日志打印
 * v9.0: 聊天室风格日志滑条 + 布局错位修复
 */
import { useEffect, useRef, useCallback, useState } from "react";
import { useAgentStore } from "../store/agentStore";
import { WS_BASE } from "../utils/wsConfig";

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
  const bottomRef    = useRef(null);
  const scrollRef    = useRef(null);
  const wsRef        = useRef(null);
  const [cmdInput, setCmdInput] = useState("");
  const [cmdFocus, setCmdFocus] = useState(false);
  // 聊天室：是否锁定自动滚底
  const [autoScroll, setAutoScroll] = useState(true);

  const connect = useCallback((cityQuery = "") => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    clearLogs();
    setStatus("CONNECTING");

    const ws = new WebSocket(`${WS_BASE}/ws/agent-stream`);
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
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  // 用户手动往上滚时，关闭自动滚底
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 32;
    setAutoScroll(atBottom);
  };

  const isRunning = status === "RUNNING" || status === "CONNECTING";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* 工具栏 — 粉白亮化 */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 12px", borderBottom: "2px solid #000",
        background: "linear-gradient(90deg, #fff5f9 0%, #ffe0ef 100%)",
        fontFamily: "'Courier New', monospace", fontSize: 13, color: "#999",
        flexShrink: 0, gap: 8,
      }}>
        <span style={{ fontWeight: 900, color: "#FF1493", fontSize: 12, whiteSpace: "nowrap", letterSpacing: "0.1em" }}>AGENT STREAM</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#FF69B4", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 700 }}>{region}</span>
          {/* 自动滚底锁定按钮 */}
          <button
            onClick={() => {
              setAutoScroll((v) => {
                if (!v) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
                return !v;
              });
            }}
            title={autoScroll ? "自动滚底：开（点击锁定）" : "已锁定位置（点击解锁）"}
            style={{
              background: autoScroll ? "#FF1493" : "#f0f0f0",
              border: "2px solid #000",
              boxShadow: autoScroll ? "2px 2px 0 0 #000, 0 0 6px rgba(255,20,147,0.4)" : "2px 2px 0 0 #ccc",
              color: autoScroll ? "#fff" : "#aaa",
              fontFamily: "'Courier New', monospace",
              fontSize: 10, fontWeight: 900,
              padding: "2px 7px",
              cursor: "pointer",
              letterSpacing: "0.08em",
              flexShrink: 0,
              transition: "background 0.15s",
            }}
          >
            {autoScroll ? "LIVE" : "PAUSED"}
          </button>
        </div>
      </div>

      {/* ── 聊天室日志区 — 粉白亮化，严格高度约束 ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="agent-log-pink"
        style={{
          flex: 1,
          minHeight: 0,           /* 关键：防止 flex 子元素撑破父容器 */
          maxHeight: "100%",      /* 确保不超出父容器 */
          overflowY: "scroll",    /* 始终显示滚动条，避免宽度跳动 */
          overflowX: "hidden",
          padding: "10px 12px",
          lineHeight: 1.7,
          fontFamily: "'Courier New', monospace",
          fontSize: 12,
          background: "#fff",
        }}
      >
        {logs.length === 0 && (
          <p style={{ color: "#ccc", fontStyle: "italic", fontSize: 12 }}>// 等待工作流启动...</p>
        )}
        {logs.map((log, i) => {
          const raw = NODE_COLORS[log.node] ?? NODE_COLORS[log.event] ?? "#aaa";
          // 亮色模式下将纯黑/极深色替换为可读的深粉/深蓝
          const nodeColor = raw === "#555" || raw === "#333" ? "#999" : raw;
          return (
            <div key={i} style={{ marginBottom: 2, wordBreak: "break-all" }}>
              <span style={{ color: "#FF69B4", fontSize: 10, userSelect: "none" }}>[{log.ts}] </span>
              <span style={{ color: nodeColor, fontWeight: 700, fontSize: 12 }}>{log.message}</span>
            </div>
          );
        })}
        {isRunning && (
          <div style={{ color: "#FF1493", fontFamily: "'Courier New', monospace" }}>_</div>
        )}
        <div ref={bottomRef} style={{ height: 1 }} />
      </div>

      {/* 指令输入框 — 粉白风格 */}
      <div style={{
        padding: "8px 12px",
        borderTop: "2px solid #000",
        background: "#fff5f9",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: "#FF69B4", fontWeight: 700, letterSpacing: "0.1em" }}>CITY CMD</span>
        </div>
        <div style={{
          display: "flex", alignItems: "center",
          border: "2px solid #000",
          boxShadow: cmdFocus ? "4px 4px 0px 0px #FF1493" : "2px 2px 0 0 #FF69B4",
          transition: "box-shadow 0.1s",
          background: "#fff",
          overflow: "hidden",
        }}>
          <span style={{ padding: "0 8px", color: "#FF1493", fontFamily: "'Courier New', monospace", fontSize: 16, fontWeight: 700 }}>$</span>
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
              color: "#1A1A1A",
              fontFamily: "'Courier New', monospace",
              fontSize: 13,
              fontWeight: 700,
              padding: "8px 4px",
              letterSpacing: "0.04em",
            }}
          />
          <span style={{ padding: "0 8px", color: "#FF69B4", fontFamily: "'Courier New', monospace", fontSize: 13 }}>Enter</span>
        </div>
      </div>

      {/* 操作按钮 — 粉白风格 */}
      <div style={{
        display: "flex", gap: 8, padding: "8px 12px",
        borderTop: "2px solid #000", background: "#fff5f9",
        flexShrink: 0,
      }}>
        {/* RUN 按钮 */}
        <div style={{ flex: 1, position: "relative" }}>
          <div style={{
            position: "absolute", inset: 0,
            transform: "translate(4px, 4px)",
            background: "#c0006e",
            border: "2px solid #000",
          }} />
          <button
            onClick={connect}
            disabled={isRunning}
            style={{
              position: "relative",
              width: "100%",
              padding: "10px 0",
              background: isRunning ? "#f0d0e0" : "#FF1493",
              color: isRunning ? "#aaa" : "#fff",
              border: "2px solid #000",
              fontFamily: "'Courier New', monospace",
              fontWeight: 900, fontSize: 14,
              letterSpacing: "0.08em", textTransform: "uppercase",
              cursor: isRunning ? "not-allowed" : "pointer",
              boxShadow: isRunning ? "none" : "0 0 10px rgba(255,20,147,0.4)",
            }}
            onMouseEnter={(e) => { if (!isRunning) e.currentTarget.style.transform = "translate(2px,2px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translate(0,0)"; }}
            onMouseDown={(e) => { if (!isRunning) e.currentTarget.style.transform = "translate(4px,4px)"; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = "translate(0,0)"; }}
          >
            {isRunning ? "RUNNING..." : "RUN WORKFLOW"}
          </button>
        </div>

        {/* CLEAR 按钮 */}
        <div style={{ position: "relative" }}>
          <div style={{
            position: "absolute", inset: 0,
            transform: "translate(3px, 3px)",
            background: "#c0006e", border: "2px solid #000",
          }} />
          <button
            onClick={clearLogs}
            style={{
              position: "relative",
              padding: "10px 18px",
              background: "#FF69B4",
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

