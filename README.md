# 🌍 Micro-Earth

> **Digital Twin Earth** — 实时气象数字孪生系统  
> Blueprint Neo-Brutalism Edition · v0.2.0

A spatial-awareness engine that combines AI agents, real-time weather data, and interactive geospatial visualization.

![Tech Stack](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=flat-square&logo=react)
![Backend](https://img.shields.io/badge/Backend-FastAPI%20%2B%20LangGraph-009688?style=flat-square&logo=fastapi)
![Map](https://img.shields.io/badge/Map-Leaflet-green?style=flat-square&logo=leaflet)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

---

## ✨ Features

- **Real-time Weather Grid** — Fetches live weather data via [Open-Meteo](https://open-meteo.com/) and renders it as a GeoJSON overlay on an interactive map
- **AI Agent Pipeline** — LangGraph-powered multi-agent orchestration (geocoder → data retriever → physics engine)
- **WebSocket Streaming** — Live agent log streaming from backend to frontend terminal
- **Multi-City Support** — Shenzhen, Beijing, Shanghai, Chengdu, Tokyo, New York
- **Neo-Brutalist UI** — Distinctive design with Courier New monospace, bold borders, and floating geometric decorations

---

## 🏗️ Project Structure

```
micro-earth/
├── backend/                  # Python FastAPI backend
│   ├── agents/
│   │   ├── orchestrator.py   # LangGraph agent graph
│   │   ├── geocoder.py       # City → coordinates
│   │   ├── data_retriever.py # Open-Meteo API fetcher
│   │   └── physics_engine.py # Weather data processor
│   ├── api/
│   │   └── main.py           # FastAPI app + WebSocket endpoint
│   └── requirements.txt
└── frontend/                 # React + Vite frontend
    ├── src/
    │   ├── components/
    │   │   ├── AgentTerminal.jsx     # Live WebSocket log terminal
    │   │   ├── AnalyticsDashboard.jsx
    │   │   └── BrutalistCard.jsx     # Reusable UI card
    │   ├── map/
    │   │   └── EarthMap.jsx          # Leaflet map with GeoJSON layer
    │   ├── store/
    │   │   └── agentStore.js         # Zustand global state
    │   └── App.jsx
    ├── package.json
    └── vite.config.js
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- Python >= 3.10

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs at **http://localhost:5173** (or next available port)

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000
```

Runs at **http://localhost:8000**

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| WS | `/ws/agent-stream` | WebSocket: real-time agent logs + GeoJSON |

### WebSocket Payload

Send on connect:
```json
{
  "region": "深圳",
  "lat": 22.69,
  "lon": 114.39,
  "city_query": ""
}
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend Framework | React 19 + Vite 8 |
| Styling | Tailwind CSS v4 + Inline Neo-Brutalism |
| Animation | Framer Motion |
| Map | React-Leaflet |
| State Management | Zustand |
| Backend Framework | FastAPI |
| Agent Orchestration | LangGraph |
| Weather Data | Open-Meteo API |
| Real-time Communication | WebSocket |

---

## 📄 License

MIT © 2026 [KDTikkly](https://github.com/KDTikkly)
