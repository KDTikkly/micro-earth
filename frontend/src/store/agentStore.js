import { create } from "zustand";

export const useAgentStore = create((set) => ({
  logs:         [],
  status:       "IDLE",   // IDLE | CONNECTING | RUNNING | ERROR
  region:       "深圳",
  lat:          22.69,
  lon:          114.39,
  geojsonData:  null,     // v2.0: GeoJSON FeatureCollection
  riskData:     null,     // v3.0: 极端天气风险指数
  entityData:   null,     // v4.0-7: 实体列表 + stats
  tradeLog:     [],       // v4.0-7: 事件滚动日志（疏散警告 / 旧交易事件）
  assetHistory: [],       // v4.0 旧字段（保留兼容）
  evacuationHistory: [],  // v7.0: 疏散进度历史
  ammPriceHistory: [],    // v8.0: AMM 动态资产价格历史 [{t, price, k}]
  tradeHashLog: [],       // v8.0: 交易哈希日志（最近50条）
  heatmapData:  null,     // v5.0: 超分辨率热力矩阵
  windfield:    null,     // v6.0: 72h 风场矢量场
  timelineHour: 0,        // v6.0: 当前时间轴小时偏移 (0~71)
  whatIf: {               // v5.0: What-If 干预参数
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
    // v7.0: 追踪疏散进度历史
    const stats = data?.stats;
    const newEvacHistory = stats
      ? [...s.evacuationHistory, {
          evacuating: stats.evacuating_count ?? stats.panic_count ?? 0,
          rescued:    stats.rescued_count ?? 0,
          safe:       stats.safe_count ?? stats.normal_count ?? 0,
        }].slice(-60)
      : s.evacuationHistory;
    // 兼容旧 assetHistory
    const newHistory = stats?.avg_asset_value != null
      ? [...s.assetHistory, stats.avg_asset_value].slice(-60)
      : s.assetHistory;
    return { entityData: data, assetHistory: newHistory, evacuationHistory: newEvacHistory };
  }),
  appendTrade:  (evt) => set((s) => {
    // v8.0: 同步更新 AMM 价格历史 + 交易哈希日志
    const newAmmHistory = evt.amm_price != null
      ? [...s.ammPriceHistory, { t: evt.ts, price: evt.amm_price, k: evt.amm_k ?? null }].slice(-60)
      : s.ammPriceHistory;
    const hashEntry = evt.tx_hash
      ? [{ ts: evt.ts, hash: evt.tx_hash, action: evt.action, entity_id: evt.entity_id, chain_mode: evt.chain_mode ?? false }, ...s.tradeHashLog].slice(0, 50)
      : s.tradeHashLog;
    return {
      tradeLog: [evt, ...s.tradeLog].slice(0, 50),
      ammPriceHistory: newAmmHistory,
      tradeHashLog: hashEntry,
    };
  }),
  clearLogs: () => set({
    logs: [], status: "IDLE", geojsonData: null, riskData: null,
    entityData: null, tradeLog: [], assetHistory: [], evacuationHistory: [],
    ammPriceHistory: [], tradeHashLog: [],
    heatmapData: null, windfield: null, timelineHour: 0,
  }),
}));



