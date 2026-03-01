# Location Alarm PWA — Product Requirements Document

## Problem Statement
Mobile-first Progressive Web App (PWA) that functions as a location-based alarm. Primary use case: long trips where the user might fall asleep and needs an alert upon reaching a specific location.

## Core Requirements
- **Platform**: Mobile-first PWA, installable, offline capability
- **Alerts**: Sound + vibration when entering alarm radius OR estimated time threshold
- **Trigger Modes**: Distance-based (radius in meters) or Time-based (estimated minutes to arrival)
- **Core Features**: Single alarms, multi-stop Trips with waypoint types, alarm history
- **Design**: Clean, minimal, dark theme, native alarm-app feel
- **Map**: OpenStreetMap + Leaflet
- **Performance**: Low compute, low battery, fast loading

## Tech Stack
- Frontend: React, TailwindCSS, Shadcn/UI, Leaflet, vaul (drawers)
- Backend: FastAPI, MongoDB (motor)
- Geocoding: Nominatim (proxied via backend with GPS-biased viewbox)
- PWA: Service worker, web app manifest

## Architecture
```
frontend/src/
├── App.js
├── pages/MapView.js              # Thin orchestrator (315 lines)
├── hooks/
│   ├── useAlarms.js              # Alarm CRUD + state
│   └── useLocationTracking.js    # GPS tracking + distance/time alarm triggering
├── components/
│   ├── AlarmForm.js              # Distance/Time mode toggle + sliders
│   ├── AlarmList.js              # Shows distance or time badges
│   ├── AlarmHistory.js           # Triggered alarm history
│   ├── BottomNav.js              # 5-button navigation
│   ├── TripForm.js               # Multi-stop with per-waypoint trigger mode
│   └── TripList.js               # Trip list with progress
backend/
└── server.py                     # FastAPI: alarms, trips, geocode, reverse-geocode
```

## DB Schema
- **alarms**: `{ id, name, latitude, longitude, radius, sound, is_active, recurring, trip_id?, sequence?, waypoint_type?, trigger_mode, trigger_time?, created_at, triggered_at }`
- **trips**: `{ id, name, description, start_location, end_location, is_active, created_at }`
- **alarm_history**: `{ id, alarm_id, alarm_name, latitude, longitude, triggered_at }`

## API Endpoints
- `GET/POST /api/alarms`, `PUT/DELETE /api/alarms/{id}`
- `GET/POST /api/trips`, `PUT/DELETE /api/trips/{id}`, `GET /api/trips/{id}/alarms`
- `GET/POST /api/alarm-history`
- `GET /api/geocode?q=&lat=&lon=&limit=`
- `GET /api/reverse-geocode?lat=&lon=`

## Implemented Features
- Full CRUD for alarms and trips
- **Distance/Time trigger modes** — user chooses per alarm or per trip waypoint
- **Time-based ETA**: Uses GPS speed (fallback 40 km/h) to estimate arrival time
- PWA installable with service worker
- Dark-themed mobile-first UI with extracted BottomNav
- Location search with GPS-biased results
- Map click → auto-open alarm form with reverse-geocoded address
- Auto-fill names from location data
- Multi-stop trip planning with waypoint types
- Location tracking with Haversine distance checking
- Sound + vibration alarm triggers
- Proper debounce (useRef-based) on all search inputs
- Mobile-friendly slider (data-vaul-no-drag, bigger touch targets)

## Backlog
- No pending tasks
