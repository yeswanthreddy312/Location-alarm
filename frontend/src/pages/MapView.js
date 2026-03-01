import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Switch } from '@/components/ui/switch';
import { Drawer } from 'vaul';
import axios from 'axios';
import { useAlarms } from '@/hooks/useAlarms';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import AlarmBuilder from '@/components/AlarmBuilder';
import AlarmList from '@/components/AlarmList';
import AlarmHistory from '@/components/AlarmHistory';
import TripList from '@/components/TripList';
import BottomNav from '@/components/BottomNav';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const createIcon = (color) =>
  L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:32px;height:32px;background:${color};border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 0 20px rgba(16,185,129,0.5)"></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

const userIcon = createIcon('#10B981');
const alarmIcon = createIcon('#F97316');
const tempIcon = createIcon('#6366F1');

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) });
  return null;
}

function MapController({ center }) {
  const map = useMapEvents({});
  useEffect(() => { if (center) map.setView(center, map.getZoom()); }, [center, map]);
  return null;
}

const MapView = () => {
  const { alarms, fetchAlarms, deleteAlarm, toggleAlarm } = useAlarms();
  const { userLocation, isTracking, toggleTracking, mapCenter, centerOnUser } = useLocationTracking(alarms, fetchAlarms);

  const [showBuilder, setShowBuilder] = useState(false);
  const [showListDrawer, setShowListDrawer] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [showTripList, setShowTripList] = useState(false);

  const [editAlarm, setEditAlarm] = useState(null);
  const [editTrip, setEditTrip] = useState(null);
  const [editTripAlarms, setEditTripAlarms] = useState(null);
  const [tempMarker, setTempMarker] = useState(null);

  const handleMapClick = useCallback(async (latlng) => {
    setTempMarker(latlng);
    setEditAlarm(null);
    setEditTrip(null);
    setEditTripAlarms(null);
    setShowBuilder(true);
    try {
      const res = await axios.get(`${API}/reverse-geocode`, { params: { lat: latlng.lat, lon: latlng.lng } });
      if (res.data.success) {
        const addr = res.data.display_name;
        setTempMarker({ ...latlng, address: addr, name: addr.split(',')[0] });
      }
    } catch {}
  }, []);

  const handleClose = useCallback(() => {
    setShowBuilder(false);
    setEditAlarm(null);
    setEditTrip(null);
    setEditTripAlarms(null);
    setTempMarker(null);
    fetchAlarms();
  }, [fetchAlarms]);

  const handleEditAlarm = useCallback((alarm) => {
    setEditAlarm(alarm);
    setEditTrip(null);
    setEditTripAlarms(null);
    setTempMarker(null);
    setShowListDrawer(false);
    setShowBuilder(true);
  }, []);

  const handleEditTrip = useCallback((trip, tripAlarms) => {
    setEditTrip(trip);
    setEditTripAlarms(tripAlarms);
    setEditAlarm(null);
    setTempMarker(null);
    setShowTripList(false);
    setShowBuilder(true);
  }, []);

  const handleAdd = useCallback(() => {
    setEditAlarm(null);
    setEditTrip(null);
    setEditTripAlarms(null);
    setTempMarker(null);
    setShowBuilder(true);
  }, []);

  return (
    <div className="relative h-full w-full">
      {/* Map */}
      <div className="absolute inset-0 z-0">
        <MapContainer center={mapCenter} zoom={13} className="h-full w-full" zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
          <MapController center={mapCenter} />
          <MapClickHandler onMapClick={handleMapClick} />
          {userLocation && <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}><Popup>Your Location</Popup></Marker>}
          {tempMarker && <Marker position={[tempMarker.lat, tempMarker.lng]} icon={tempIcon}><Popup>Selected Location</Popup></Marker>}
          {alarms.map((a) => (
            <React.Fragment key={a.id}>
              <Marker position={[a.latitude, a.longitude]} icon={alarmIcon} opacity={a.is_active ? 1 : 0.5}>
                <Popup><div className="text-gray-900"><strong>{a.name}</strong><br/>{a.trigger_mode === 'time' ? `${a.trigger_time} min` : `${a.radius}m`}<br/>{a.is_active ? 'Active' : 'Off'}</div></Popup>
              </Marker>
              <Circle center={[a.latitude, a.longitude]} radius={a.radius} pathOptions={{ color: a.is_active ? '#10B981' : '#94A3B8', fillColor: a.is_active ? '#10B981' : '#94A3B8', fillOpacity: 0.1, weight: 2 }} />
            </React.Fragment>
          ))}
        </MapContainer>
      </div>

      {/* Top Bar */}
      <div className="relative z-10 pointer-events-none">
        <div className="p-4 pointer-events-auto">
          <div className="backdrop-blur-xl bg-slate-900/60 border border-white/10 rounded-xl p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Manrope' }}>Location Alarm</h1>
                <p className="text-sm text-slate-300 mt-1">{alarms.filter(a => a.is_active).length} active</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isTracking} onCheckedChange={toggleTracking} data-testid="tracking-toggle" />
                <span className="text-sm text-slate-300">{isTracking ? 'Tracking' : 'Off'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomNav
        onTrips={() => setShowTripList(true)}
        onAlarms={() => setShowListDrawer(true)}
        onAdd={handleAdd}
        onHistory={() => setShowHistoryDrawer(true)}
        onCenter={centerOnUser}
      />

      {/* Builder Drawer */}
      <Drawer.Root open={showBuilder} onOpenChange={setShowBuilder}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Drawer.Content className="bg-slate-900 flex flex-col rounded-t-[24px] h-[85vh] mt-16 fixed bottom-0 left-0 right-0 z-50 border-t border-white/10" aria-describedby="builder-desc">
            <Drawer.Title className="sr-only">Alarm Builder</Drawer.Title>
            <p id="builder-desc" className="sr-only">Create or edit alarms</p>
            <div className="p-4 bg-slate-900 rounded-t-[24px] flex-1 overflow-y-auto">
              <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-slate-700 mb-4" />
              <AlarmBuilder
                onClose={handleClose}
                userLocation={userLocation}
                tempMarker={tempMarker}
                editAlarm={editAlarm}
                editTrip={editTrip}
                editTripAlarms={editTripAlarms}
              />
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Alarm List Drawer */}
      <Drawer.Root open={showListDrawer} onOpenChange={setShowListDrawer}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Drawer.Content className="bg-slate-900 flex flex-col rounded-t-[24px] h-[70vh] mt-24 fixed bottom-0 left-0 right-0 z-50 border-t border-white/10" aria-describedby="list-desc">
            <Drawer.Title className="sr-only">Alarms</Drawer.Title>
            <p id="list-desc" className="sr-only">Manage alarms</p>
            <div className="p-4 bg-slate-900 rounded-t-[24px] flex-1 overflow-y-auto pb-20">
              <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-slate-700 mb-6" />
              <AlarmList alarms={alarms} onEdit={handleEditAlarm} onDelete={deleteAlarm} onToggle={toggleAlarm} />
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* History Drawer */}
      <Drawer.Root open={showHistoryDrawer} onOpenChange={setShowHistoryDrawer}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Drawer.Content className="bg-slate-900 flex flex-col rounded-t-[24px] h-[70vh] mt-24 fixed bottom-0 left-0 right-0 z-50 border-t border-white/10" aria-describedby="hist-desc">
            <Drawer.Title className="sr-only">History</Drawer.Title>
            <p id="hist-desc" className="sr-only">Triggered alarms</p>
            <div className="p-4 bg-slate-900 rounded-t-[24px] flex-1 overflow-y-auto pb-20">
              <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-slate-700 mb-6" />
              <AlarmHistory />
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Trip List Drawer */}
      <Drawer.Root open={showTripList} onOpenChange={setShowTripList}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Drawer.Content className="bg-slate-900 flex flex-col rounded-t-[24px] h-[70vh] mt-24 fixed bottom-0 left-0 right-0 z-50 border-t border-white/10" aria-describedby="trip-desc">
            <Drawer.Title className="sr-only">Trips</Drawer.Title>
            <p id="trip-desc" className="sr-only">Manage trips</p>
            <div className="p-4 bg-slate-900 rounded-t-[24px] flex-1 overflow-y-auto pb-20">
              <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-slate-700 mb-6" />
              <TripList onEditTrip={handleEditTrip} />
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
};

export default MapView;
