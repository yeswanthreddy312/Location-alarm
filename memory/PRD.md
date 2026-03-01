# Location Alarm PWA — Product Requirements Document

## Original Problem Statement
Build a mobile-first Progressive Web App (PWA) that functions as a location-based alarm for long trips, alerting the user upon reaching a specific location.

## Architecture
- **100% Client-Side PWA** — No backend, no database
- **Storage**: Browser localStorage
- **Map**: OpenStreetMap + Leaflet.js
- **Geocoding**: Nominatim API (direct client calls)
- **Deployment**: Static hosting (Vercel)

## Core Features (Implemented)
- Dashboard with map + active trips/alarms list
- Unified AlarmBuilder for single alarms and multi-stop trips
- Location search via Nominatim API
- Map click to set location
- Distance-based and time-to-reach alarm triggers
- Alarm history/logs
- GPS tracking with live toggle
- PWA installable with service worker

## Key Files
- `/app/frontend/src/pages/MapView.js` — Main dashboard
- `/app/frontend/src/components/AlarmBuilder.js` — Alarm/trip creation
- `/app/frontend/src/utils/storage.js` — localStorage CRUD
- `/app/frontend/src/utils/geocode.js` — Nominatim API calls
- `/app/frontend/src/hooks/useAlarms.js` — Alarm state management
- `/app/frontend/src/hooks/useLocationTracking.js` — GPS tracking logic

## Completed Work
- Full client-side architecture (removed backend/MongoDB)
- Dashboard layout with map + trip/alarm cards
- Unified AlarmBuilder with step-by-step flow
- Distance and time-to-reach trigger modes
- Trip start/destination/waypoint management
- Mobile keyboard bug fix (viewport meta + dvh units + scrollIntoView)
- PWA app icon (map pin + bell, emerald/dark theme) in all required sizes
- Full-screen standalone mode with Apple iOS meta tags
- Proper favicon, apple-touch-icon, and maskable icons

## Bug Fixes Applied
- Mobile keyboard hiding search input: Fixed with `interactive-widget=resizes-content` viewport meta, `dvh` CSS units, improved scrollIntoView logic
- Vercel deployment crash (`e.filter is not a function`)
- Alarm radius slider not working

## Backlog
- P2: Upgrade localStorage to IndexedDB for larger datasets
- P3: Offline caching improvements for map tiles
