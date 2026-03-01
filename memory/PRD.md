# Location Alarm PWA — Product Requirements Document

## Problem Statement
Mobile-first Progressive Web App (PWA) that functions as a location-based alarm. Primary use case: long trips where the user might fall asleep and needs an alert upon reaching a specific location.

## Core Requirements
- **Platform**: Mobile-first PWA, installable, offline capability
- **Alerts**: Sound + vibration when entering alarm radius
- **Core Features**: Single alarms, multi-stop Trips with waypoint types, alarm history
- **Design**: Clean, minimal, dark theme, native alarm-app feel
- **Map**: OpenStreetMap + Leaflet
- **Performance**: Low compute, low battery, fast loading

## Tech Stack
- Frontend: React, TailwindCSS, Shadcn/UI, Leaflet, vaul (drawers)
- Backend: FastAPI, MongoDB (motor)
- Geocoding: Nominatim (proxied via backend with GPS-biased viewbox)
- PWA: Service worker, web app manifest

## Architecture (Refactored 2026-03-01)
```
frontend/src/
├── App.js                          # Router + Toaster
├── pages/
│   └── MapView.js                  # Thin orchestrator (315 lines)
├── hooks/
│   ├── useAlarms.js                # Alarm CRUD + state (44 lines)
│   └── useLocationTracking.js      # GPS tracking + alarm triggering (146 lines)
├── components/
│   ├── AlarmForm.js                # Single alarm form with search
│   ├── AlarmList.js                # Alarm list with toggle/edit/delete
│   ├── AlarmHistory.js             # Triggered alarm history
│   ├── BottomNav.js                # 5-button bottom navigation (59 lines)
│   ├── TripForm.js                 # Multi-stop trip form (294 lines)
│   └── TripList.js                 # Trip list with progress
backend/
└── server.py                       # FastAPI: alarms, trips, geocode, reverse-geocode
```

## DB Schema
- **alarms**: `{ id, name, latitude, longitude, radius, sound, is_active, recurring, trip_id?, sequence?, waypoint_type?, created_at, triggered_at }`
- **trips**: `{ id, name, description, start_location, end_location, is_active, created_at }`
- **alarm_history**: `{ id, alarm_id, alarm_name, latitude, longitude, triggered_at }`

## API Endpoints
- `GET/POST /api/alarms`, `PUT/DELETE /api/alarms/{id}`
- `GET/POST /api/trips`, `PUT/DELETE /api/trips/{id}`
- `GET /api/trips/{id}/alarms`
- `GET/POST /api/alarm-history`
- `GET /api/geocode?q=&lat=&lon=&limit=` — GPS-biased forward geocode
- `GET /api/reverse-geocode?lat=&lon=` — Reverse geocode

## Implemented Features
- Full CRUD for alarms and trips
- PWA installable with service worker
- Dark-themed mobile-first UI with extracted BottomNav
- Location search via Nominatim with GPS-biased results
- Map click → auto-open alarm form with reverse-geocoded address
- Auto-fill alarm/trip names from location data
- Multi-stop trip planning with waypoint types (start/stop/meal/rest/fuel/destination)
- Location tracking with Haversine distance checking (battery-optimized: maximumAge=5000ms)
- Sound + vibration alarm triggers with notification support
- Alarm history logging
- Proper debounce on all search inputs (useRef-based)

## Removed (non-core, for performance)
- Android notification sharing (QuickAlarmFromNotification)
- Smart trip detection from notifications (SmartTripDetection)
- Hardcoded route suggestions
- Web Share Target API config in manifest

## Backlog
- No pending tasks
