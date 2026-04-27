import { create } from "zustand";

export const useAgentStore = create((set) => ({
  logs:         [],
  status:       "IDLE",   // IDLE | CONNECTING | RUNNING | ERROR
  region:       "深圳",
  lat:          22.69,
  lon:          114.39,
  geojsonData:  null,     // Phase 2: GeoJSON FeatureCollection
  riskData:     null,     // Phase 3: 极端天气风险指数
  entityData:   null,     // Phase 4: 实体列表 + stats
  tradeLog:     [],       // Phase 4: 交易事件滚动日志（最近50条）
  assetHistory: [],       // Phase 4: 全局均值资产历史曲线
  heatmapData:  null,     // Phase 5: 超分辨率热力矩阵
  windfield:    null,     // Phase 6: 72h 风场矢量场
  timelineHour: 0,        // Phase 6: 当前时间轴小时偏移 (0~71)
  whatIf: {               // Phase 5: What-If 干预参数
    tempOffset:       0.0,
    precipMultiplier: 1.0,
  },

  appendLog:    (entry) => set((s) => ({ logs: [...s.logs, entry] })),
  setStatus:    (status) => set({ status }),
  setRegion:    (region) => set({ region }),
  setCoords:    (lat, lon) => set({ lat, lon }),
  setGeoJson:   (data) => set({ geojsonData: data }),
  setRiskData:  (data) => set({ riskData: data }),
  setHeatmap:   (data) => set({ heatmapData: data }),
  setWindfield: (data) => set({ windfield: data }),
  setTimelineHour: (h) => set((s) => ({ timelineHour: typeof h === "function" ? h(s.timelineHour) : h })),
  setWhatIf:    (params) => set((s) => ({ whatIf: { ...s.whatIf, ...params } })),
  setEntityData: (data) => set((s) => {
    const newHistory = data?.stats?.avg_asset_value != null
      ? [...s.assetHistory, data.stats.avg_asset_value].slice(-60)
      : s.assetHistory;
    return { entityData: data, assetHistory: newHistory };
  }),
  appendTrade:  (evt) => set((s) => ({
    tradeLog: [evt, ...s.tradeLog].slice(0, 50),
  })),
  clearLogs: () => set({
    logs: [], status: "IDLE", geojsonData: null, riskData: null,
    entityData: null, tradeLog: [], assetHistory: [], heatmapData: null,
    windfield: null, timelineHour: 0,
  }),
}));

