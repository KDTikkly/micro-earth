/**
 * EarthMap — Blueprint Neo-Brutalism 版
 * - CartoDB Positron 浅色底图
 * - 白底 + 粗黑边框 + 轻盈硬投影
 * - 粉彩数据方块（降水概率驱动）
 * - 图纸风标签 + 几何角标装饰
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

// ── 数据点样式：粉彩方块 ────────────────────────────────────
function pointToLayer(feature, latlng) {
  const precip  = feature?.properties?.precipitation_probability ?? 0;
  const isRainy = precip > 50;
  const bg      = isRainy ? "#FFB5A7" : "#FFE66D";
  const temp    = feature?.properties?.temperature_2m ?? "--";

  const icon = L.divIcon({
    className: "",
    html: `
      <div style="
        width:42px; height:42px;
        background:${bg};
        border:2px solid #1A1A1A;
        box-shadow:3px 3px 0 0 #1A1A1A;
        display:flex; flex-direction:column;
        align-items:center; justify-content:center;
        font-family:'Courier New',monospace;
        line-height:1.2; text-align:center;
      ">
        <span style="font-size:11px;font-weight:900;color:#1A1A1A">${temp}°</span>
        <span style="font-size:8px;font-weight:700;color:#555">${precip}%</span>
      </div>
    `,
    iconSize:   [42, 42],
    iconAnchor: [21, 21],
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

// 自动飞行到数据中心
function FlyToData({ geojson }) {
  const map = useMap();
  useEffect(() => {
    if (!geojson?.metadata?.center) return;
    const [lon, lat] = geojson.metadata.center;
    map.flyTo([lat, lon], 10, { duration: 1.2 });
  }, [geojson, map]);
  return null;
}

// ── 图纸风角标装饰 ──────────────────────────────────────────
function BlueprintCornerDecor() {
  return (
    <>
      {/* 右上角：蓝色小三角 */}
      <div style={{
        position: "absolute", top: 0, right: 0,
        zIndex: 1000, pointerEvents: "none",
        width: 0, height: 0,
        borderLeft: "28px solid transparent",
        borderTop: "28px solid #9BF6FF",
        filter: "drop-shadow(-2px 2px 0 #1A1A1A)",
      }} />
      {/* 左下角：黄色小方块 */}
      <div style={{
        position: "absolute", bottom: 0, left: 0,
        zIndex: 1000, pointerEvents: "none",
        width: 14, height: 14,
        background: "#FFE66D",
        border: "2px solid #1A1A1A",
      }} />
      {/* 右下角：粉色菱形 */}
      <div style={{
        position: "absolute", bottom: 6, right: 6,
        zIndex: 1000, pointerEvents: "none",
        width: 12, height: 12,
        background: "#FFB5A7",
        border: "2px solid #1A1A1A",
        transform: "rotate(45deg)",
      }} />
    </>
  );
}

export default function EarthMap({ region = "深圳", lat = 22.69, lon = 114.39 }) {
  const { geojsonData, setGeoJson, appendLog, setStatus } = useAgentStore();
  const wsRef = useRef(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    setStatus("CONNECTING");

    const ws = new WebSocket("ws://localhost:8000/ws/agent-stream");
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("RUNNING");
      ws.send(JSON.stringify({ region, lat, lon }));
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
        if (data.event === "done")  setStatus("IDLE");
        if (data.event === "error") setStatus("ERROR");
      } catch { /* ignore */ }
    };

    ws.onerror = () => {
      setStatus("ERROR");
      appendLog({ event: "error", message: "[ERROR] 地图 WebSocket 连接失败", ts: new Date().toLocaleTimeString() });
    };

    ws.onclose = () => setStatus("IDLE");
  }, [region, lat, lon, setGeoJson, appendLog, setStatus]);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <MapContainer
        center={[lat, lon]}
        zoom={9}
        style={{ width: "100%", height: "100%", background: "#f8f8f6" }}
        zoomControl={true}
        attributionControl={true}
      >
        {/* CartoDB Positron 浅色极简底图 */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
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
      </MapContainer>

      {/* 角标装饰 */}
      <BlueprintCornerDecor />

      {/* 数据节点状态徽章 */}
      <div style={{
        position: "absolute", bottom: 28, left: 8,
        zIndex: 600, pointerEvents: "none",
        background: "#FFE66D",
        border: "2px solid #1A1A1A",
        boxShadow: "2px 2px 0 0 #1A1A1A",
        padding: "2px 8px",
        fontFamily: "'Courier New', monospace",
        fontSize: 10, fontWeight: 900, color: "#1A1A1A",
      }}>
        {geojsonData
          ? `◉ ${geojsonData.features?.length ?? 0} NODES / ${geojsonData.metadata?.region ?? region}`
          : "◎ AWAITING DATA..."}
      </div>

      {/* FETCH 重新触发按钮 */}
      <div style={{ position: "absolute", top: 8, left: 8, zIndex: 600 }}>
        <div style={{
          position: "absolute", inset: 0,
          transform: "translate(3px,3px)",
          background: "#B5EAD7", border: "2px solid #1A1A1A",
        }} />
        <button
          onClick={connect}
          style={{
            position: "relative",
            background: "#fff",
            border: "2px solid #1A1A1A",
            padding: "4px 10px",
            fontFamily: "'Courier New', monospace",
            fontSize: 10, fontWeight: 900, color: "#1A1A1A",
            cursor: "pointer", letterSpacing: "1px",
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
