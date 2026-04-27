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

  appendLog:    (entry) => set((s) => ({ logs: [...s.logs, entry] })),
  setStatus:    (status) => set({ status }),
  setRegion:    (region) => set({ region }),
  setCoords:    (lat, lon) => set({ lat, lon }),
  setGeoJson:   (data) => set({ geojsonData: data }),
  setRiskData:  (data) => set({ riskData: data }),
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
    entityData: null, tradeLog: [], assetHistory: [],
  }),
}));
