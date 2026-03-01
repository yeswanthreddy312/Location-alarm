# Location Alarm PWA — Product Requirements Document

## Problem Statement
Mobile-first Progressive Web App (PWA) that functions as a location-based alarm. Primary use case: long trips where the user might fall asleep and needs an alert upon reaching a specific location.

## Core Requirements
- **Platform**: Mobile-first PWA, installable, offline map caching
- **Alerts**: Sound + vibration
- **Features**: Single alarms, multi-stop Trips, alarm history, set location via search or map click
- **Design**: Clean, minimal, dark theme, native alarm-app feel
- **Map**: OpenStreetMap + Leaflet
- **Smart Features**: Android notification sharing to auto-create alarms/trips, auto-fill names from location data

## Tech Stack
- Frontend: React, TailwindCSS, Shadcn/UI, Leaflet, vaul (drawers)
- Backend: FastAPI, MongoDB (motor)
- Geocoding: Nominatim (proxied via backend)
- PWA: Service worker, web app manifest

## DB Schema
- **alarms**: `{ id, name, latitude, longitude, radius, sound, is_active, recurring, trip_id?, sequence?, waypoint_type?, created_at, triggered_at }`
- **trips**: `{ id, name, description, start_location, end_location, is_active, created_at }`
- **alarm_history**: `{ id, alarm_id, alarm_name, latitude, longitude, triggered_at }`

## API Endpoints
- `GET/POST /api/alarms` — List/Create alarms
- `PUT/DELETE /api/alarms/{id}` — Update/Delete alarm
- `GET/POST /api/trips` — List/Create trips
- `PUT/DELETE /api/trips/{id}` — Update/Delete trip
- `GET /api/alarm-history` — Alarm trigger history
- `POST /api/alarm-history` — Log alarm trigger
- `GET /api/geocode?q=&lat=&lon=&limit=` — Forward geocode (GPS-biased)
- `GET /api/reverse-geocode?lat=&lon=` — Reverse geocode

## What's Implemented (as of 2026-03-01)
- Full CRUD for alarms and trips
- PWA installable with service worker
- Dark-themed mobile-first UI with bottom navigation
- Location search via Nominatim with GPS-biased results
- Map click → auto-open alarm form with reverse-geocoded address
- Auto-fill alarm/trip names from location data
- Multi-stop trip planning with waypoint types
- Android notification sharing → auto-create alarm/trip
- Location tracking with Haversine distance checking
- Sound + vibration alarm triggers
- Alarm history logging

## UX Issues Fixed (2026-03-01)
1. **Keyboard covers search input**: Added `onFocus` scroll-into-view on all search inputs
2. **Poor local search results**: Replaced hardcoded "Bangalore" bias with dynamic GPS viewbox. Fixed TripForm to use `data.results` array (was broken using `data.place`)
3. **Map-click integration**: Clicking map now auto-opens alarm drawer with reverse-geocoded address and auto-filled name

## Backlog
- No pending tasks or features requested
