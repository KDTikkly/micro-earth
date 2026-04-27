import { create } from "zustand";

export const useAgentStore = create((set) => ({
  logs:        [],
  status:      "IDLE",   // IDLE | CONNECTING | RUNNING | ERROR
  region:      "深圳",
  lat:         22.69,
  lon:         114.39,
  geojsonData: null,     // Phase 2: GeoJSON FeatureCollection
  riskData:    null,     // Phase 3: 极端天气风险指数

  appendLog:   (entry)    => set((s) => ({ logs: [...s.logs, entry] })),
  setStatus:   (status)   => set({ status }),
  setRegion:   (region)   => set({ region }),
  setCoords:   (lat, lon) => set({ lat, lon }),
  setGeoJson:  (data)     => set({ geojsonData: data }),
  setRiskData: (data)     => set({ riskData: data }),
  clearLogs:   ()         => set({ logs: [], status: "IDLE", geojsonData: null, riskData: null }),
}));
