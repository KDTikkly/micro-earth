/**
 * EarthMap — v7.0+ · 原生 MapLibre GL（无 react-map-gl）
 *
 * React 19 与 react-map-gl v7/v8 存在 Hook 兼容性问题，
 * 改用原生 maplibre-gl API + useEffect 挂载，彻底规避。
 *
 * 功能：
 * - Globe 球形投影（圆形地球 + 太空背景）
 * - 卫星底图：谷歌卫星（首选）/ 高德卫星（降级备用）
 * - 自动检测谷歌瓦片可访问性，不可用时自动切换高德
 * - 国家/省级行政区边界开关
 * - 风场粒子 Canvas 叠加
 * - 实体疏散 Canvas 叠加
 */
import { useEffect, useRef, useCallback, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useAgentStore } from "../store/agentStore";
import { WS_BASE } from "../utils/wsConfig";

/* ── 瓦片源配置 ──────────────────────────────────────────── */
const TILE_SOURCES = {
  google: {
    label: "谷歌卫星",
    labelEn: "Google",
    // Google 卫星瓦片（lyrs=s 仅卫星图，lyrs=y 含标注）
    sat: [
      "https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
      "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
      "https://mt2.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
      "https://mt3.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    ],
    labels: null,                       // Google 卫星瓦片已内嵌标注可选
    attribution: "© Google Maps",
    // 用于连通性检测的探针瓦片（z=1 x=1 y=0 全球覆盖）
    probe: "https://mt1.google.com/vt/lyrs=s&x=1&y=0&z=1",
  },
  amap: {
    label: "高德卫星",
    labelEn: "AMap",
    sat: [
      "https://webst01.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}",
      "https://webst02.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}",
      "https://webst03.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}",
      "https://webst04.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}",
    ],
    labels: [
      "https://webst01.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}",
      "https://webst02.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}",
    ],
    attribution: "© 高德地图 · AutoNavi",
    probe: "https://webst01.is.autonavi.com/appmaptile?style=6&x=109&y=54&z=7",
  },
};

/**
 * 探测指定瓦片源是否可访问（HEAD 请求，3s 超时）
 * @param {"google"|"amap"} key
 * @returns {Promise<boolean>}
 */
async function probeTileSource(key) {
  const { probe } = TILE_SOURCES[key];
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const resp = await fetch(probe, { method: "HEAD", mode: "no-cors", signal: ctrl.signal });
    clearTimeout(timer);
    // no-cors 模式下 resp.type === "opaque"，status === 0，但不抛异常即视为可达
    return resp.type === "opaque" || resp.ok;
  } catch {
    return false;
  }
}

/**
 * 构建 MapLibre style 的 sources + layers 对象
 */
function buildMapStyle(sourceKey) {
  const src = TILE_SOURCES[sourceKey];
  const sources = {
    "sat-tiles": {
      type: "raster",
      tiles: src.sat,
      tileSize: 256,
      attribution: src.attribution,
      maxzoom: 20,
    },
  };
  const layers = [
    {
      id: "sat-layer",
      type: "raster",
      source: "sat-tiles",
      minzoom: 0,
      maxzoom: 21,
      paint: {
        "raster-resampling":     "linear",
        "raster-saturation":     0.12,
        "raster-contrast":       0.08,
        "raster-brightness-min": 0.04,
      },
    },
  ];
  if (src.labels) {
    sources["label-tiles"] = {
      type: "raster",
      tiles: src.labels,
      tileSize: 256,
      maxzoom: 18,
    };
    layers.push({
      id: "label-layer",
      type: "raster",
      source: "label-tiles",
      minzoom: 4,
      maxzoom: 19,
      paint: { "raster-opacity": 0.7 },
    });
  }
  return { sources, layers };
}

/* ── 城市坐标 ─────────────────────────────────────────────── */
const CITY_COORDS = {
  "深圳": [114.39, 22.69],
  "北京": [116.39, 39.91],
  "上海": [121.47, 31.23],
  "成都": [104.07, 30.57],
  "东京": [139.69, 35.68],
  "纽约": [-74.01, 40.71],
};

/* ── 风速 → 霓虹色 ─────────────────────────────────────── */
function windColor(speed) {
  if (speed < 3)  return "#6200EE";
  if (speed < 8)  return "#00BFFF";
  if (speed < 15) return "#FFEE00";
  if (speed < 25) return "#FF6600";
  return "#FF0055";
}

/* ── 角标装饰 ─────────────────────────────────────────────── */
function CornerDecor() {
  return (
    <>
      <div style={{
        position:"absolute",top:0,right:0,zIndex:1000,pointerEvents:"none",
        width:0,height:0,
        borderLeft:"32px solid transparent",
        borderTop:"32px solid #FF0055",
        filter:"drop-shadow(-3px 3px 0 #000)",
      }}/>
      <div style={{
        position:"absolute",bottom:0,left:0,zIndex:1000,pointerEvents:"none",
        width:16,height:16,background:"#FFEE00",border:"2.5px solid #000",
      }}/>
      <div style={{
        position:"absolute",bottom:8,right:8,zIndex:1000,pointerEvents:"none",
        width:14,height:14,background:"#FF1493",border:"2px solid #000",
        transform:"rotate(45deg)",
      }}/>
    </>
  );
}

/* ── 宇宙星空 Canvas ──────────────────────────────────────── */
const STAR_COUNT = 320;
function StarField() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.4 + 0.3,
      alpha: Math.random() * 0.6 + 0.3,
      twinkle: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.015 + 0.005,
    }));
    let rafId, t = 0;
    function draw() {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      t += 0.018;
      stars.forEach((s) => {
        const a = s.alpha * (0.6 + 0.4 * Math.sin(t * s.speed * 60 + s.twinkle));
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
        ctx.fill();
      });
      rafId = requestAnimationFrame(draw);
    }
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    });
    ro.observe(canvas);
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    draw();
    return () => { cancelAnimationFrame(rafId); ro.disconnect(); };
  }, []);
  return (
    <canvas ref={canvasRef} style={{
      position:"absolute",inset:0,width:"100%",height:"100%",
      zIndex:0,pointerEvents:"none",
    }}/>
  );
}

/* ── 行政区开关面板 ────────────────────────────────────────── */
function BoundaryTogglePanel({ showCountries, showProvinces, onToggle }) {
  const btn = (active, color, label, key) => (
    <button
      key={key}
      onClick={() => onToggle(key)}
      style={{
        background:  active ? color : "#111",
        border:      `2px solid ${color}`,
        boxShadow:   active ? `0 0 10px ${color}, 2px 2px 0 #000` : "2px 2px 0 #000",
        color:       active ? "#000" : color,
        padding:     "4px 10px",
        fontSize:    11, fontWeight:900, letterSpacing:"1px",
        fontFamily:  "'Courier New',monospace",
        cursor:      "pointer", display:"block", marginBottom:4,
        transition:  "all 0.15s",
      }}
    >
      {active ? "[x]" : "[ ]"} {label}
    </button>
  );
  return (
    <div style={{ position:"absolute", top:44, left:8, zIndex:700 }}>
      {btn(showCountries, "#00FFFF", "COUNTRIES", "countries")}
      {btn(showProvinces, "#FF00FF", "PROVINCES", "provinces")}
    </div>
  );
}

/* ── 风场粒子 Canvas ─────────────────────────────────────── */
function WindParticleCanvas({ windframe, width, height }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const particles = useRef([]);

  useEffect(() => {
    if (!windframe?.grid_points || width <= 0 || height <= 0) {
      particles.current = []; return;
    }
    const pts = windframe.grid_points;
    if (!pts.length) { particles.current = []; return; }
    const lons = pts.map(p => p.lon), lats = pts.map(p => p.lat);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const spanLon = maxLon - minLon || 1, spanLat = maxLat - minLat || 1;
    const toS = (lat, lon) => ({
      x: ((lon - minLon) / spanLon) * width,
      y: ((maxLat - lat) / spanLat) * height,
    });
    const list = [];
    for (const pt of pts) {
      const o = toS(pt.lat, pt.lon);
      const speed = pt.speed || 0;
      const color = windColor(speed);
      const size  = speed < 3 ? 1.2 : speed < 8 ? 1.8 : speed < 15 ? 2.5 : 3.2;
      for (let i = 0; i < 8; i++) {
        list.push({
          x: o.x + (Math.random()-0.5)*width*0.35,
          y: o.y + (Math.random()-0.5)*height*0.35,
          u: pt.u, v: pt.v, speed, color, size,
          alpha: 0.4 + Math.random()*0.5,
          life: Math.random()*80,
          maxLife: 60 + Math.random()*60,
          scaleX: (width/spanLon)*0.004,
          scaleY: (height/spanLat)*0.004,
        });
      }
    }
    particles.current = list;
  }, [windframe, width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles.current) {
        p.x += p.u * p.scaleX * p.speed * 0.5;
        p.y -= p.v * p.scaleY * p.speed * 0.5;
        p.life += 1;
        if (p.life > p.maxLife || p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
          p.x = Math.random()*width; p.y = Math.random()*height;
          p.life = 0; p.alpha = 0.4 + Math.random()*0.5;
        }
        const t = p.life / p.maxLife;
        const a = t < 0.15 ? (t/0.15)*p.alpha : t > 0.8 ? ((1-t)/0.2)*p.alpha : p.alpha;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.strokeStyle = p.color;
        ctx.lineWidth   = p.size;
        ctx.shadowColor = p.color;
        ctx.shadowBlur  = p.size * 3;
        ctx.lineCap = "round";
        const tl = Math.min(p.speed * 1.2, 14);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.u*p.scaleX*p.speed*0.5*tl, p.y + p.v*p.scaleY*p.speed*0.5*tl);
        ctx.stroke();
        ctx.restore();
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [width, height, windframe]);

  if (width <= 0 || height <= 0) return null;
  return (
    <canvas ref={canvasRef} width={width} height={height}
      style={{ position:"absolute",inset:0,zIndex:50,pointerEvents:"none",opacity:0.85 }}
    />
  );
}

/* ── 实体疏散 Canvas v7.1 ────────────────────────────────────
 *  SAFE       → 电光蓝静态点 (r=5, glow 蓝)
 *  EVACUATING → 霓虹粉高频闪烁点 (r=7) + 电光紫渐消尾迹 (lw=3.5)
 *  RESCUED    → 霓虹绿点 (r=5.5)
 *  DISASTER   → 红色脉冲扩散圈（灾害中心标注）
 * ─────────────────────────────────────────────────────────── */
function EntityCanvas({ mapInst, entities, disasterLat, disasterLon, disasterActive, width, height }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const tRef      = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const draw = () => {
      tRef.current += 0.06;
      ctx.clearRect(0, 0, width, height);
      if (!mapInst) {
        rafRef.current = requestAnimationFrame(draw); return;
      }

      // ── 灾害中心脉冲圈（最底层先画）──
      if (disasterActive && disasterLat != null && disasterLon != null) {
        let dPx;
        try { dPx = mapInst.project([disasterLon, disasterLat]); } catch { dPx = null; }
        if (dPx) {
          const t = tRef.current;
          // 3 个相位不同的扩散圈
          for (let k = 0; k < 3; k++) {
            const phase = (t * 0.8 + k * (Math.PI * 2 / 3)) % (Math.PI * 2);
            const expandR = 18 + 60 * ((phase / (Math.PI * 2)));
            const alpha   = 0.7 * (1 - phase / (Math.PI * 2));
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = "#FF0033";
            ctx.lineWidth   = 2.5 - k * 0.5;
            ctx.shadowColor = "#FF3300";
            ctx.shadowBlur  = 20;
            ctx.beginPath();
            ctx.arc(dPx.x, dPx.y, expandR, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
          // 中心点
          ctx.save();
          ctx.globalAlpha = 1;
          ctx.fillStyle   = "#FF0033";
          ctx.shadowColor = "#FF6600";
          ctx.shadowBlur  = 20;
          ctx.beginPath();
          ctx.arc(dPx.x, dPx.y, 6, 0, Math.PI * 2);
          ctx.fill();
          // 十字瞄准线
          ctx.globalAlpha = 0.8;
          ctx.strokeStyle = "#FF0033";
          ctx.lineWidth   = 1.5;
          ctx.beginPath();
          ctx.moveTo(dPx.x - 18, dPx.y); ctx.lineTo(dPx.x + 18, dPx.y);
          ctx.moveTo(dPx.x, dPx.y - 18); ctx.lineTo(dPx.x, dPx.y + 18);
          ctx.stroke();
          ctx.restore();
        }
      }

      if (!entities?.length) {
        rafRef.current = requestAnimationFrame(draw); return;
      }

      for (const ent of entities) {
        const lat = ent.location?.lat ?? ent.lat;
        const lon = ent.location?.lon ?? ent.lon;
        if (lat == null || lon == null) continue;
        let px;
        try { px = mapInst.project([lon, lat]); } catch { continue; }
        const status = ent.status ?? (ent.st === "PANIC" ? "EVACUATING" : "SAFE");

        // ── 电光紫渐消尾迹（EVACUATING 专属）──
        if (status === "EVACUATING" && ent.trail?.length > 1) {
          const pts = [...ent.trail, { lat, lon }];
          ctx.save();
          ctx.lineJoin = "round";
          ctx.lineCap  = "round";
          for (let i = 1; i < pts.length; i++) {
            let a, b;
            try { a = mapInst.project([pts[i-1].lon, pts[i-1].lat]); } catch { continue; }
            try { b = mapInst.project([pts[i].lon,   pts[i].lat]);   } catch { continue; }
            const seg = i / pts.length;
            ctx.globalAlpha = seg * 0.9;
            ctx.strokeStyle = "#9B30FF";
            ctx.lineWidth   = 3.5 * seg;
            ctx.shadowColor = "#BF5FFF";
            ctx.shadowBlur  = 10;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
          ctx.restore();
        }

        // ── 实体点渲染 ──
        ctx.save();
        let color, radius, glow, extraRing = false;
        if (status === "EVACUATING") {
          const t    = tRef.current;
          const eid  = ent.entity_id || 0;
          // 高频闪烁：主 sin + 倍频谐波
          const blink = 0.5 + 0.35 * Math.sin(t * 6 + eid * 0.7)
                             + 0.15 * Math.sin(t * 13 + eid * 1.3);
          color  = `rgba(255,20,147,${Math.min(1, 0.55 + 0.45 * blink)})`;
          radius = 7;
          glow   = "#FF1493";
          extraRing = true;
        } else if (status === "RESCUED") {
          color  = "rgba(0,255,136,0.92)";
          radius = 5.5;
          glow   = "#00FF88";
        } else {
          color  = "rgba(0,191,255,0.88)";
          radius = 5;
          glow   = "#00BFFF";
        }

        ctx.globalAlpha = 1;
        ctx.shadowColor = glow;
        ctx.shadowBlur  = radius * 3.5;
        ctx.fillStyle   = color;
        ctx.beginPath();
        ctx.arc(px.x, px.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // 外圈扩散环（EVACUATING 独有）
        if (extraRing) {
          const pulse = 0.5 + 0.5 * Math.sin(tRef.current * 4 + (ent.entity_id||0) * 0.5);
          ctx.globalAlpha = 0.35 * pulse;
          ctx.strokeStyle = "#FF69B4";
          ctx.lineWidth   = 2;
          ctx.shadowBlur  = 14;
          ctx.beginPath();
          ctx.arc(px.x, px.y, radius * 2.2, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entities, width, height, mapInst, disasterLat, disasterLon, disasterActive]);

  if (width <= 0 || height <= 0) return null;
  return (
    <canvas ref={canvasRef} width={width} height={height}
      style={{ position:"absolute",inset:0,zIndex:60,pointerEvents:"none" }}
    />
  );
}

/* ═══════════════════════════════════════════════════════════
 *  EarthMap 主组件
 * ═══════════════════════════════════════════════════════════ */
export default function EarthMap({ region = "深圳", lat = 22.69, lon = 114.39 }) {
  const {
    geojsonData, entityData,
    setGeoJson, appendLog, setStatus, setHeatmap, whatIf,
    setWindfield, windfield, timelineHour,
  } = useAgentStore();

  const wsRef        = useRef(null);
  const containerRef = useRef(null);   // 地图容器 DOM
  const mapRef       = useRef(null);   // maplibre-gl Map 实例
  const [isMounted,  setIsMounted]  = useState(false);   // 客户端挂载防护
  const [mapInst,    setMapInst]    = useState(null);
  const [dimensions, setDimensions] = useState({ w: 800, h: 600 });
  const [showCountries, setShowCountries] = useState(true);
  const [showProvinces, setShowProvinces] = useState(false);
  // 瓦片源：null=自动探测中 | "google" | "amap"
  const [tileSource, setTileSource]     = useState(null);
  const [tileProbing, setTileProbing]   = useState(true);   // 正在探测

  /* ── 自动探测瓦片可访问性（首选谷歌，降级高德）────── */
  useEffect(() => {
    let cancelled = false;
    async function autoDetect() {
      setTileProbing(true);
      const googleOk = await probeTileSource("google");
      if (cancelled) return;
      const chosen = googleOk ? "google" : "amap";
      setTileSource(chosen);
      setTileProbing(false);
    }
    autoDetect();
    return () => { cancelled = true; };
  }, []);

  /* ── 客户端挂载防护：确保 DOM 完全就绪后再初始化 WebGL ── */
  useEffect(() => {
    setIsMounted(true);
  }, []);

  /* ── 响应式尺寸 ─────────────────────────────────────── */
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDimensions({ w: width, h: height });
    });
    ro.observe(containerRef.current);
    const r = containerRef.current.getBoundingClientRect();
    if (r.width > 0) setDimensions({ w: r.width, h: r.height });
    return () => ro.disconnect();
  }, [isMounted]);

  /* ── 初始化 MapLibre GL 实例（等待瓦片探测完成后再挂载）── */
  useEffect(() => {
    if (!isMounted || !containerRef.current || mapRef.current) return;
    // 若探测还未完成，等 tileSource 有值后再初始化
    if (!tileSource) return;

    const center = CITY_COORDS[region] ?? [lon, lat];
    const { sources: tileSources, layers: tileLayers } = buildMapStyle(tileSource);

    const map = new maplibregl.Map({
      container:  containerRef.current,
      style: {
        version: 8,
        sources: tileSources,
        layers:  tileLayers,
        glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
      },
      center,
      zoom:       2.5,
      projection: { type: "globe" },
      attributionControl: false,
      logoPosition: "bottom-right",
    });

    map.on("load", () => {
      // 太空背景 sky layer
      map.addLayer({
        id:   "sky",
        type: "sky",
        paint: {
          "sky-type":            "atmosphere",
          "sky-atmosphere-color": "#000015",
          "sky-atmosphere-sun":  [0.0, 90.0],
          "sky-atmosphere-sun-intensity": 5,
        },
      });

      // 国家边界
      map.addSource("countries", {
        type: "geojson",
        data: "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson",
      });
      map.addLayer({
        id:     "countries-line",
        type:   "line",
        source: "countries",
        paint: {
          "line-color":   "#00FFFF",
          "line-width":   0.8,
          "line-opacity": 0.75,
        },
      });
      map.addLayer({
        id:     "countries-fill",
        type:   "fill",
        source: "countries",
        paint: {
          "fill-color":   "#00FFFF",
          "fill-opacity": 0.04,
        },
      });

      // 省级边界
      map.addSource("provinces", {
        type: "geojson",
        data: "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_1_states_provinces.geojson",
      });
      map.addLayer({
        id:     "provinces-line",
        type:   "line",
        source: "provinces",
        paint: {
          "line-color":     "#FF00FF",
          "line-width":     0.5,
          "line-opacity":   0,
          "line-dasharray": [4, 2],
        },
      });

      mapRef.current = map;
      setMapInst(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // tileSource 确定后才真正初始化；isMounted 是 DOM 就绪信号
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, tileSource]);

  /* ── 切换瓦片源（热切换，不重建 Map 实例）────────── */
  const handleTileSwitch = useCallback(async (targetKey) => {
    const map = mapRef.current;
    if (!map || tileSource === targetKey) return;

    // 先探测目标源是否可达
    const ok = await probeTileSource(targetKey);
    if (!ok) {
      console.warn(`[EarthMap] ${targetKey} tile probe failed, keeping ${tileSource}`);
      return;
    }

    const src = TILE_SOURCES[targetKey];
    // 1. 移除旧 label 层（amap 有，google 无）
    if (map.getLayer("label-layer"))  map.removeLayer("label-layer");
    if (map.getSource("label-tiles")) map.removeSource("label-tiles");
    // 2. 替换卫星瓦片源
    if (map.getLayer("sat-layer"))    map.removeLayer("sat-layer");
    if (map.getSource("sat-tiles"))   map.removeSource("sat-tiles");

    map.addSource("sat-tiles", {
      type: "raster",
      tiles: src.sat,
      tileSize: 256,
      attribution: src.attribution,
      maxzoom: 20,
    });
    // 找到 sky 层之前插入，保证叠层顺序
    const beforeLayer = map.getLayer("sky") ? "sky" : undefined;
    map.addLayer({
      id: "sat-layer", type: "raster", source: "sat-tiles",
      minzoom: 0, maxzoom: 21,
      paint: {
        "raster-resampling": "linear",
        "raster-saturation": 0.12,
        "raster-contrast":   0.08,
        "raster-brightness-min": 0.04,
      },
    }, beforeLayer);

    if (src.labels) {
      map.addSource("label-tiles", {
        type: "raster", tiles: src.labels, tileSize: 256, maxzoom: 18,
      });
      map.addLayer({
        id: "label-layer", type: "raster", source: "label-tiles",
        minzoom: 4, maxzoom: 19,
        paint: { "raster-opacity": 0.7 },
      }, beforeLayer);
    }

    setTileSource(targetKey);
  }, [tileSource]);

  /* ── 区域切换飞行动画 ───────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const c = CITY_COORDS[region] ?? [lon, lat];
    map.flyTo({ center: c, zoom: 4, duration: 1500 });
  }, [region, lat, lon]);

  /* ── 行政区图层开关 ─────────────────────────────────── */
  const handleBoundaryToggle = useCallback((type) => {
    const map = mapRef.current;
    if (!map) return;
    if (type === "countries") {
      const next = !showCountries;
      setShowCountries(next);
      map.setPaintProperty("countries-line", "line-opacity", next ? 0.75 : 0);
      map.setPaintProperty("countries-fill", "fill-opacity", next ? 0.04 : 0);
    }
    if (type === "provinces") {
      const next = !showProvinces;
      setShowProvinces(next);
      map.setPaintProperty("provinces-line", "line-opacity", next ? 0.65 : 0);
    }
  }, [showCountries, showProvinces]);

  /* ── WebSocket ──────────────────────────────────────── */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    setStatus("CONNECTING");
    const ws = new WebSocket(`${WS_BASE}/ws/agent-stream`);
    wsRef.current = ws;
    ws.onopen = () => {
      setStatus("RUNNING");
      ws.send(JSON.stringify({
        region, lat, lon,
        temp_offset:       whatIf?.tempOffset       ?? 0.0,
        precip_multiplier: whatIf?.precipMultiplier ?? 1.0,
      }));
    };
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        const ts   = new Date().toLocaleTimeString();
        if (data.event === "geojson") { setGeoJson(data.data); appendLog({ ...data, ts, message: data.message }); }
        else appendLog({ ...data, ts });
        if (data.event === "entities" && data.data) useAgentStore.getState().setEntityData(data.data);
        if (data.event === "trade"    && data.data) useAgentStore.getState().appendTrade(data.data);
        if (data.event === "heatmap"  && data.data) setHeatmap(data.data);
        if (data.event === "windfield"&& data.data) setWindfield(data.data);
        if (data.event === "risk"     && data.data) useAgentStore.getState().setRiskData(data.data);
        if (data.event === "done")  setStatus("IDLE");
        if (data.event === "error") setStatus("ERROR");
      } catch { /* ignore */ }
    };
    ws.onerror = () => {
      setStatus("ERROR");
      appendLog({ event:"error", message:"[ERROR] WebSocket 连接失败", ts: new Date().toLocaleTimeString() });
    };
    ws.onclose = () => setStatus("IDLE");
  }, [region, lat, lon, setGeoJson, appendLog, setStatus, setHeatmap, setWindfield, whatIf]);

  useEffect(() => { connect(); return () => wsRef.current?.close(); }, [connect]);

  /* ── 衍生数据 ───────────────────────────────────────── */
  const nodeCount        = geojsonData?.features?.length ?? 0;
  const entityCount      = entityData?.entities?.length  ?? 0;
  const heatmapData      = useAgentStore(s => s.heatmapData);
  const floodCount       = heatmapData?.flood_zones?.length ?? 0;
  const currentWindFrame = windfield?.hourly_vectors?.[timelineHour] ?? null;
  const entityStats      = entityData?.stats ?? null;
  const disasterActive   = entityStats?.disaster_active ?? false;
  const disasterLat      = entityStats?.disaster_lat ?? null;
  const disasterLon      = entityStats?.disaster_lon ?? null;

  /* ── isMounted 防护：DOM 未就绪时返回占位，避免 WebGL 崩溃 ── */
  if (!isMounted) {
    return (
      <div style={{
        width:"100%", height:"100%",
        background:"radial-gradient(ellipse at 50% 60%, #0a0e2a 0%, #050714 55%, #000005 100%)",
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>
        <span style={{ color:"#00FFFF", fontFamily:"'Courier New',monospace", fontSize:14, fontWeight:900 }}>
          [INITIALIZING GLOBE ENGINE...]
        </span>
      </div>
    );
  }

  return (
    <div style={{
      position:"relative", width:"100%", height:"100%",
      background:"radial-gradient(ellipse at 50% 60%, #0a0e2a 0%, #050714 55%, #000005 100%)",
      overflow:"hidden",
    }}>
      {/* 星空背景 zIndex:0 */}
      <StarField />

      {/* MapLibre 地图容器 zIndex:10 */}
      <div
        ref={containerRef}
        style={{ position:"absolute", inset:0, zIndex:10 }}
      />

      {/* 风场粒子 zIndex:50 */}
      {currentWindFrame && (
        <WindParticleCanvas
          windframe={currentWindFrame}
          width={dimensions.w}
          height={dimensions.h}
        />
      )}

      {/* 实体疏散 zIndex:60 */}
      {mapInst && entityData?.entities && (
        <EntityCanvas
          mapInst={mapInst}
          entities={entityData.entities}
          disasterLat={disasterLat}
          disasterLon={disasterLon}
          disasterActive={disasterActive}
          width={dimensions.w}
          height={dimensions.h}
        />
      )}

      {/* 行政区开关 zIndex:700 */}
      <BoundaryTogglePanel
        showCountries={showCountries}
        showProvinces={showProvinces}
        onToggle={handleBoundaryToggle}
      />

      {/* 地图源切换面板 zIndex:700 */}
      <div style={{
        position:"absolute", top:8, left:8, zIndex:700,
        display:"flex", flexDirection:"column", gap:4,
      }}>
        {/* 探测状态提示 */}
        {tileProbing && (
          <div style={{
            background:"#1a1a2e", border:"1.5px solid #6200EE",
            padding:"3px 10px", fontFamily:"'Courier New',monospace",
            fontSize:10, fontWeight:700, color:"#BB86FC",
            boxShadow:"0 0 6px #6200EE55",
          }}>
            [~] DETECTING MAP SOURCE...
          </div>
        )}
        {/* 切换按钮组 */}
        {!tileProbing && (
          <div style={{ display:"flex", gap:3 }}>
            {["google","amap"].map(key => {
              const active = tileSource === key;
              const cfg    = TILE_SOURCES[key];
              return (
                <button
                  key={key}
                  onClick={() => handleTileSwitch(key)}
                  title={active ? `当前使用 ${cfg.label}` : `切换到 ${cfg.label}`}
                  style={{
                    position:"relative",
                    background: active ? (key === "google" ? "#4285F4" : "#FF6900") : "#111",
                    border:`2px solid ${active ? "#fff" : "#555"}`,
                    color: active ? "#fff" : "#888",
                    fontFamily:"'Courier New',monospace",
                    fontSize:10, fontWeight:900, letterSpacing:"0.5px",
                    padding:"3px 9px", cursor: active ? "default" : "pointer",
                    boxShadow: active ? `0 0 10px ${key === "google" ? "#4285F488" : "#FF690088"}` : "none",
                    transition:"all 0.15s",
                    opacity: active ? 1 : 0.7,
                  }}
                >
                  {key === "google" ? "◉ Google" : "◉ 高德"}
                  {active && (
                    <span style={{ marginLeft:4, fontSize:8, color:"#0f0" }}>▲</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        {/* 当前源标注 */}
        {tileSource && !tileProbing && (
          <div style={{
            fontFamily:"'Courier New',monospace", fontSize:9, color:"#666",
            padding:"1px 2px",
          }}>
            {tileSource === "google"
              ? "[AUTO] Google preferred · AMap fallback"
              : "[FALLBACK] AMap (Google unreachable)"}
          </div>
        )}
      </div>

      {/* 角标装饰 */}
      <CornerDecor />

      {/* FETCH 按钮 */}
      <div style={{ position:"absolute", top:8, right:8, zIndex:700 }}>
        <div style={{
          position:"absolute",inset:0,transform:"translate(3px,3px)",
          background:"#00AA00",border:"2px solid #000",
        }}/>
        <button
          onClick={connect}
          style={{
            position:"relative", background:"#00FF00",
            border:"2.5px solid #000", padding:"5px 12px",
            fontFamily:"'Courier New',monospace",
            fontSize:12, fontWeight:900, color:"#000",
            cursor:"pointer", letterSpacing:"1px",
            boxShadow:"0 0 8px rgba(0,255,0,0.5)",
          }}
          onMouseDown={e => { e.currentTarget.style.transform="translate(3px,3px)"; }}
          onMouseUp={e   => { e.currentTarget.style.transform=""; }}
          onMouseLeave={e=> { e.currentTarget.style.transform=""; }}
        >{"[>]"} FETCH</button>
      </div>

      {/* 数据节点徽章 */}
      <div style={{
        position:"absolute", bottom:28, left:8, zIndex:700, pointerEvents:"none",
        background:"#FFEE00", border:"2.5px solid #000", boxShadow:"3px 3px 0 0 #000",
        padding:"3px 10px",
        fontFamily:"'Courier New',monospace", fontSize:12, fontWeight:900, color:"#000",
      }}>
        {nodeCount > 0
          ? `[*] ${nodeCount} NODES / ${geojsonData?.metadata?.region ?? region}`
          : "[o] AWAITING DATA..."}
      </div>

      {/* 实体状态徽章 */}
      {entityCount > 0 && (
        <div style={{
          position:"absolute", bottom:8, left:8, zIndex:700, pointerEvents:"none",
          display:"flex", gap:4,
          fontFamily:"'Courier New',monospace", fontSize:11, fontWeight:900,
        }}>
          {(() => {
            const s = entityData?.stats ?? {};
            const safe = s.safe_count ?? s.normal_count ?? 0;
            const evac = s.evacuating_count ?? s.panic_count ?? 0;
            const resc = s.rescued_count ?? 0;
            return (
              <>
                <span style={{ background:"#00BFFF", border:"2.5px solid #000", padding:"2px 7px", color:"#000", boxShadow:"2px 2px 0 0 #000" }}>
                  {"[>]"} {safe} SAFE
                </span>
                {evac > 0 && (
                  <span style={{ background:"#FF1493", border:"2.5px solid #000", padding:"2px 7px", color:"#fff", boxShadow:"2px 2px 0 0 #000" }}>
                    [!] {evac} EVACUATING
                  </span>
                )}
                {resc > 0 && (
                  <span style={{ background:"#00FF88", border:"2.5px solid #000", padding:"2px 7px", color:"#000", boxShadow:"2px 2px 0 0 #000" }}>
                    [OK] {resc} RESCUED
                  </span>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* 热力/洪涝徽章 */}
      {heatmapData && (
        <div style={{
          position:"absolute", top:44, right:8, zIndex:700, pointerEvents:"none",
          display:"flex", flexDirection:"column", gap:3, alignItems:"flex-end",
        }}>
          <span style={{
            background: floodCount > 0 ? "#6200EE" : "#00FF00",
            border:"2px solid #000",
            boxShadow: floodCount > 0 ? "0 0 8px #6200EE" : "0 0 6px #00FF00",
            fontFamily:"'Courier New',monospace", fontSize:10, fontWeight:900,
            color:"#fff", padding:"2px 8px",
          }}>
            {floodCount > 0 ? `[WARN] ${floodCount} FLOOD ZONES` : "[OK] NO FLOOD RISK"}
          </span>
        </div>
      )}
    </div>
  );
}

