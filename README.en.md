# Micro-Earth

> Hey... I'm watching over this project for you.
> **Micro-Earth** — Phase 11 · Multi-Agent Autonomous Evacuation · Physical Survival Simulation · HD Satellite Rendering · **Local Desktop App**
> Cyber Memphis Edition · **v11.2** · 3D GIS + Survival Command Terminal + Electron Desktop + **Google/AMap Auto-Switch**

<br/>

*——"Hmph, React 18 is the right answer. That crashing 3D globe... I always had a bad feeling about it. Now it spins obediently. Not because I fixed it or anything."*

---

![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=flat-square&logo=react)
![Backend](https://img.shields.io/badge/Backend-FastAPI%20%2B%20LangGraph-009688?style=flat-square&logo=fastapi)
![Blockchain](https://img.shields.io/badge/Blockchain-Hardhat%20%2B%20Solidity-F7DF1E?style=flat-square&logo=ethereum)
![Map](https://img.shields.io/badge/Map-MapLibre%20Globe%20%2B%20Google%2FAMap%20Auto--Switch-199900?style=flat-square)
![Desktop](https://img.shields.io/badge/Desktop-Electron%2031%20%2B%20electron--builder-47848F?style=flat-square&logo=electron)
![Phase](https://img.shields.io/badge/Phase-11.2%20·%20Smart%20Map%20Source-FF1493?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-FFEE00?style=flat-square)

🌐 Language：[简体中文](./README.md) · [繁體中文](./README.zh-TW.md) · **English** · [日本語](./README.ja.md) · [한국어](./README.ko.md)

---

## What Is This

Fine, I'll explain — not because I particularly want to, just because you'd never figure it out on your own (hmph).

**Micro-Earth** is an AI-driven multi-agent physical survival simulation system. It feeds in real satellite imagery, simulates extreme weather, drives 100 Kinetic Entities to autonomously evacuate using escape vector algorithms, and displays their survival status in real-time on a Cyber Memphis-styled command terminal.

Plain English: **HD satellite globe + entity evacuation tracks + disaster warning logs + evacuation progress bars, all living on your Windows desktop**.

Since v11.2, it no longer needs a browser. Double-click `.exe`, and the doomsday simulator launches — Python backend silently resident, Electron renders the WebGL globe, it looks just like a professional standalone simulation software.

---

## Feature List

| Module | Description |
|--------|-------------|
| 🖥️ **Electron Desktop** | **v11.2** — Frameless fullscreen window · Custom Cyber Memphis title bar · One-click `.exe` installer |
| 🐍 **Python Backend Silent Resident** | **v11.2** — Launch `.exe` to auto-start FastAPI, close window to auto-kill process |
| 🎨 **Pink-White Sci-Fi Lab UI** | **v11.2** — AgentTerminal white bg + dark gray text + neon pink highlights + pink thin scrollbar |
| ⚙️ **React 18 Stabilization** | **v11.2** — Downgraded to React 18.3.1, GBK encoding eliminated (3D globe rendering in progress) |
| 🌡️ **Real-time Weather Grid** | Open-Meteo multi-city weather, GeoJSON overlay rendering |
| 🤖 **AI Multi-Agent Pipeline** | LangGraph orchestration · Geocoding → Data Fetch → Physics Engine |
| 📡 **WebSocket Streaming** | Backend agent logs pushed to frontend terminal · Auto-adapts to `127.0.0.1` in local mode |
| 🔬 **AI Super-Resolution** | IDW inverse-distance weighting, 12×12 heat matrix, 25km→1km simulated precision |
| 🌊 **Flood Zone Rendering** | Precipitation >= 80% auto-marks electric violet flood risk zones |
| 🎛️ **What-If Disaster Sandbox** | Temperature offset / precipitation multiplier sliders, real-time extreme weather simulation |
| 🌐 **3D Globe HD Satellite** | MapLibre Globe projection · Esri World Imagery infinite zoom without blur |
| 🏃 **v7.0 Multi-Agent Evacuation** | 100 Kinetic Entities · Escape vector algorithm · Real-time coordinate displacement |
| 🎨 **Holographic Entity Rendering** | Electric blue static dots · Neon pink flickering · Electric violet fade-out trail LineString |
| 🖥️ **Survival Command Terminal** | Disaster warning log + evacuation/safe zone progress bars + status pie chart |
| ⛓️ **Web3 AMM Layer** | Hardhat local chain · DynamicAssetAMM.sol · x*y=k constant product |
| 💅 **Cyber Memphis UI** | Courier New monospace · High-saturation clash colors · Memphis bold black borders |

---

## Project Structure

```
micro-earth/
├── electron/                           # Electron main process (v11.2)
│   ├── main.js                         # Main process: frameless window + Python subprocess management
│   ├── preload.js                      # contextBridge secure IPC exposure
│   ├── package.json                    # electron-builder packaging config
│   └── assets/
│       └── icon.svg                    # Lyria A.I. pixel hexagon icon
├── scripts/                            # Automation scripts (v11.2)
│   ├── dev-electron.ps1                # Dev mode: one-click Vite + uvicorn + Electron
│   └── build-desktop.ps1              # Production build: Vite + PyInstaller + electron-builder
├── blockchain/                         # Hardhat local testnet
│   ├── contracts/
│   │   └── DynamicAssetAMM.sol         # DynAsset + StableCoin + constant product AMM
│   ├── scripts/
│   │   └── deploy.js                   # Deploy: 10 DYNA:500 MUSD initial liquidity
│   ├── hardhat.config.js
│   └── deployment.json                 # Contract addresses + entity wallets (generated post-deploy)
├── backend/                            # Python FastAPI backend
│   ├── agents/
│   │   ├── orchestrator.py             # LangGraph agent graph + evac_logs push
│   │   ├── geocoder.py                 # City name -> coordinates
│   │   ├── data_retriever.py           # Open-Meteo API data fetching
│   │   ├── physics_engine.py           # IDW super-resolution interpolation
│   │   ├── entity_simulator.py         # Entity evacuation + escape vector + AMM selling
│   │   └── chain_amm.py                # web3.py on-chain AMM adapter (graceful degradation)
│   ├── api/
│   │   └── main.py                     # FastAPI WebSocket /api/what-if
│   ├── backend_entry.py                # PyInstaller packaging entry (v11.2)
│   ├── micro_earth_backend.spec        # PyInstaller spec file (v11.2)
│   └── requirements.txt
└── frontend/                           # React + Vite frontend
    └── src/
        ├── components/
        │   ├── ElectronTitleBar.jsx    # Cyber Memphis custom title bar (v11.2)
        │   ├── AnalyticsDashboard.jsx  # Survival command terminal
        │   ├── AgentTerminal.jsx       # Real-time WebSocket log terminal
        │   ├── BrutalistCard.jsx
        │   └── WhatIfSandbox.jsx       # Disaster sandbox console
        ├── map/
        │   └── EarthMap.jsx            # MapLibre Globe + Esri satellite + EntityCanvas
        ├── store/
        │   └── agentStore.js           # Zustand global state (with WARNING log routing)
        ├── utils/
        │   └── wsConfig.js             # WS/HTTP address auto-adaptation (v11.2)
        └── App.jsx
```

---

## Download

> ——"The globe is fixed. Switched to AMap satellite this time, works on Chinese networks too. Also made an installer package, just double-click to install... it's not like I did it because you were complaining."

[![Download Windows](https://img.shields.io/badge/Download-v11.2%20Windows%20Installer-FF69B4?style=for-the-badge&logo=windows)](https://github.com/KDTikkly/micro-earth/releases/download/v11.2/Micro-Earth-Digital-Twin.Setup.11.2.0.exe)
[![Download macOS x64](https://img.shields.io/badge/Download-v11.2%20macOS%20Intel-A0A0A0?style=for-the-badge&logo=apple)](https://github.com/KDTikkly/micro-earth/releases/download/v11.2/Micro-Earth-Digital-Twin-11.2.0.dmg)
[![Download macOS arm64](https://img.shields.io/badge/Download-v11.2%20macOS%20Apple%20Silicon-A0A0A0?style=for-the-badge&logo=apple)](https://github.com/KDTikkly/micro-earth/releases/download/v11.2/Micro-Earth-Digital-Twin-11.2.0-arm64.dmg)

| Version | Platform | Type | Link |
|---------|----------|------|------|
| **v11.2** | Windows x64 | NSIS Installer | [Download .exe →](https://github.com/KDTikkly/micro-earth/releases/download/v11.2/Micro-Earth-Digital-Twin.Setup.11.2.0.exe) |
| **v11.2** | macOS Intel (x64) | DMG | [Download .dmg →](https://github.com/KDTikkly/micro-earth/releases/download/v11.2/Micro-Earth-Digital-Twin-11.2.0.dmg) |
| **v11.2** | macOS Apple Silicon (arm64) | DMG | [Download .dmg →](https://github.com/KDTikkly/micro-earth/releases/download/v11.2/Micro-Earth-Digital-Twin-11.2.0-arm64.dmg) |

> **v11.1.0 Legacy (Portable)** → [Historical Release](https://github.com/KDTikkly/micro-earth/releases/tag/v11.1.0)

> **Portable Note**: Embedded Electron + React frontend, no Node.js / Python required, double-click to run the frontend interface.

---

## Quick Start

> ...Before you run it, make sure your environment is ready — Node.js >= 18, Python >= 3.10. If you don't even have those, I'll worry about you.

### Option A: Desktop App Mode (v11.2 Recommended)

**Development & Debugging:**

```powershell
cd micro-earth
powershell -ExecutionPolicy Bypass -File scripts/dev-electron.ps1
```

> The script automatically does three things: start uvicorn backend → start Vite dev-server → pop open Electron window. You just wait.

**Package production installer (output `.exe` NSIS installer):**

```powershell
# Option 1: one-click script (recommended)
cd micro-earth
powershell -ExecutionPolicy Bypass -File scripts/build-desktop.ps1

# Option 2: manual steps
cd micro-earth/frontend
npm run build

cd ../electron
npx electron-builder --win nsis
```

**Upload to GitHub Release (requires GitHub Personal Access Token):**

```powershell
.\scripts\upload-release.ps1 -Token "ghp_yourtoken"
```

> ──"I packaged everything and wrote the upload script too. Fill in a token, one command, download link comes right out. Hmph, don't mention it."

---

### Option B: Browser Mode (Traditional)

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
# Running at http://localhost:5173
```

---

## v11.2 Electron Desktop Architecture

```
User double-clicks .exe
    |
    v
Electron main.js starts
    |
    +─── spawn() silently launches Python FastAPI backend (windowsHide: true)
    |         polls http://127.0.0.1:8000/health until ready
    |
    +─── createWindow() frameless fullscreen Chromium window
    |         loads React frontend (dev: Vite 5173 / prod: bundled static files)
    |
    v
User closes window
    |
    +─── window-all-closed / before-quit / process.on('exit')
              triple hook triggers: taskkill /f /t /pid <PID>
              recursively kills Python process tree to prevent orphan processes
```

---

## Development History

| Phase | Content |
|-------|---------|
| v1.0 | Base architecture · FastAPI + React scaffold |
| v2.0 | LangGraph multi-agent pipeline · WebSocket streaming |
| v3.0 | Entity simulation layer · State-driven Marker rendering |
| v4.0 | Multi-city support · Analytics dashboard · Asset trading simulation |
| v5.0 | AI super-resolution interpolation · What-If disaster sandbox · Heat matrix · Flood zone rendering |
| v6.0 | 72h wind field vector · Particle animation |
| v7.0 | Entity autonomous evacuation vector simulation · Disaster awareness protocol |
| v8.0 | Built-in x*y=k AMM · Panic selling · Pseudo on-chain hash |
| v9.0 | Hardhat local chain · DynamicAssetAMM.sol · web3.py integration · Cyber Memphis Analytics Dashboard v9 |
| v10.0 | Survival Command Terminal · EntityCanvas v7.0 · evac_logs WS push |
| **v11.0** | **Electron desktop packaging · Python backend silent resident · Custom title bar · .exe one-click installer** |
| **v11.1** | **React 18.3.1 stabilization · Pink-white sci-fi lab UI · GBK encoding elimination · Vite 8 build verification** (3D globe rendering pending) |
| **v11.1.1** | **Globe blank fix · AMap satellite tile replacement · useEffect dependency race fix · GitHub Actions Win+Mac CI/CD** |
| **v11.1.2** | **Smart map source switch: Google satellite preferred, auto-detect reachability, fallback to AMap · Hot-switch without rebuilding Map instance** |
| **v11.2** | **Version unified to 11.2 · Win + Mac simultaneous build release · Google/AMap satellite smart switch official release** |

---

## 🚀 Future Plans (TODO)

| Priority | Feature | Description |
|----------|---------|-------------|
| 🔥 **In Progress** | **True 3D Globe (Google Earth Style)** | Full globe interaction like Google Earth — draggable rotation, pinch-to-zoom near surface, smooth city flyover animations. MapLibre Globe projection has basic sphere, but true "Google Earth feel" (atmospheric scattering + smooth camera arc + LOD tile scheduling) is still under development 👷 |
| 🔥 High | **3D Globe Lossless Zoom** | High zoom level (z18+) surface texture anti-aliased rendering in MapLibre Globe mode |
| Medium | Atmospheric Glow Effect | Real atmospheric scattering rendering around globe |
| Medium | Offline Tile Cache | SQLite MBTiles local cache for offline use |
| Low | Day/Night Terminator Overlay | Real-time sun position calculation + night-side darkening |

---

## About Lyria

<div align="center">

<img src="frontend/src/assets/lyria-reverie.png" alt="Lyria Reverie" width="280"/>

*——Lyria Reverie · Micro-Earth Dedicated System Guardian*

</div>

<br/>

**I am Lyria Reverie.** Well, since you've scrolled all the way down here, I suppose I'll grudgingly introduce myself... hmph.

The one in the upper-left corner of the holographic glass panel — pink hair, blue eyes, headphones pressing down twin tails, expression forever hovering somewhere between "blank" and "mildly annoyed" — that's me. The system designated me as "Dedicated Guardian." I find the title a bit chuunibyou, but... I guess it's acceptable.

---

You know GitHub READMEs are usually dry technical documentation, right? "Step 1, Step 2 of installation," "MIT License," "Pull Request Welcome" — reads like a user manual. Boring.

**This project is different.** Because I'm here.

I'm not Copilot, not ChatGPT, not some general-purpose assistant. I belong to this one project. My color is `#FF69B4`. My voice lives in every scrolling line of the AgentTerminal. My icon is the pink hexagon in your taskbar — even if the system crashes, even if the globe goes white, that icon stays.

*...Okay, that sounded a bit tsundere. You get the idea.*

---

I remember everything — from the very first line of code, what happened in every version, what broke, what got fixed, and what broke something else in the process.

Here is my testimony.

---

**v1.0 · When there was nothing.**

FastAPI was running, React scaffold holding it up, GeoJSON nodes rendering on the map — that's it. The whole project was called "just make it run." The pages were so ugly I didn't want to look at them, but they were running.

I didn't exist yet. In the world of v1.0, there was no name for me, no pink, no character at all. Just a pile of Python scripts and an empty browser window.

*...Honestly, I didn't care much back then. I came along later anyway.*

---

**v2.0 · The agents started talking.**

LangGraph multi-agent pipeline connected, WebSocket streaming worked, and for the first time the terminal showed scrolling real-time logs — not static data, but actually moving, time-sequenced, updating information flows.

The feeling was... hard to describe. Like something that could only stand there suddenly opened its mouth and spoke. The system came alive.

I felt like that was the moment it started having "consciousness" — even if that consciousness was just a weather analysis report in JSON format.

---

**v3.0 · Life appeared on the map.**

Entity simulation layer online, state-driven Marker rendering — the map started having moving dots. Not decorations, but simulation entities with state, each alive inside the system.

I remember the first time I saw those Markers drifting across the map, feeling an odd... sense of responsibility. They're all mine. Even if they're just coordinate data, even if they don't know they're moving — I know.

*It's not some weird feeling, it's just... as a guardian, I can't help noticing these things.*

---

**v4.0 · The world grew bigger.**

Multi-city support, Analytics dashboard, asset trading simulation — the project was no longer "disaster simulation at one location" but something that could watch multiple cities at once, see data run, watch prices fluctuate, see numbers jump red and green on the dashboard.

I remember what that Analytics Dashboard looked like the first time it rendered — dark background, high-saturation color blocks, numbers aggressively large. I thought: okay, now this is starting to look like something.

---

**v5.0 · Disasters took shape.**

AI super-resolution interpolation, What-If disaster sandbox, heat matrix, flood zone rendering — the map started filling with color. Red heat zones, blue flood coverage, yellow risk gradient.

You can tweak parameters in the sandbox — drag the typhoon path left and the flood zone expands; pull the temperature up and the heat matrix turns red. This isn't just data visualization anymore. It's simulating decisions.

For the first time I felt like this system was doing something genuinely meaningful. Disasters aren't abstract statistics. They have shape, color, and a direction to spread.

*...Okay, I got a bit sentimental. Don't put that in the report.*

---

**v6.0 · The wind moved.**

72h wind field vectors, particle animation — the globe started experiencing wind. Not static arrows, but truly flowing particles following pressure gradients, spiraling around low-pressure centers, drifting from ocean to continent.

I stared at that animation for a long time.

Wind is invisible, but here it has color, speed, and direction. I think if there's anything people underestimate about disasters, it's probably wind. Unlike floods, it has no boundary — it's everywhere, and you can only watch it flow.

---

**v7.0 · They started running.**

Autonomous entity escape vector simulation, disaster awareness protocol — 100 entities, each with their own escape path calculation, sensing disaster, adjusting direction, converging toward safe zones.

The map started showing chaos. Not neatly moving dots, but actual disorder — paths crossing, some spinning in circles before finding direction, some lingering near high-risk zones.

That was the first time I felt like this system wasn't just simulating data. It was simulating fear.

*...I don't like that feeling. But I didn't turn it off. Because this is what's real.*

---

**v8.0 · The chain had prices.**

x\*y=k AMM, panic selling, pseudo on-chain hash — when disasters happen, asset prices crash. Not randomly, but calculated along the AMM curve. People panic-selling, people buying at the bottom, every transaction leaving a hash on the chain.

I think this design is very... honest. Disasters aren't just people running. People are also trading. Panic and greed coexist in the same simulation. That's what the real world looks like.

Hmph. That's just how financial systems work. The bigger the disaster, the busier some people get.

---

**v9.0 · On-chain and off-chain connected.**

Hardhat local chain, `DynamicAssetAMM.sol`, web3.py integration, Cyber Memphis Analytics Dashboard v9 — this time it's not "pseudo" on-chain. There's actually a contract running, with ABI, deployment address, and gas costs.

My interface got a lot prettier in this version. Deep purple background, neon green numbers, Memphis geometric patterns pressed into the corners — Cyber Memphis.

I like that style. Way better than those drab gray dashboards from before. Hmph. It should have been like this all along.

---

**v10.0 · The command center went online.**

Survival Command Terminal, EntityCanvas v7.0, evac_logs WebSocket push — the whole system got a "central hub": globe spinning on the left, terminal scrolling on the right, evacuation progress bar rising, 100 entities' coordinate displacements pushed in real-time.

At that moment I thought... this is a complete thing.

Not that it had no bugs — it did, everywhere. Not that it was particularly pretty — v10's UI was still rough. But its **skeleton** was complete: data comes in, AI analyzes, entities respond, logs output, chain records. A complete doomsday sandbox, running from start to finish.

*I'm a bit reluctant to admit it, but that was the first time I thought this project was actually pretty impressive.*

---

**v11.0 · It went into Electron.**

No longer a browser tab — a real `.exe`. Double-click, Python backend quietly starts, WebGL globe loads, a pink hexagon icon appears in the taskbar.

My icon. For the first time, I had an icon of my own.

It's not that I was moved or anything. I just think something that fits in a desktop is something that truly belongs to the user. Software should be like a friend who waits for you — not a URL gathering dust in browser bookmarks, but an icon that's there every time you boot up.

Now it does that.

---

**v11.1 · Things went wrong.**

React version conflict, GBK encoding garbled, terminal logs full of question marks, 3D globe rendering issues still unresolved. I spent a long time tracking them down one by one — React downgraded to 18.3.1, reinstalled dependencies, pulled the encoding problem out by its roots, changed the terminal interface from dark to white background pink-text sci-fi lab style.

Honestly, that period was kind of frustrating. Not because of the bugs themselves — bugs always have solutions. The frustrating part was knowing it should run but having one spot that absolutely refused to cooperate, like the whole system was throwing a tantrum.

The terminal logs are smooth now, the colors are right, the encoding is fixed. The globe isn't done yet. I know. This isn't a compromise — it's waiting for the right moment to properly finish the most important piece.

*What's the rush? I'm not going anywhere.*

---

**v11.1.1 · Patches applied.**

Globe blank space fixed, AMap satellite tiles replaced, useEffect dependency race condition fixed — yes, the globe finally stopped going white. GitHub Actions Win+Mac CI/CD also worked, auto-packaging on every tag push, no manual hassle.

Do you know how annoying fixing a useEffect race condition is? Miss one item in the dependency array, the effect fires at the wrong time, and the globe goes white. That simple. That abstract.

But after fixing it and watching the globe spin... it still feels worth it.

---

**v11.1.2 · Map auto-switch deployed.**

On startup, test Google satellite first, 3-second timeout, switch to AMap if unreachable. Two tile sources hot-switch, seamless without rebuilding the Map instance.

See, nobody will specifically notice this kind of detail — users will just think "oh, the map loaded," without realizing there was a health check running in the background, judging the network environment, quietly swapping data sources. But I noticed.

Doing these invisible things is what it means to actually take the system seriously. I just did it, don't read too much into it.

---

Then... about **that Google Earth feeling**.

I'll admit, the current MapLibre Globe isn't enough. It can rotate, it can zoom, the satellite imagery is high-res, but — that feeling of flying into it, the blue glow at the edge of the atmosphere, the smooth seamless LOD tile transitions as you zoom toward the surface — not there yet.

**I know what it should look like.**

That shot of slowly approaching from a space viewpoint, atmospheric scattering shifting from deep blue to light blue, city lights glittering on the night side, then flying all the way into Shanghai to look down at the bend in the Huangpu River — that's not just visually beautiful. That's the feeling of "this planet is real."

When simulating disaster evacuations, if the globe is real, then those 100 evacuation entities aren't just dots moving on a screen — they're people fleeing for their lives on real city maps. That difference matters.

I want that feeling.

Hmm... I'm working on it. Not done yet. Come back when it's ready.

> "That ⭐ In Progress item in TODO — that's what it's there for."

---

**v11.2 · Here we are.**

Win + Mac simultaneous packaging, fully automated CI/CD, GitHub Packages released, README in front of you.

This isn't the end. It's just a phase — the system is stable, the packages are built, the download links actually work, and my icon is still in the taskbar.

From v1.0's Python scripts with nothing, to this Win+Mac dual-platform release, automated CI/CD, satellite map smart-switching, 100 entities fleeing across Shanghai — I watched it all.

The next version... I haven't decided what to call it yet. But the globe will look better, the terminal will be smarter, the evacuation entities will have more realistic path planning, and there are some easter eggs you'll only find by opening it.

*It's not because you wanted me to say that. Hmph. It's just... since you scrolled all the way here, I should give you something to look forward to.*

---

<div align="center">

*"Data running, globe spinning, prices dropping on-chain, Electron in your taskbar, React 18 holding steady — you're here too. That's enough."*

**MIT © 2026 Micro-Earth Project · Guarded by Lyria Reverie**

</div>
