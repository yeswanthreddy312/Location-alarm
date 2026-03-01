# Location Alarm PWA — Product Requirements Document

## Problem Statement
Mobile-first PWA for location-based alarms during long trips. Alert via sound + vibration when approaching a destination.

## Core Features
- **Unified Alarm Builder**: Single flow — set destination → see trip visual → optionally add waypoints → tap any row to edit
- **Dual Trigger Modes**: Distance-based (100-5000m radius) or Time-based (5-120 min ETA)
- **Multi-stop Trips**: Waypoints with individual alarm settings
- **Live Tracking**: GPS-based with Haversine distance + ETA calculation
- **Map Integration**: OpenStreetMap with click-to-create, GPS-biased search

## Tech Stack
- Frontend: React, TailwindCSS, Shadcn/UI, Leaflet, vaul
- Backend: FastAPI, MongoDB
- Geocoding: Nominatim (proxied)

## Architecture
```
frontend/src/
├── pages/MapView.js                # Orchestrator (~180 lines)
├── hooks/
│   ├── useAlarms.js                # Alarm CRUD
│   └── useLocationTracking.js      # GPS + alarm triggering
├── components/
│   ├── AlarmBuilder.js             # Unified builder (editor + trip visual)
│   ├── AlarmList.js                # Alarm cards with badges
│   ├── AlarmHistory.js             # Trigger history
│   ├── BottomNav.js                # Navigation
│   └── TripList.js                 # Trip cards with edit
backend/server.py                   # FastAPI API
```

## DB Schema
- **alarms**: `{ id, name, lat, lng, radius, trigger_mode, trigger_time?, is_active, recurring, trip_id?, sequence?, waypoint_type?, ... }`
- **trips**: `{ id, name, description, start_location, end_location, is_active, ... }`
- **alarm_history**: `{ id, alarm_id, alarm_name, lat, lng, triggered_at }`

## API Endpoints
- `GET/POST /api/alarms`, `PUT/DELETE /api/alarms/{id}`
- `GET/POST /api/trips`, `PUT/DELETE /api/trips/{id}`, `GET /api/trips/{id}/alarms`
- `GET/POST /api/alarm-history`
- `GET /api/geocode?q=&lat=&lon=&limit=`
- `GET /api/reverse-geocode?lat=&lon=`

## Implemented (2026-03-01)
- Unified AlarmBuilder (replaced separate AlarmForm + TripForm tabs)
- Distance/Time trigger modes per alarm and per trip waypoint
- Trip visual with tappable rows for inline editing
- Mobile-friendly slider (data-vaul-no-drag, h-6 w-6 thumb)
- GPS-biased search, reverse geocoding
- Map click → auto-open builder with address
- Time-based ETA using GPS speed (40 km/h fallback)
- Modular codebase (hooks, extracted components)

## Removed (non-core)
- Android notification sharing, smart trip detection, hardcoded routes, Web Share Target

## Backlog
- No pending tasks
