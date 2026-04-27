/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Lyria 角色色系（参考图 image_5.png）──
        "lyria-pink":   "#FF69B4",   // 霓虹粉 — 发色
        "lyria-blue":   "#00BFFF",   // 电光蓝 — 丝带
        "lyria-purple": "#9370DB",   // 电子紫 — 眼珠
        "lyria-yellow": "#FFEE00",   // 明黄   — 点缀色
        // ── Cyber-Lab Memphis 高饱和撞色系 ──
        "m-yellow":  "#FFEE00",   // 明黄
        "m-pink":    "#FF69B4",   // 霓虹粉（升级至 Lyria 发色）
        "m-purple":  "#9370DB",   // 电子紫（升级至 Lyria 眼色）
        "m-green":   "#00FF00",   // 终端绿/霓虹绿
        "m-black":   "#000000",   // 纯黑
        "m-cyan":    "#00BFFF",   // 电光蓝（升级至 Lyria 丝带色）
        "m-orange":  "#FF6600",   // 霓虹橙
        // 保留旧别名（渐进迁移）
        "paper-white":   "#FDFDFD",
        "ink-black":     "#1A1A1A",
        "accent-yellow": "#FFEE00",
        "accent-pink":   "#FF69B4",
        "accent-blue":   "#00BFFF",
        "accent-green":  "#00FF00",
        "accent-purple": "#9370DB",
        "wireframe-gray":"#E0E0E0",
        "grid-line":     "#F0F0F0",
        // 功能色
        "status-ok":     "#00FF00",
        "status-warn":   "#FFEE00",
        "status-err":    "#FF0055",
      },
      fontFamily: {
        mono:  ["'Courier New'", "Courier", "monospace"],
        sans:  ["'Inter'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // Memphis 粗硬投影
        "neo":        "5px 5px 0px 0px #000000",
        "neo-sm":     "3px 3px 0px 0px #000000",
        "neo-lg":     "8px 8px 0px 0px #000000",
        "neo-yellow": "5px 5px 0px 0px #FFEE00",
        "neo-pink":   "5px 5px 0px 0px #FF69B4",
        "neo-green":  "5px 5px 0px 0px #00FF00",
        "neo-purple": "5px 5px 0px 0px #9370DB",
        "neo-blue":   "5px 5px 0px 0px #00BFFF",
        // 霓虹发光
        "glow-green":  "0 0 8px #00FF00, 0 0 20px rgba(0,255,0,0.4)",
        "glow-pink":   "0 0 8px #FF69B4, 0 0 20px rgba(255,105,180,0.4)",
        "glow-yellow": "0 0 8px #FFEE00, 0 0 20px rgba(255,238,0,0.4)",
        "glow-purple": "0 0 8px #9370DB, 0 0 20px rgba(147,112,219,0.4)",
        "glow-blue":   "0 0 8px #00BFFF, 0 0 20px rgba(0,191,255,0.4)",
      },
      backgroundImage: {
        // 白底细网格（保留）
        "blueprint-grid":
          "linear-gradient(to right, #e8e8e8 1px, transparent 1px), linear-gradient(to bottom, #e8e8e8 1px, transparent 1px)",
        "blueprint-grid-sm":
          "linear-gradient(to right, #e0e0e0 1px, transparent 1px), linear-gradient(to bottom, #e0e0e0 1px, transparent 1px)",
        // Memphis 点阵
        "dot-cross":
          "radial-gradient(circle, #d0d0d0 1.5px, transparent 1.5px)",
      },
      backgroundSize: {
        "blueprint-grid":    "40px 40px",
        "blueprint-grid-sm": "8px 8px",
        "dot-cross":         "32px 32px",
      },
      animation: {
        "float-slow":  "floatY 7s ease-in-out infinite",
        "float-mid":   "floatY 4.5s ease-in-out infinite",
        "float-rev":   "floatYRev 5.5s ease-in-out infinite",
        "spin-slow":   "spin 18s linear infinite",
        "pulse-neon":  "pulseNeon 1.8s ease-in-out infinite",
        "btn-press":   "btnPress 0.1s ease-in-out",
      },
      keyframes: {
        floatY: {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%":       { transform: "translateY(-16px) rotate(3deg)" },
        },
        floatYRev: {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%":       { transform: "translateY(12px) rotate(-3deg)" },
        },
        pulseNeon: {
          "0%, 100%": { opacity: "1" },
          "50%":       { opacity: "0.55" },
        },
        btnPress: {
          "0%":   { transform: "translate(0,0)", boxShadow: "5px 5px 0 0 #000" },
          "100%": { transform: "translate(5px,5px)", boxShadow: "0px 0px 0 0 #000" },
        },
      },
    },
  },
  plugins: [],
};
