/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Blueprint Neo-Brutalism 粉彩系
        "paper-white":   "#FDFDFD",
        "ink-black":     "#1A1A1A",
        "accent-yellow": "#FFE66D",
        "accent-pink":   "#FFB5A7",
        "accent-blue":   "#9BF6FF",
        "accent-green":  "#B5EAD7",
        "accent-purple": "#C7B8EA",
        "wireframe-gray":"#E0E0E0",
        "grid-line":     "#F0F0F0",
        // 保留功能色
        "status-ok":     "#2D6A4F",
        "status-warn":   "#D4A017",
        "status-err":    "#C0392B",
      },
      fontFamily: {
        mono:  ["'Courier New'", "Courier", "monospace"],
        sans:  ["'Inter'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // Blueprint 轻盈硬投影
        "neo":       "4px 4px 0px 0px #1A1A1A",
        "neo-sm":    "2px 2px 0px 0px #1A1A1A",
        "neo-lg":    "6px 6px 0px 0px #1A1A1A",
        "neo-yellow":"4px 4px 0px 0px #FFE66D",
        "neo-pink":  "4px 4px 0px 0px #FFB5A7",
        "neo-blue":  "4px 4px 0px 0px #9BF6FF",
      },
      backgroundImage: {
        // 工程坐标纸网格
        "blueprint-grid":
          "linear-gradient(to right, #f0f0f0 1px, transparent 1px), linear-gradient(to bottom, #f0f0f0 1px, transparent 1px)",
        // 加密网格（小格）
        "blueprint-grid-sm":
          "linear-gradient(to right, #e8e8e8 1px, transparent 1px), linear-gradient(to bottom, #e8e8e8 1px, transparent 1px)",
        // 交叉点圆点
        "dot-cross":
          "radial-gradient(circle, #d0d0d0 1px, transparent 1px)",
      },
      backgroundSize: {
        "blueprint-grid":    "40px 40px",
        "blueprint-grid-sm": "8px 8px",
        "dot-cross":         "40px 40px",
      },
      animation: {
        "float-slow":  "floatY 6s ease-in-out infinite",
        "float-mid":   "floatY 4s ease-in-out infinite",
        "float-rev":   "floatYRev 5s ease-in-out infinite",
        "btn-press":   "btnPress 0.1s ease-in-out",
      },
      keyframes: {
        floatY: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":       { transform: "translateY(-12px)" },
        },
        floatYRev: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":       { transform: "translateY(10px)" },
        },
        btnPress: {
          "0%":   { transform: "translate(0,0)", boxShadow: "4px 4px 0 0 #1A1A1A" },
          "100%": { transform: "translate(4px,4px)", boxShadow: "0px 0px 0 0 #1A1A1A" },
        },
      },
    },
  },
  plugins: [],
};
