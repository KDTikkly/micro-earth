/**
 * EarthMap — v7.0+ · 原生 MapLibre GL（无 react-map-gl）
 *
 * React 19 与 react-map-gl v7/v8 存在 Hook 兼容性问题，
 * 改用原生 maplibre-gl API + useEffect 挂载，彻底规避。
 *
 * 功能：
 * - Globe 球形投影（圆形地球 + 太空背景）
 * - Esri 卫星底图（免费无 Token）
 * - 国家/省级行政区边界开关
 * - 风场粒子 Canvas 叠加
 * - 实体疏散 Canvas 叠加
 */
import { useEffect, useRef, useCallback, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useAgentStore } from "../store/agentStore";

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

/* ── 实体疏散 Canvas ─────────────────────────────────────── */
function EntityCanvas({ mapInst, entities, width, height }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const tRef      = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const draw = () => {
      tRef.current += 0.04;
      ctx.clearRect(0, 0, width, height);
      if (!mapInst || !entities?.length) {
        rafRef.current = requestAnimationFrame(draw); return;
      }
      for (const ent of entities) {
        const lat = ent.location?.lat ?? ent.lat;
        const lon = ent.location?.lon ?? ent.lon;
        if (lat == null || lon == null) continue;
        let px;
        try { px = mapInst.project([lon, lat]); } catch { continue; }
        const status = ent.status ?? (ent.st === "PANIC" ? "EVACUATING" : "SAFE");
        if (status === "EVACUATING" && ent.trail?.length > 1) {
          const pts = [...ent.trail, { lat, lon }];
          ctx.save();
          ctx.lineJoin = "round"; ctx.lineCap = "round";
          for (let i = 1; i < pts.length; i++) {
            let a, b;
            try { a = mapInst.project([pts[i-1].lon, pts[i-1].lat]); } catch { continue; }
            try { b = mapInst.project([pts[i].lon,   pts[i].lat]);   } catch { continue; }
            ctx.globalAlpha = (i / pts.length) * 0.7;
            ctx.strokeStyle = "#9B30FF";
            ctx.lineWidth   = 1.5;
            ctx.shadowColor = "#9B30FF";
            ctx.shadowBlur  = 4;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
          ctx.restore();
        }
        ctx.save();
        let color, radius, glow;
        if (status === "EVACUATING") {
          const blink = 0.5 + 0.5 * Math.sin(tRef.current * 4 + (ent.entity_id||0) * 0.5);
          color = `rgba(255,20,147,${0.6 + 0.4 * blink})`; radius = 3.5; glow = "#FF1493";
        } else if (status === "RESCUED") {
          color = "rgba(0,255,136,0.9)"; radius = 3; glow = "#00FF88";
        } else {
          color = "rgba(0,191,255,0.85)"; radius = 2.5; glow = "#00BFFF";
        }
        ctx.globalAlpha = 1;
        ctx.shadowColor = glow; ctx.shadowBlur = radius * 2.5;
        ctx.fillStyle   = color;
        ctx.beginPath(); ctx.arc(px.x, px.y, radius, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entities, width, height, mapInst]);

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

  /* ── 初始化 MapLibre GL 实例 ────────────────────────── */
  useEffect(() => {
    if (!isMounted || !containerRef.current || mapRef.current) return;

    const center = CITY_COORDS[region] ?? [lon, lat];

    const map = new maplibregl.Map({
      container:  containerRef.current,
      style: {
        version: 8,
        sources: {
          "esri-sat": {
            type:  "raster",
            tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
            tileSize:    256,
            attribution: "Esri",
            maxzoom:     19,
          },
        },
        layers: [{
          id:      "esri-sat-layer",
          type:    "raster",
          source:  "esri-sat",
          minzoom: 0,
          maxzoom: 22,
        }],
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
      },
      center,
      zoom:       2.5,
      projection: { type: "globe" },   // MapLibre v4+ Globe 投影对象语法
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
        data: "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson",
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
        data: "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_1_states_provinces.geojson",
      });
      map.addLayer({
        id:     "provinces-line",
        type:   "line",
        source: "provinces",
        paint: {
          "line-color":     "#FF00FF",
          "line-width":     0.5,
          "line-opacity":   0,               // 默认隐藏
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
    // 仅挂载一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const ws = new WebSocket("ws://localhost:8000/ws/agent-stream");
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

