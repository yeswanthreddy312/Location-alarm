import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Drawer } from 'vaul';
import { storage } from '@/utils/storage';
import { reverseGeocode } from '@/utils/geocode';
import { useAlarms } from '@/hooks/useAlarms';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import AlarmBuilder from '@/components/AlarmBuilder';
import AlarmList from '@/components/AlarmList';
import AlarmHistory from '@/components/AlarmHistory';
import TripList from '@/components/TripList';
import BottomNav from '@/components/BottomNav';
import { Bell, Navigation2, ChevronRight, Trash2, Edit, Plus, Clock, Ruler, Circle as CircleIcon, CheckCircle2 } from 'lucide-react';

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

  // Trips data for preview
  const [trips, setTrips] = useState([]);
  const [tripAlarms, setTripAlarms] = useState({});

  const fetchTrips = useCallback(() => {
    const allTrips = storage.getTrips();
    setTrips(allTrips);
    const aMap = {};
    allTrips.forEach(t => { aMap[t.id] = storage.getAlarmsByTrip(t.id); });
    setTripAlarms(aMap);
  }, []);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  // Standalone alarms (not part of a trip)
  const standaloneAlarms = alarms.filter(a => !a.trip_id);

  // Drawer states
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
    setEditAlarm(null); setEditTrip(null); setEditTripAlarms(null);
    setShowBuilder(true);
    try {
      const data = await reverseGeocode(latlng.lat, latlng.lng);
      if (data.display_name) {
        const addr = data.display_name;
        setTempMarker({ ...latlng, address: addr, name: addr.split(',')[0] });
      }
    } catch {}
  }, []);

  const handleClose = useCallback(() => {
    setShowBuilder(false);
    setEditAlarm(null); setEditTrip(null); setEditTripAlarms(null); setTempMarker(null);
    fetchAlarms();
    fetchTrips();
  }, [fetchAlarms, fetchTrips]);

  const handleEditAlarm = useCallback((alarm) => {
    setEditAlarm(alarm); setEditTrip(null); setEditTripAlarms(null); setTempMarker(null);
    setShowListDrawer(false);
    setShowBuilder(true);
  }, []);

  const handleEditTrip = useCallback((trip, alarms) => {
    setEditTrip(trip); setEditTripAlarms(alarms); setEditAlarm(null); setTempMarker(null);
    setShowTripList(false);
    setShowBuilder(true);
  }, []);

  const handleEditTripFromPreview = useCallback((trip) => {
    const ta = tripAlarms[trip.id] || [];
    setEditTrip(trip); setEditTripAlarms(ta); setEditAlarm(null); setTempMarker(null);
    setShowBuilder(true);
  }, [tripAlarms]);

  const deleteTripFromPreview = useCallback((tripId) => {
    storage.deleteTrip(tripId);
    fetchTrips();
    fetchAlarms();
  }, [fetchTrips, fetchAlarms]);

  const handleAdd = useCallback(() => {
    setEditAlarm(null); setEditTrip(null); setEditTripAlarms(null); setTempMarker(null);
    setShowBuilder(true);
  }, []);

  return (
    <div className="flex flex-col bg-slate-950" style={{ height: '100dvh' }}>
      {/* Map Section */}
      <div className="relative" style={{ height: '42vh', minHeight: '240px' }}>
        <MapContainer center={mapCenter} zoom={13} className="h-full w-full" zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
          <MapController center={mapCenter} />
          <MapClickHandler onMapClick={handleMapClick} />
          {userLocation && <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}><Popup>Your Location</Popup></Marker>}
          {tempMarker && <Marker position={[tempMarker.lat, tempMarker.lng]} icon={tempIcon}><Popup>Selected</Popup></Marker>}
          {alarms.map((a) => (
            <React.Fragment key={a.id}>
              <Marker position={[a.latitude, a.longitude]} icon={alarmIcon} opacity={a.is_active ? 1 : 0.5}>
                <Popup><div className="text-gray-900"><strong>{a.name}</strong><br/>{a.trigger_mode === 'time' ? `${a.trigger_time} min` : `${a.radius}m`}</div></Popup>
              </Marker>
              <Circle center={[a.latitude, a.longitude]} radius={a.radius} pathOptions={{ color: a.is_active ? '#10B981' : '#94A3B8', fillColor: a.is_active ? '#10B981' : '#94A3B8', fillOpacity: 0.08, weight: 1.5 }} />
            </React.Fragment>
          ))}
        </MapContainer>

        {/* Tracking pill overlay on map */}
        <div className="absolute top-3 right-3 z-[500]">
          <div className="backdrop-blur-xl bg-slate-900/70 border border-white/10 rounded-full px-3 py-2 flex items-center gap-2 shadow-lg">
            <Switch checked={isTracking} onCheckedChange={toggleTracking} data-testid="tracking-toggle" />
            <span className={`text-xs font-medium ${isTracking ? 'text-emerald-400' : 'text-slate-400'}`}>{isTracking ? 'Live' : 'Off'}</span>
          </div>
        </div>
      </div>

      {/* Dashboard Panel */}
      <div className="flex-1 overflow-y-auto pb-24 -mt-4 relative z-10">
        <div className="bg-slate-950 rounded-t-[20px] min-h-full">
          {/* Drag handle + header */}
          <div className="pt-3 pb-2 px-5">
            <div className="mx-auto w-10 h-1 rounded-full bg-slate-700 mb-4" />
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Manrope' }}>Location Alarm</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  {alarms.filter(a => a.is_active).length} active &middot; {trips.length} trip{trips.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Button onClick={handleAdd} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full h-9 px-4 text-sm" data-testid="header-add-btn">
                <Plus className="w-4 h-4 mr-1" /> New
              </Button>
            </div>
          </div>

          <div className="px-4 pt-2 space-y-3">
            {/* Trip Cards */}
            {trips.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">Trips</h2>
                {trips.map((trip) => {
                  const ta = tripAlarms[trip.id] || [];
                  const done = ta.filter(a => a.triggered_at).length;
                  return (
                    <div key={trip.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4" data-testid={`preview-trip-${trip.id}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Navigation2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            <h3 className="text-sm font-semibold text-white truncate">{trip.name}</h3>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1 ml-6">
                            <span>{trip.start_location}</span>
                            <ChevronRight className="w-3 h-3" />
                            <span>{trip.end_location}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <button onClick={() => handleEditTripFromPreview(trip)} className="p-1.5 text-slate-500 hover:text-emerald-400 transition-colors" data-testid={`preview-edit-trip-${trip.id}`}>
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteTripFromPreview(trip.id)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors" data-testid={`preview-delete-trip-${trip.id}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Route stops */}
                      {ta.length > 0 && (
                        <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
                          {ta.map((a, i) => (
                            <React.Fragment key={a.id}>
                              {i > 0 && <div className="w-4 h-px bg-slate-700 flex-shrink-0" />}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {a.triggered_at ? (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <CircleIcon className={`w-3 h-3 ${a.waypoint_type === 'destination' ? 'text-emerald-500' : 'text-amber-500'}`} />
                                )}
                                <span className="text-[11px] text-slate-400">{a.name}</span>
                                <span className={`text-[10px] px-1 py-0.5 rounded ${a.trigger_mode === 'time' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                  {a.trigger_mode === 'time' ? `${a.trigger_time}m` : `${a.radius}m`}
                                </span>
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                      )}

                      {/* Progress bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                          <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${ta.length > 0 ? (done / ta.length) * 100 : 0}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-500">{done}/{ta.length}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Standalone Alarms */}
            {standaloneAlarms.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">Alarms</h2>
                {standaloneAlarms.map((a) => (
                  <div key={a.id} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3" data-testid={`preview-alarm-${a.id}`}>
                    <Bell className={`w-4 h-4 flex-shrink-0 ${a.is_active ? 'text-emerald-400' : 'text-slate-600'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{a.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {a.trigger_mode === 'time' ? (
                          <><Clock className="w-3 h-3 inline mr-0.5" />{a.trigger_time} min</>
                        ) : (
                          <><Ruler className="w-3 h-3 inline mr-0.5" />{a.radius}m</>
                        )}
                      </p>
                    </div>
                    <Switch checked={a.is_active} onCheckedChange={(v) => toggleAlarm(a.id, v)} data-testid={`preview-toggle-${a.id}`} />
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {trips.length === 0 && standaloneAlarms.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Navigation2 className="w-12 h-12 text-slate-700 mb-3" />
                <p className="text-sm text-slate-400">No alarms yet</p>
                <p className="text-xs text-slate-600 mt-1">Tap + or click the map to get started</p>
              </div>
            )}
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
          <Drawer.Content className="bg-slate-900 flex flex-col rounded-t-[24px] fixed bottom-0 left-0 right-0 z-50 border-t border-white/10" style={{ height: '85dvh', maxHeight: '85dvh' }} aria-describedby="builder-desc">
            <Drawer.Title className="sr-only">Alarm Builder</Drawer.Title>
            <p id="builder-desc" className="sr-only">Create or edit</p>
            <div className="p-4 bg-slate-900 rounded-t-[24px] flex-1 overflow-y-auto">
              <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-slate-700 mb-4" />
              <AlarmBuilder onClose={handleClose} userLocation={userLocation} tempMarker={tempMarker} editAlarm={editAlarm} editTrip={editTrip} editTripAlarms={editTripAlarms} />
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
