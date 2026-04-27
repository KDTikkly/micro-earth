/**
 * EarthMap — Phase 6 · 3D Globe + Wind Field Particles
 *
 * 新增：
 * - Canvas 风场粒子层（方案 B 自研，requestAnimationFrame 驱动）
 * - 接收 72h windfield 时序；timelineHour 控制当前帧
 * - 粒子颜色：微风=#6200EE 强风=#FFEE00 台风=#FF0055
 */
import { useEffect, useRef, useCallback, useState } from "react";
import Globe from "react-globe.gl";
import { useAgentStore } from "../store/agentStore";

/* ── 城市坐标表 ──────────────────────────────────────────── */
const CITY_COORDS = {
  "深圳": { lat: 22.69, lng: 114.39 },
  "北京": { lat: 39.91, lng: 116.39 },
  "上海": { lat: 31.23, lng: 121.47 },
  "成都": { lat: 30.57, lng: 104.07 },
  "东京": { lat: 35.68, lng: 139.69 },
  "纽约": { lat: 40.71, lng: -74.01 },
};

/* ── 风速 → 孟菲斯霓虹色 ─────────────────────────────────── */
function windColor(speed) {
  if (speed < 3)  return "#6200EE";   // 微风 — 电光紫
  if (speed < 8)  return "#00BFFF";   // 轻风 — 电光蓝
  if (speed < 15) return "#FFEE00";   // 强风 — 明黄
  if (speed < 25) return "#FF6600";   // 烈风 — 霓虹橙
  return "#FF0055";                   // 台风 — 霓虹粉
}

/* ── 温度 → 霓虹色 ───────────────────────────────────────── */
function tempToNeonColor(t) {
  if (t <= 5)  return "#00CFFF";
  if (t <= 15) return "#00FFCC";
  if (t <= 22) return "#AAFF00";
  if (t <= 28) return "#FFEE00";
  if (t <= 33) return "#FF6600";
  return "#FF0055";
}

/* ── 角标装饰 ─────────────────────────────────────────────── */
function CornerDecor() {
  return (
    <>
      <div style={{
        position: "absolute", top: 0, right: 0, zIndex: 1000, pointerEvents: "none",
        width: 0, height: 0,
        borderLeft: "32px solid transparent",
        borderTop: "32px solid #FF0055",
        filter: "drop-shadow(-3px 3px 0 #000)",
      }} />
      <div style={{
        position: "absolute", bottom: 0, left: 0, zIndex: 1000, pointerEvents: "none",
        width: 16, height: 16, background: "#FFEE00", border: "2.5px solid #000",
      }} />
      <div style={{
        position: "absolute", bottom: 8, right: 8, zIndex: 1000, pointerEvents: "none",
        width: 14, height: 14, background: "#FF1493", border: "2px solid #000",
        transform: "rotate(45deg)",
      }} />
    </>
  );
}

/* ── 风场粒子 Canvas 组件 ───────────────────────────────── */
function WindParticleCanvas({ windframe, width, height }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const particles = useRef([]);

  // 从 windframe 的 grid_points 构建粒子群
  useEffect(() => {
    if (!windframe || !windframe.grid_points || width <= 0 || height <= 0) {
      particles.current = [];
      return;
    }

    const pts = windframe.grid_points;
    if (!pts.length) { particles.current = []; return; }

    // 计算经纬度边界 → 屏幕坐标映射
    const lons = pts.map((p) => p.lon);
    const lats = pts.map((p) => p.lat);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const spanLon = maxLon - minLon || 1;
    const spanLat = maxLat - minLat || 1;

    const toScreen = (lat, lon) => ({
      x: ((lon - minLon) / spanLon) * width,
      y: ((maxLat - lat) / spanLat) * height,   // y 轴翻转
    });

    // 每个网格点释放若干粒子
    const PARTICLES_PER_POINT = 8;
    const newParticles = [];

    for (const pt of pts) {
      const origin = toScreen(pt.lat, pt.lon);
      const speed  = pt.speed || 0;
      const color  = windColor(speed);
      // 粒子尺寸随风速增大
      const size   = speed < 3 ? 1.2 : speed < 8 ? 1.8 : speed < 15 ? 2.5 : 3.2;

      for (let i = 0; i < PARTICLES_PER_POINT; i++) {
        // 在网格点附近随机散布起始位置
        const jitter = 0.35;
        newParticles.push({
          x:      origin.x + (Math.random() - 0.5) * width  * jitter,
          y:      origin.y + (Math.random() - 0.5) * height * jitter,
          u:      pt.u,   // 东分量（像素/帧 缩放后）
          v:      pt.v,   // 北分量
          speed,
          color,
          size,
          alpha:  0.4 + Math.random() * 0.5,
          life:   Math.random() * 80,
          maxLife: 60 + Math.random() * 60,
          // 用于归一化到屏幕速度
          scaleX: (width  / spanLon) * 0.004,
          scaleY: (height / spanLat) * 0.004,
        });
      }
    }
    particles.current = newParticles;
  }, [windframe, width, height]);

  // requestAnimationFrame 渲染循环
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      if (!particles.current.length) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      for (const p of particles.current) {
        // 移动
        p.x += p.u * p.scaleX * p.speed * 0.5;
        p.y -= p.v * p.scaleY * p.speed * 0.5;  // canvas y轴向下
        p.life += 1;

        // 超出边界或寿命到期 → 重置到随机位置
        if (p.life > p.maxLife || p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
          p.x    = Math.random() * width;
          p.y    = Math.random() * height;
          p.life = 0;
          p.alpha = 0.4 + Math.random() * 0.5;
        }

        // 生命周期渐入渐出
        const t     = p.life / p.maxLife;
        const alpha = t < 0.15
          ? (t / 0.15) * p.alpha
          : t > 0.8
            ? ((1 - t) / 0.2) * p.alpha
            : p.alpha;

        // 绘制粒子尾迹线
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = p.color;
        ctx.lineWidth   = p.size;
        ctx.shadowColor = p.color;
        ctx.shadowBlur  = p.size * 3;
        ctx.lineCap     = "round";

        const tailLen = Math.min(p.speed * 1.2, 14);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(
          p.x - p.u * p.scaleX * p.speed * 0.5 * tailLen,
          p.y + p.v * p.scaleY * p.speed * 0.5 * tailLen,
        );
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
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: "absolute", inset: 0,
        zIndex: 50, pointerEvents: "none",
        opacity: 0.85,
      }}
    />
  );
}


export default function EarthMap({ region = "深圳", lat = 22.69, lon = 114.39 }) {
  const {
    geojsonData, entityData,
    setGeoJson, appendLog, setStatus, setHeatmap, whatIf,
    setWindfield, windfield, timelineHour,
  } = useAgentStore();

  const wsRef        = useRef(null);
  const globeRef     = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ w: 600, h: 500 });
  const [globeReady, setGlobeReady] = useState(false);

  /* ── 响应式尺寸 ──────────────────────────────────────── */
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDimensions({ w: width, h: height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  /* ── Globe 就绪后飞向目标城市 ────────────────────────── */
  useEffect(() => {
    if (!globeReady || !globeRef.current) return;
    const coords = CITY_COORDS[region] ?? { lat, lng: lon };
    globeRef.current.pointOfView({ lat: coords.lat, lng: coords.lng, altitude: 1.8 }, 1200);
  }, [region, lat, lon, globeReady]);

  /* ── WebSocket 连接 ──────────────────────────────────── */
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
        if (data.event === "geojson") {
          setGeoJson(data.data);
          appendLog({ ...data, ts, message: data.message });
        } else {
          appendLog({ ...data, ts });
        }
        if (data.event === "entities" && data.data)
          useAgentStore.getState().setEntityData(data.data);
        if (data.event === "trade" && data.data)
          useAgentStore.getState().appendTrade(data.data);
        if (data.event === "heatmap" && data.data)
          setHeatmap(data.data);
        if (data.event === "windfield" && data.data)
          setWindfield(data.data);
        if (data.event === "risk" && data.data)
          useAgentStore.getState().setRiskData(data.data);
        if (data.event === "done")  setStatus("IDLE");
        if (data.event === "error") setStatus("ERROR");
      } catch { /* ignore parse errors */ }
    };

    ws.onerror  = () => {
      setStatus("ERROR");
      appendLog({ event: "error", message: "[ERROR] WebSocket 连接失败", ts: new Date().toLocaleTimeString() });
    };
    ws.onclose  = () => setStatus("IDLE");
  }, [region, lat, lon, setGeoJson, appendLog, setStatus, setHeatmap, setWindfield, whatIf]);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  /* ── 构建 Globe 数据源 ───────────────────────────────── */
  const weatherPoints = (geojsonData?.features ?? []).map((f) => {
    const [lng, lt] = f.geometry.coordinates;
    const p         = f.properties ?? {};
    const t         = p.temperature_2m ?? 20;
    return {
      lat: lt, lng,
      size:  0.6 + (Math.abs(t - 15) / 30) * 1.2,
      color: tempToNeonColor(t),
      label: `${t}°C · ${p.precipitation_probability ?? "--"}%`,
    };
  });

  const entityPoints = (entityData?.entities ?? []).map((ent) => ({
    lat:   ent.lat,
    lng:   ent.lon,
    size:  ent.st === "PANIC" ? 0.8 : ent.st === "STRESSED" ? 0.5 : 0.3,
    color: ent.st === "PANIC" ? "#FF0044" : ent.st === "STRESSED" ? "#FFEE00" : "#00FF88",
    label: `Entity #${String(ent.id).padStart(3,"0")} · ${ent.st}`,
  }));

  const allPoints   = [...weatherPoints, ...entityPoints];
  const nodeCount   = geojsonData?.features?.length ?? 0;
  const entityCount = entityData?.entities?.length  ?? 0;
  const heatmapData = useAgentStore((s) => s.heatmapData);
  const floodCount  = heatmapData?.flood_zones?.length ?? 0;

  const floodArcs = (heatmapData?.flood_zones ?? []).map((fz) => ({
    startLat: lat,  startLng: lon,
    endLat:   fz.lat, endLng: fz.lon,
    color:    ["#6200EE", "#FF1493"],
    stroke:   1.5,
    label:    `FLOOD · intensity ${fz.intensity?.toFixed(1)}%`,
  }));

  /* ── 当前时间帧的风场数据 ───────────────────────────── */
  const currentWindFrame = windfield?.hourly_vectors?.[timelineHour] ?? null;
  const windHours = windfield?.total_hours ?? 0;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>

      {/* ── Globe 画布容器 ── */}
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", overflow: "hidden", background: "transparent" }}
      >
        {dimensions.w > 0 && (
          <Globe
            ref={globeRef}
            width={dimensions.w}
            height={dimensions.h}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
            backgroundColor="rgba(0,0,0,0)"
            atmosphereColor="#FF69B4"
            atmosphereAltitude={0.18}
            animateIn={true}
            pointsData={allPoints}
            pointLat="lat"
            pointLng="lng"
            pointColor="color"
            pointAltitude="size"
            pointRadius={0.45}
            pointResolution={8}
            pointLabel="label"
            arcsData={floodArcs}
            arcStartLat="startLat"
            arcStartLng="startLng"
            arcEndLat="endLat"
            arcEndLng="endLng"
            arcColor="color"
            arcStroke="stroke"
            arcDashLength={0.4}
            arcDashGap={0.2}
            arcDashAnimateTime={1800}
            arcLabel="label"
            onGlobeReady={() => {
              setGlobeReady(true);
              if (globeRef.current) {
                const controls = globeRef.current.controls();
                if (controls) {
                  controls.autoRotate      = true;
                  controls.autoRotateSpeed = 0.6;
                  controls.enableZoom      = true;
                  controls.enablePan       = false;
                }
              }
            }}
          />
        )}
      </div>

      {/* ── Phase 6: 风场粒子 Canvas 叠加层 ── */}
      {currentWindFrame && (
        <WindParticleCanvas
          windframe={currentWindFrame}
          width={dimensions.w}
          height={dimensions.h}
        />
      )}

      {/* ── 角标装饰 ── */}
      <CornerDecor />

      {/* ── FETCH 按钮 ── */}
      <div style={{ position: "absolute", top: 8, right: 8, zIndex: 600 }}>
        <div style={{
          position: "absolute", inset: 0,
          transform: "translate(3px,3px)",
          background: "#00AA00", border: "2px solid #000",
        }} />
        <button
          onClick={connect}
          style={{
            position: "relative", background: "#00FF00",
            border: "2.5px solid #000", padding: "5px 12px",
            fontFamily: "'Courier New', monospace",
            fontSize: 12, fontWeight: 900, color: "#000",
            cursor: "pointer", letterSpacing: "1px",
            boxShadow: "0 0 8px rgba(0,255,0,0.5)",
          }}
          onMouseDown={(e) => { e.currentTarget.style.transform = "translate(3px,3px)"; }}
          onMouseUp={(e)   => { e.currentTarget.style.transform = ""; }}
          onMouseLeave={(e)=> { e.currentTarget.style.transform = ""; }}
        >▶ FETCH</button>
      </div>

      {/* ── 数据节点徽章 ── */}
      <div style={{
        position: "absolute", bottom: 28, left: 8, zIndex: 600, pointerEvents: "none",
        background: "#FFEE00", border: "2.5px solid #000", boxShadow: "3px 3px 0 0 #000",
        padding: "3px 10px",
        fontFamily: "'Courier New', monospace", fontSize: 12, fontWeight: 900, color: "#000",
      }}>
        {nodeCount > 0
          ? `◉ ${nodeCount} NODES / ${geojsonData?.metadata?.region ?? region}`
          : "◎ AWAITING DATA..."}
      </div>

      {/* ── 实体统计 ── */}
      {entityCount > 0 && (
        <div style={{
          position: "absolute", bottom: 8, left: 8, zIndex: 600, pointerEvents: "none",
          display: "flex", gap: 4,
          fontFamily: "'Courier New', monospace", fontSize: 11, fontWeight: 900,
        }}>
          {(() => {
            const s = entityData?.stats ?? {};
            const n = (s.total_entities ?? 0) - (s.panic_count ?? 0) - (s.stressed_count ?? 0);
            return (
              <>
                <span style={{ background: "#00FF00", border: "2.5px solid #000", padding: "2px 7px", color: "#000", boxShadow: "2px 2px 0 0 #000" }}>
                  ▷ {n} NORMAL
                </span>
                {(s.stressed_count ?? 0) > 0 && (
                  <span style={{ background: "#FFEE00", border: "2.5px solid #000", padding: "2px 7px", color: "#000", boxShadow: "2px 2px 0 0 #000" }}>
                    ◆ {s.stressed_count} STRESSED
                  </span>
                )}
                {(s.panic_count ?? 0) > 0 && (
                  <span style={{ background: "#FF0055", border: "2.5px solid #000", padding: "2px 7px", color: "#fff", boxShadow: "2px 2px 0 0 #000" }}>
                    ● {s.panic_count} PANIC
                  </span>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* ── Phase 5: 热力 + 洪涝徽章 ── */}
      {heatmapData && (
        <div style={{
          position: "absolute", top: 44, right: 8, zIndex: 600, pointerEvents: "none",
          display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-end",
        }}>
          <span style={{
            background: floodCount > 0 ? "#6200EE" : "#00FF00",
            border: "2px solid #000",
            boxShadow: floodCount > 0 ? "0 0 8px #6200EE" : "0 0 6px #00FF00",
            fontFamily: "'Courier New', monospace", fontSize: 10, fontWeight: 900,
            padding: "2px 8px", color: "#fff",
          }}>
            {floodCount > 0 ? `◈ ${floodCount} FLOOD ZONES` : "✓ NO FLOOD RISK"}
          </span>
          <span style={{
            background: "#000", border: "1.5px solid #FF1493",
            fontFamily: "'Courier New', monospace", fontSize: 9, fontWeight: 700,
            padding: "1px 6px", color: "#FF1493",
          }}>
            3D GLOBE · THREE.JS
          </span>
        </div>
      )}

      {/* ── Phase 6: 风场状态徽章 ── */}
      {windHours > 0 && currentWindFrame && (
        <div style={{
          position: "absolute", top: 8, left: 8, zIndex: 600, pointerEvents: "none",
          display: "flex", alignItems: "center", gap: 4,
          background: "rgba(0,0,0,0.8)", border: "2px solid #9370DB",
          padding: "3px 8px",
          fontFamily: "'Courier New', monospace", fontSize: 10, fontWeight: 900,
          boxShadow: "0 0 8px rgba(147,112,219,0.6)",
        }}>
          <span style={{ color: "#9370DB" }}>〜</span>
          <span style={{ color: windColor(currentWindFrame.avg_speed) }}>
            WIND·{currentWindFrame.avg_speed}m/s
          </span>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 9 }}>
            +{timelineHour}H
          </span>
        </div>
      )}

      {/* ── 自转指示灯 ── */}
      <div style={{
        position: "absolute", bottom: 28, right: 8, zIndex: 600, pointerEvents: "none",
        display: "flex", alignItems: "center", gap: 5,
        background: "rgba(0,0,0,0.75)", border: "1.5px solid #FF1493",
        padding: "3px 10px",
        fontFamily: "'Courier New', monospace", fontSize: 10, fontWeight: 900,
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: "50%",
          background: globeReady ? "#FF1493" : "#555",
          boxShadow: globeReady ? "0 0 6px #FF1493" : "none",
          display: "inline-block",
        }} />
        <span style={{ color: globeReady ? "#FF1493" : "#555" }}>
          {globeReady ? "AUTO-ROTATE" : "LOADING..."}
        </span>
      </div>
    </div>
  );
}
