# Location Alarm PWA — Product Requirements Document

## Problem Statement
Mobile-first PWA for location-based alarms during long trips. Alert via sound + vibration when approaching a destination.

## Core Features
- **Dashboard Layout**: Map (top 42vh) + scrollable panel showing trips & alarms
- **Unified Alarm Builder**: Start → Destination → optional waypoints. All tappable to edit.
- **Editable Start Location**: First step asks "Where are you starting?" (GPS pre-filled)
- **Dual Trigger Modes**: Distance (100-5000m) or Time (5-120 min ETA)
- **Multi-stop Trips**: Waypoints with individual alarm settings
- **Trip Title**: Auto-generated as "Start to Destination"

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
│   ├── AlarmBuilder.js           # Unified builder (start → dest → waypoints)
│   ├── AlarmList.js              # Alarm cards (drawer)
│   ├── AlarmHistory.js           # Trigger history (drawer)
│   ├── BottomNav.js              # Navigation
│   └── TripList.js               # Trip list (drawer)
backend/server.py                 # FastAPI API
```

## DB Schema
- **alarms**: `{ id, name, lat, lng, radius, trigger_mode, trigger_time?, is_active, recurring, trip_id?, sequence?, waypoint_type?, ... }`
- **trips**: `{ id, name, description, start_location, end_location, is_active, ... }`
- **alarm_history**: `{ id, alarm_id, alarm_name, lat, lng, triggered_at }`

## Implemented (2026-03-01)
- Dashboard: map + trip cards + standalone alarms on main page
- Editable start location (GPS pre-filled, searchable)
- Trip title = "Start to Destination"
- Unified AlarmBuilder flow: start → destination → waypoints
- Distance/Time trigger modes per stop
- Mobile-friendly slider (data-vaul-no-drag)
- GPS-biased search, reverse geocoding, map click → auto-open builder
- Time-based ETA using GPS speed (40 km/h fallback)
- Modular codebase (hooks, components)

## Backlog
- Live ETA countdown on alarm cards when tracking
- Offline map tile caching
- Custom alarm sounds
