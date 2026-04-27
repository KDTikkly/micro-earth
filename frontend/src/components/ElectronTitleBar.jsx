/**
 * ElectronTitleBar — 赛博孟菲斯风格自定义标题栏
 * 仅在 Electron 环境中渲染（通过 window.electronAPI 检测）
 * 支持无边框窗口的拖拽移动、最小化、最大化、关闭
 */
import { useState, useEffect } from "react";

// 像素化 Lyria A.I. 图标 (SVG inline)
function PixelIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ flexShrink: 0 }}>
      {/* 外六边形 */}
      <polygon points="11,1 20,6 20,16 11,21 2,16 2,6"
        stroke="#FF69B4" strokeWidth="1.5" fill="rgba(255,105,180,0.08)" />
      {/* 内菱形 */}
      <polygon points="11,5 16,11 11,17 6,11"
        stroke="#9370DB" strokeWidth="1.2" fill="rgba(147,112,219,0.15)" />
      {/* 中心点 */}
      <rect x="9" y="9" width="4" height="4" fill="#00BFFF" />
      {/* 像素点缀 */}
      <rect x="4"  y="4"  width="2" height="2" fill="#FF69B4" />
      <rect x="16" y="4"  width="2" height="2" fill="#FFEE00" />
      <rect x="4"  y="16" width="2" height="2" fill="#FFEE00" />
      <rect x="16" y="16" width="2" height="2" fill="#FF69B4" />
    </svg>
  );
}

export default function ElectronTitleBar() {
  const isElectron = typeof window !== "undefined" && !!window.electronAPI;
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!isElectron) return;
    // 监听窗口最大化/还原状态（通过 CSS 媒体查询判断）
    const check = () => {
      // 如果窗口占满屏幕则认为是最大化
      setIsMaximized(
        window.screen.availWidth  <= window.outerWidth &&
        window.screen.availHeight <= window.outerHeight
      );
    };
    window.addEventListener('resize', check);
    check();
    return () => window.removeEventListener('resize', check);
  }, [isElectron]);

  if (!isElectron) return null;

  const btnBase = {
    width: 32, height: 32,
    border: "2px solid #000",
    fontFamily: "'Courier New', monospace",
    fontSize: 12, fontWeight: 900,
    cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
    transition: "transform 0.06s, filter 0.06s",
    WebkitAppRegion: "no-drag",
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        height: 40,
        zIndex: 9999,
        background: "linear-gradient(90deg, #0a0514 0%, #1a0530 40%, #0a1432 100%)",
        borderBottom: "2.5px solid #000",
        boxShadow: "0 2px 0 0 #FF69B4",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 8px 0 10px",
        // CSS 关键属性：允许拖拽整个标题栏移动窗口
        WebkitAppRegion: "drag",
        userSelect: "none",
      }}
    >
      {/* 左：图标 + 产品名 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <PixelIcon />
        <span style={{
          fontFamily: "'Courier New', monospace",
          fontSize: 12, fontWeight: 900,
          color: "#FF69B4",
          letterSpacing: "0.18em",
          textShadow: "0 0 8px rgba(255,105,180,0.5)",
        }}>MICRO-EARTH</span>
        <span style={{
          fontFamily: "'Courier New', monospace",
          fontSize: 9, color: "#9370DB",
          border: "1px solid #9370DB",
          padding: "1px 5px", letterSpacing: "0.12em",
        }}>DIGITAL TWIN · v8.0</span>
      </div>

      {/* 中：系统标识 */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{
          fontFamily: "'Courier New', monospace",
          fontSize: 9, color: "#00BFFF",
          letterSpacing: "0.1em",
          opacity: 0.7,
        }}>LYRIA A.I. · SIMULATION CORE · ONLINE</span>
        {/* 闪烁心跳点 */}
        <div style={{
          width: 6, height: 6,
          background: "#00FF88",
          boxShadow: "0 0 4px #00FF88",
          animation: "titlebarPulse 1.5s ease-in-out infinite",
        }} />
      </div>

      {/* 右：窗口控制按钮 — WebkitAppRegion: no-drag */}
      <div style={{
        display: "flex", alignItems: "center", gap: 2,
        WebkitAppRegion: "no-drag",
      }}>
        {/* 最小化 */}
        <button
          onClick={() => window.electronAPI.minimize()}
          title="最小化"
          style={{ ...btnBase, background: "#FFEE00", color: "#000", boxShadow: "2px 2px 0 #000" }}
          onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.15)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.filter = ""; }}
        >─</button>

        {/* 最大化/还原 */}
        <button
          onClick={() => window.electronAPI.maximize()}
          title={isMaximized ? "还原" : "最大化"}
          style={{ ...btnBase, background: "#9370DB", color: "#fff", boxShadow: "2px 2px 0 #000" }}
          onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.15)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.filter = ""; }}
        >{isMaximized ? "❐" : "□"}</button>

        {/* 关闭 */}
        <button
          onClick={() => window.electronAPI.close()}
          title="关闭"
          style={{ ...btnBase, background: "#FF0055", color: "#fff", boxShadow: "2px 2px 0 #000" }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
        >✕</button>
      </div>
    </div>
  );
}
