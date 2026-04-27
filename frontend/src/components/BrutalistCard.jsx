/**
 * BrutalistCard — Blueprint Neo-Brutalism 版
 * 白底 + 粉彩头部 + 轻盈硬投影 + 粗黑边框
 */

const ACCENT_MAP = {
  yellow: { bg: "#FFE66D", text: "#1A1A1A" },
  pink:   { bg: "#FFB5A7", text: "#1A1A1A" },
  blue:   { bg: "#9BF6FF", text: "#1A1A1A" },
  green:  { bg: "#B5EAD7", text: "#1A1A1A" },
  purple: { bg: "#C7B8EA", text: "#1A1A1A" },
  white:  { bg: "#fff",    text: "#1A1A1A" },
};

export default function BrutalistCard({
  title,
  accent = "yellow",
  className = "",
  headerExtra,
  children,
}) {
  const { bg, text } = ACCENT_MAP[accent] ?? ACCENT_MAP.yellow;

  return (
    <div
      className={className}
      style={{
        border: "2px solid #1A1A1A",
        boxShadow: "4px 4px 0px 0px #1A1A1A",
        background: "#fff",
      }}
    >
      {/* 卡片头部 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px",
          borderBottom: "2px solid #1A1A1A",
          background: bg,
          color: text,
          fontFamily: "'Courier New', monospace",
          fontWeight: 900,
          fontSize: 11,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        <span>{title}</span>
        {headerExtra && (
          <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.75 }}>
            {headerExtra}
          </span>
        )}
      </div>

      {/* 内容区 */}
      <div style={{ padding: "10px 12px" }}>{children}</div>
    </div>
  );
}
