# Location Alarm PWA — Product Requirements Document

## Problem Statement
Mobile-first PWA for location-based alarms during long trips. Alert via sound + vibration when approaching a destination.

## Core Features
- **Dashboard Layout**: Map (top 42vh) + scrollable panel showing trips & alarms directly
- **Unified Alarm Builder**: Single flow — destination → trip visual → add waypoints → tap to edit
- **Dual Trigger Modes**: Distance (100-5000m) or Time (5-120 min ETA)
- **Multi-stop Trips**: Waypoints with individual alarm settings
- **Live Tracking**: GPS-based with Haversine distance + ETA calculation

## Tech Stack
- Frontend: React, TailwindCSS, Shadcn/UI, Leaflet, vaul
- Backend: FastAPI, MongoDB
- Geocoding: Nominatim (proxied)

## Architecture
```
frontend/src/
├── pages/MapView.js              # Split layout: map + dashboard panel
├── hooks/
│   ├── useAlarms.js              # Alarm CRUD
│   └── useLocationTracking.js    # GPS + alarm triggering
├── components/
│   ├── AlarmBuilder.js           # Unified builder (editor + trip visual)
│   ├── AlarmList.js              # Alarm cards (drawer)
│   ├── AlarmHistory.js           # Trigger history (drawer)
│   ├── BottomNav.js              # Navigation
│   └── TripList.js               # Trip list (drawer)
backend/server.py                 # FastAPI API
```

## Implemented (2026-03-01)
- Dashboard layout: map + scrollable content panel with trip cards & standalone alarms
- Trip cards show inline route stops with alarm badges, progress bar, edit/delete
- Standalone alarms show with toggle switch
- Unified AlarmBuilder (no tabs)
- Distance/Time trigger modes
- Mobile-friendly slider (data-vaul-no-drag)
- GPS-biased search, reverse geocoding, map click → auto-open builder
- Time-based ETA using GPS speed (40 km/h fallback)
- Modular codebase

## Backlog
- No pending tasks
