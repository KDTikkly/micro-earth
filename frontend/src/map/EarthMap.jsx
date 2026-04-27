/**
 * EarthMap — Phase 5
 * Phase 5 新增：
 * - 超分辨率热力矩阵渲染（温度色阶网格）
 * - 洪涝区半透明电光紫多边形覆盖层
 */
import { useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAgentStore } from "../store/agentStore";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── 气象数据点样式 ───────────────────────────────────────────
function pointToLayer(feature, latlng) {
  const precip  = feature?.properties?.precipitation_probability ?? 0;
  const isRainy = precip > 50;
  const bg      = isRainy ? "#FF0055" : "#FFEE00";
  const textCol = isRainy ? "#fff" : "#000";
  const temp    = feature?.properties?.temperature_2m ?? "--";

  const icon = L.divIcon({
    className: "",
    html: `
      <div style="
        width:44px; height:44px;
        background:${bg};
        border:2.5px solid #000;
        box-shadow:4px 4px 0 0 #000;
        display:flex; flex-direction:column;
        align-items:center; justify-content:center;
        font-family:'Courier New',monospace;
        line-height:1.2; text-align:center;
      ">
        <span style="font-size:12px;font-weight:900;color:${textCol}">${temp}°</span>
        <span style="font-size:9px;font-weight:700;color:${textCol};opacity:0.8">${precip}%</span>
      </div>
    `,
    iconSize:   [44, 44],
    iconAnchor: [22, 22],
  });

  return L.marker(latlng, { icon });
}

function onEachFeature(feature, layer) {
  const p = feature?.properties ?? {};
  layer.bindPopup(`
    <div style="font-family:'Courier New',monospace;font-size:11px;min-width:150px;color:#1A1A1A">
      <div style="font-weight:900;margin-bottom:6px;border-bottom:1px solid #e0e0e0;padding-bottom:4px">
        WEATHER NODE
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:2px">
        <span style="color:#888">TEMP</span>
        <span style="font-weight:900">${p.temperature_2m ?? "--"}°C</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:2px">
        <span style="color:#888">PRECIP</span>
        <span style="font-weight:900">${p.precipitation_probability ?? "--"}%</span>
      </div>
      <div style="display:flex;justify-content:space-between">
        <span style="color:#888">AVG 24H</span>
        <span style="font-weight:900">${p.avg_temperature_24h ?? "--"}°C</span>
      </div>
      <div style="color:#ccc;font-size:9px;margin-top:6px">${p.source ?? "open-meteo.com"}</div>
    </div>
  `);
}

// ── 自动飞行 ────────────────────────────────────────────────
function FlyToData({ geojson }) {
  const map = useMap();
  useEffect(() => {
    if (!geojson?.metadata?.center) return;
    const [lon, lat] = geojson.metadata.center;
    map.flyTo([lat, lon], 10, { duration: 1.2 });
  }, [geojson, map]);
  return null;
}

// ── 实体 SVG Icon 工厂 ──────────────────────────────────────
function makeEntityIcon(status, id) {
  const idStr = String(id).padStart(3, "0");

  if (status === "PANIC") {
    // 红色实心圆 + 闪烁 CSS
    return L.divIcon({
      className: "",
      html: `
        <div style="
          width:14px; height:14px; border-radius:50%;
          background:#FF0044; border:2px solid #1A1A1A;
          animation:entity-panic 0.6s infinite alternate;
          box-shadow:0 0 6px 2px rgba(255,0,68,0.6);
        " title="Entity #${idStr} — PANIC"></div>
        <style>
          @keyframes entity-panic {
            from { transform:scale(1); opacity:1; }
            to   { transform:scale(1.5); opacity:0.5; }
          }
        </style>
      `,
      iconSize:   [14, 14],
      iconAnchor: [7, 7],
    });
  }

  if (status === "STRESSED") {
    // 黄色实心菱形 + 脉冲
    return L.divIcon({
      className: "",
      html: `
        <div style="
          width:12px; height:12px;
          background:#FFE66D; border:1.5px solid #1A1A1A;
          transform:rotate(45deg);
          animation:entity-stress 1.2s ease-in-out infinite alternate;
        " title="Entity #${idStr} — STRESSED"></div>
        <style>
          @keyframes entity-stress {
            from { transform:rotate(45deg) scale(1); }
            to   { transform:rotate(45deg) scale(1.3); }
          }
        </style>
      `,
      iconSize:   [12, 12],
      iconAnchor: [6, 6],
    });
  }

  // NORMAL: 蓝色空心细线三角形
  return L.divIcon({
    className: "",
    html: `
      <svg width="12" height="11" viewBox="0 0 12 11" fill="none"
           title="Entity #${idStr}" style="display:block;overflow:visible">
        <polygon points="6,1 11,10 1,10"
          stroke="#1A6AFF" stroke-width="1.5" fill="none"
          stroke-linejoin="round"/>
      </svg>
    `,
    iconSize:   [12, 11],
    iconAnchor: [6, 5],
  });
}

// ── 实体 Marker 层（独立组件，响应 Zustand 更新）───────────
function EntityLayer() {
  const entityData = useAgentStore((s) => s.entityData);
  const map = useMap();
  const markersRef = useRef({});   // id -> L.Marker
  const layerRef   = useRef(null);

  useEffect(() => {
    if (!layerRef.current) {
      layerRef.current = L.layerGroup().addTo(map);
    }
  }, [map]);

  useEffect(() => {
    if (!entityData?.entities || !layerRef.current) return;
    const entities = entityData.entities;
    const seen = new Set();

    entities.forEach((ent) => {
      const { id, lat, lon, st } = ent;
      seen.add(id);

      if (markersRef.current[id]) {
        // 更新位置 & 图标
        markersRef.current[id].setLatLng([lat, lon]);
        markersRef.current[id].setIcon(makeEntityIcon(st, id));
      } else {
        // 新建 Marker
        const marker = L.marker([lat, lon], {
          icon: makeEntityIcon(st, id),
          zIndexOffset: st === "PANIC" ? 500 : st === "STRESSED" ? 200 : 0,
        });
        marker.addTo(layerRef.current);
        markersRef.current[id] = marker;
      }
    });

    // 清理已消失的实体
    Object.keys(markersRef.current).forEach((k) => {
      if (!seen.has(Number(k))) {
        layerRef.current.removeLayer(markersRef.current[k]);
        delete markersRef.current[k];
      }
    });
  }, [entityData]);

  // 组件卸载清理
  useEffect(() => {
    return () => {
      if (layerRef.current) {
        layerRef.current.clearLayers();
      }
    };
  }, []);

  return null;
}

// ── Phase 5: 超分辨率热力矩阵 + 洪涝区渲染 ─────────────────────────────────
function HeatmapLayer() {
  const heatmapData  = useAgentStore((s) => s.heatmapData);
  const map          = useMap();
  const gridLayerRef = useRef(null);
  const floodLayerRef = useRef(null);

  // 温度映射到颜色（蓝→青→绿→黄→红）
  function tempToColor(t) {
    if (t <= 5)  return "rgba(0,100,255,0.45)";
    if (t <= 15) return "rgba(0,200,255,0.40)";
    if (t <= 22) return "rgba(0,255,150,0.35)";
    if (t <= 28) return "rgba(255,230,0,0.40)";
    if (t <= 33) return "rgba(255,140,0,0.45)";
    return "rgba(255,0,85,0.50)";
  }

  useEffect(() => {
    // 清理旧图层
    if (gridLayerRef.current) { map.removeLayer(gridLayerRef.current); gridLayerRef.current = null; }
    if (floodLayerRef.current) { map.removeLayer(floodLayerRef.current); floodLayerRef.current = null; }

    if (!heatmapData?.temp_matrix?.length) return;

    const { temp_matrix, precip_matrix, flood_zones, bounds, resolution } = heatmapData;
    const { min_lat, max_lat, min_lon, max_lon } = bounds;
    const dLat = (max_lat - min_lat) / resolution;
    const dLon = (max_lon - min_lon) / resolution;

    // ① 温度热力网格
    const gridGroup = L.layerGroup();
    for (let row = 0; row < resolution; row++) {
      for (let col = 0; col < resolution; col++) {
        const t = temp_matrix[row]?.[col] ?? 20;
        const cellLat1 = min_lat + row * dLat;
        const cellLat2 = cellLat1 + dLat;
        const cellLon1 = min_lon + col * dLon;
        const cellLon2 = cellLon1 + dLon;
        const color = tempToColor(t);

        L.rectangle(
          [[cellLat1, cellLon1], [cellLat2, cellLon2]],
          {
            color: "transparent",
            fillColor: color.replace("rgba", "rgb").replace(/,[^,]+\)/, ")"),
            fillOpacity: parseFloat(color.match(/,([\d.]+)\)$/)?.[1] ?? 0.4),
            weight: 0,
            interactive: false,
          }
        ).addTo(gridGroup);
      }
    }
    gridLayerRef.current = gridGroup;
    gridGroup.addTo(map);

    // ② 洪涝区 — 半透明电光紫多边形
    if (flood_zones?.length > 0) {
      const floodGroup = L.layerGroup();
      const halfDLat = dLat * 0.55;
      const halfDLon = dLon * 0.55;

      flood_zones.forEach(({ lat: fLat, lon: fLon, intensity }) => {
        L.rectangle(
          [[fLat - halfDLat, fLon - halfDLon], [fLat + halfDLat, fLon + halfDLon]],
          {
            color: "#6200EE",
            weight: 2,
            dashArray: "4 3",
            fillColor: "#6200EE",
            fillOpacity: Math.min(0.15 + (intensity - 80) / 100 * 0.35, 0.5),
            interactive: false,
          }
        ).addTo(floodGroup);
      });

      floodLayerRef.current = floodGroup;
      floodGroup.addTo(map);
    }

    return () => {
      if (gridLayerRef.current) { map.removeLayer(gridLayerRef.current); gridLayerRef.current = null; }
      if (floodLayerRef.current) { map.removeLayer(floodLayerRef.current); floodLayerRef.current = null; }
    };
  }, [heatmapData, map]);

  return null;
}
function BlueprintCornerDecor() {
  return (
    <>
      {/* 右上角：霓虹粉三角 */}
      <div style={{
        position: "absolute", top: 0, right: 0,
        zIndex: 1000, pointerEvents: "none",
        width: 0, height: 0,
        borderLeft: "32px solid transparent",
        borderTop: "32px solid #FF0055",
        filter: "drop-shadow(-3px 3px 0 #000)",
      }} />
      {/* 左下角：明黄方块 */}
      <div style={{
        position: "absolute", bottom: 0, left: 0,
        zIndex: 1000, pointerEvents: "none",
        width: 16, height: 16,
        background: "#FFEE00",
        border: "2.5px solid #000",
      }} />
      {/* 右下角：电光紫菱形 */}
      <div style={{
        position: "absolute", bottom: 8, right: 8,
        zIndex: 1000, pointerEvents: "none",
        width: 14, height: 14,
        background: "#6200EE",
        border: "2px solid #000",
        transform: "rotate(45deg)",
      }} />
    </>
  );
}

export default function EarthMap({ region = "深圳", lat = 22.69, lon = 114.39 }) {
  const { geojsonData, entityData, setGeoJson, appendLog, setStatus, setHeatmap, whatIf } = useAgentStore();
  const wsRef = useRef(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    setStatus("CONNECTING");

    const ws = new WebSocket("ws://localhost:8000/ws/agent-stream");
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("RUNNING");
      ws.send(JSON.stringify({
        region, lat, lon,
        temp_offset: whatIf?.tempOffset ?? 0.0,
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
        if (data.event === "entities" && data.data) {
          useAgentStore.getState().setEntityData(data.data);
        }
        if (data.event === "trade" && data.data) {
          useAgentStore.getState().appendTrade(data.data);
        }
        // Phase 5: 接收超分辨率热力矩阵
        if (data.event === "heatmap" && data.data) {
          setHeatmap(data.data);
        }
        if (data.event === "risk" && data.data) {
          useAgentStore.getState().setRiskData(data.data);
        }
        if (data.event === "done")  setStatus("IDLE");
        if (data.event === "error") setStatus("ERROR");
      } catch { /* ignore */ }
    };

    ws.onerror = () => {
      setStatus("ERROR");
      appendLog({ event: "error", message: "[ERROR] 地图 WebSocket 连接失败", ts: new Date().toLocaleTimeString() });
    };

    ws.onclose = () => setStatus("IDLE");
  }, [region, lat, lon, setGeoJson, appendLog, setStatus, setHeatmap, whatIf]);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  // 实体统计
  const stats = entityData?.stats;
  const panicCount    = stats?.panic_count ?? 0;
  const stressedCount = stats?.stressed_count ?? 0;
  const totalEntities = stats?.total_entities ?? 0;
  const heatmapData   = useAgentStore((s) => s.heatmapData);
  const floodCount    = heatmapData?.flood_zones?.length ?? 0;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <MapContainer
        center={[lat, lon]}
        zoom={9}
        style={{ width: "100%", height: "100%", background: "#f8f8f6" }}
        zoomControl={true}
        attributionControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />

        {geojsonData && (
          <GeoJSON
            key={JSON.stringify(geojsonData?.metadata)}
            data={geojsonData}
            pointToLayer={pointToLayer}
            onEachFeature={onEachFeature}
          />
        )}
        {geojsonData && <FlyToData geojson={geojsonData} />}

        {/* Phase 4: 实体渲染层 */}
        <EntityLayer />

        {/* Phase 5: 超分辨率热力矩阵 + 洪涝区 */}
        <HeatmapLayer />
      </MapContainer>

      {/* 角标装饰 */}
      <BlueprintCornerDecor />

      {/* 数据节点状态徽章 */}
      <div style={{
        position: "absolute", bottom: 28, left: 8,
        zIndex: 600, pointerEvents: "none",
        background: "#FFEE00",
        border: "2.5px solid #000",
        boxShadow: "3px 3px 0 0 #000",
        padding: "3px 10px",
        fontFamily: "'Courier New', monospace",
        fontSize: 12, fontWeight: 900, color: "#000",
      }}>
        {geojsonData
          ? `◉ ${geojsonData.features?.length ?? 0} NODES / ${geojsonData.metadata?.region ?? region}`
          : "◎ AWAITING DATA..."}
      </div>

      {/* Phase 4: 实体统计徽章 */}
      {totalEntities > 0 && (
        <div style={{
          position: "absolute", bottom: 8, left: 8,
          zIndex: 600, pointerEvents: "none",
          display: "flex", gap: 4,
          fontFamily: "'Courier New', monospace",
          fontSize: 11, fontWeight: 900,
        }}>
          <span style={{ background: "#00FF00", border: "2.5px solid #000", padding: "2px 7px", color: "#000", boxShadow: "2px 2px 0 0 #000" }}>
            ▷ {totalEntities - panicCount - stressedCount} NORMAL
          </span>
          {stressedCount > 0 && (
            <span style={{ background: "#FFEE00", border: "2.5px solid #000", padding: "2px 7px", color: "#000", boxShadow: "2px 2px 0 0 #000" }}>
              ◆ {stressedCount} STRESSED
            </span>
          )}
          {panicCount > 0 && (
            <span style={{ background: "#FF0055", border: "2.5px solid #000", padding: "2px 7px", color: "#fff", boxShadow: "2px 2px 0 0 #000" }}>
              ● {panicCount} PANIC
            </span>
          )}
        </div>
      )}

      {/* Phase 5: 热力矩阵 + 洪涝区徽章 */}
      {heatmapData && (
        <div style={{
          position: "absolute", top: 44, right: 8,
          zIndex: 600, pointerEvents: "none",
          display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-end",
        }}>
          <span style={{
            background: floodCount > 0 ? "#6200EE" : "#00FF00",
            border: "2px solid #000", boxShadow: floodCount > 0 ? "0 0 8px #6200EE" : "0 0 6px #00FF00",
            fontFamily: "'Courier New', monospace", fontSize: 10, fontWeight: 900,
            padding: "2px 8px", color: "#fff",
          }}>
            {floodCount > 0 ? `◈ ${floodCount} FLOOD ZONES` : "✓ NO FLOOD RISK"}
          </span>
          <span style={{
            background: "#000", border: "1.5px solid #FFEE00",
            fontFamily: "'Courier New', monospace", fontSize: 9, fontWeight: 700,
            padding: "1px 6px", color: "#FFEE00",
          }}>
            12×12 SR GRID
          </span>
        </div>
      )}

      {/* FETCH 重新触发按钮 — 右上角 */}
      <div style={{ position: "absolute", top: 8, right: 8, zIndex: 600 }}>
        <div style={{
          position: "absolute", inset: 0,
          transform: "translate(3px,3px)",
          background: "#00AA00", border: "2px solid #000",
        }} />
        <button
          onClick={connect}
          style={{
            position: "relative",
            background: "#00FF00",
            border: "2.5px solid #000",
            padding: "5px 12px",
            fontFamily: "'Courier New', monospace",
            fontSize: 12, fontWeight: 900, color: "#000",
            cursor: "pointer", letterSpacing: "1px",
            boxShadow: "0 0 8px rgba(0,255,0,0.5)",
          }}
          onMouseDown={(e) => { e.currentTarget.style.transform = "translate(3px,3px)"; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = ""; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
        >
          ▶ FETCH
        </button>
      </div>
    </div>
  );
}
