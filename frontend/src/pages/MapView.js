import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Bell, Plus, List as ListIcon, Navigation, History, X, Navigation2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Drawer } from 'vaul';
import { toast } from 'sonner';
import axios from 'axios';
import AlarmForm from '@/components/AlarmForm';
import AlarmList from '@/components/AlarmList';
import AlarmHistory from '@/components/AlarmHistory';
import TripForm from '@/components/TripForm';
import TripList from '@/components/TripList';
import QuickAlarmFromNotification from '@/components/QuickAlarmFromNotification';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icons
const createCustomIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 0 20px rgba(16, 185, 129, 0.5);
      ">
        <div style="
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(45deg);
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

const currentLocationIcon = createCustomIcon('#10B981');
const alarmIcon = createCustomIcon('#F97316');
const tempMarkerIcon = createCustomIcon('#6366F1');

// Component to handle map clicks
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
}

// Component to handle map centering
function MapController({ center }) {
  const map = useMapEvents({});
  
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  
  return null;
}

const MapView = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [alarms, setAlarms] = useState([]);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [showListDrawer, setShowListDrawer] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [showTripList, setShowTripList] = useState(false);
  const [addMode, setAddMode] = useState('alarm'); // 'alarm' or 'trip'
  const [editingTrip, setEditingTrip] = useState(null);
  const [editingTripAlarms, setEditingTripAlarms] = useState(null);
  const [notificationData, setNotificationData] = useState(null);
  const [selectedAlarm, setSelectedAlarm] = useState(null);
  const [tempMarker, setTempMarker] = useState(null);
  const [mapCenter, setMapCenter] = useState([28.6139, 77.2090]);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef(null);
  const audioRef = useRef(null);
  const triggeredAlarmsRef = useRef(new Set());

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.loop = true;
  }, []);

  // Fetch alarms from backend
  const fetchAlarms = async () => {
    try {
      const response = await axios.get(`${API}/alarms`);
      setAlarms(response.data);
    } catch (error) {
      console.error('Error fetching alarms:', error);
      toast.error('Failed to load alarms');
    }
  };

  useEffect(() => {
    fetchAlarms();
  }, []);

  // Check for shared notification data
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedText = urlParams.get('text') || urlParams.get('title');
    
    if (sharedText && sharedText.match(/trip to|travel to|going to/i)) {
      setNotificationData(sharedText);
      setAddMode('notification');
      setShowAddDrawer(true);
      
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
          setMapCenter([location.lat, location.lng]);
          toast.success('Location access granted');
        },
        (error) => {
          console.error('Error getting location:', error);
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Log alarm trigger to history
  const logAlarmTrigger = async (alarm) => {
    try {
      await axios.post(`${API}/alarm-history`, {
        alarm_id: alarm.id,
        alarm_name: alarm.name,
        latitude: alarm.latitude,
        longitude: alarm.longitude,
      });
    } catch (error) {
      console.error('Error logging alarm trigger:', error);
    }
  };

  // Check alarms based on current location
  const checkAlarms = (currentLat, currentLng) => {
    alarms.forEach((alarm) => {
      if (!alarm.is_active) return;

      const distance = calculateDistance(
        currentLat,
        currentLng,
        alarm.latitude,
        alarm.longitude
      );

      if (distance <= alarm.radius && !triggeredAlarmsRef.current.has(alarm.id)) {
        triggerAlarm(alarm);
        triggeredAlarmsRef.current.add(alarm.id);
        logAlarmTrigger(alarm);

        if (!alarm.recurring) {
          updateAlarmStatus(alarm.id, false);
        }
      }

      if (distance > alarm.radius && triggeredAlarmsRef.current.has(alarm.id)) {
        triggeredAlarmsRef.current.delete(alarm.id);
      }
    });
  };

  // Trigger alarm
  const triggerAlarm = (alarm) => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.error('Audio play error:', e));
    }

    if ('vibrate' in navigator) {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }

    toast.success(`🔔 ${alarm.name}`, {
      description: 'You have reached your destination!',
      duration: 10000,
      action: {
        label: 'Stop',
        onClick: () => stopAlarm(),
      },
    });

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`🔔 ${alarm.name}`, {
        body: 'You have reached your destination!',
        icon: '/logo192.png',
        vibrate: [500, 200, 500],
      });
    }
  };

  const stopAlarm = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const updateAlarmStatus = async (alarmId, isActive) => {
    try {
      await axios.put(`${API}/alarms/${alarmId}`, { is_active: isActive });
      await fetchAlarms();
    } catch (error) {
      console.error('Error updating alarm:', error);
    }
  };

  const startTracking = () => {
    if ('geolocation' in navigator) {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
          checkAlarms(location.lat, location.lng);
        },
        (error) => {
          console.error('Tracking error:', error);
          toast.error('Error tracking location');
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 5000,
        }
      );
      setIsTracking(true);
      toast.success('Location tracking started');
    }
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsTracking(false);
      stopAlarm();
      toast.info('Location tracking stopped');
    }
  };

  const toggleTracking = () => {
    if (isTracking) {
      stopTracking();
    } else {
      startTracking();
    }
  };

  const centerOnUser = () => {
    if (userLocation) {
      setMapCenter([userLocation.lat, userLocation.lng]);
    }
  };

  const handleMapClick = (latlng) => {
    setTempMarker(latlng);
    toast.info('Location selected from map', {
      description: 'Click + to create alarm here',
      duration: 3000,
    });
  };

  const handleAddAlarm = () => {
    setSelectedAlarm(null);
    setAddMode('alarm');
    setShowAddDrawer(true);
  };

  const handleEditAlarm = (alarm) => {
    setSelectedAlarm(alarm);
    setShowAddDrawer(true);
    setShowListDrawer(false);
  };

  const handleDeleteAlarm = async (alarmId) => {
    try {
      await axios.delete(`${API}/alarms/${alarmId}`);
      toast.success('Alarm deleted');
      await fetchAlarms();
    } catch (error) {
      console.error('Error deleting alarm:', error);
      toast.error('Failed to delete alarm');
    }
  };

  const handleToggleAlarm = async (alarmId, isActive) => {
    await updateAlarmStatus(alarmId, isActive);
    toast.success(isActive ? 'Alarm enabled' : 'Alarm disabled');
  };

  const handleFormClose = () => {
    setShowAddDrawer(false);
    setSelectedAlarm(null);
    setTempMarker(null);
    setAddMode('alarm');
    setEditingTrip(null);
    setEditingTripAlarms(null);
    setNotificationData(null);
    fetchAlarms();
  };

  const handleAddWaypointsFromNotification = () => {
    setAddMode('trip');
    // TripForm will pick up the notification data
  };

  const handleEditTrip = (trip, alarms) => {
    setEditingTrip(trip);
    setEditingTripAlarms(alarms);
    setAddMode('trip');
    setShowTripList(false);
    setShowAddDrawer(true);
  };

  return (
    <div className="relative h-full w-full">
      {/* Map */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={mapCenter}
          zoom={13}
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <MapController center={mapCenter} />
          <MapClickHandler onMapClick={handleMapClick} />
          
          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]} icon={currentLocationIcon}>
              <Popup>Your Current Location</Popup>
            </Marker>
          )}

          {tempMarker && (
            <Marker position={[tempMarker.lat, tempMarker.lng]} icon={tempMarkerIcon}>
              <Popup>
                <div className="text-gray-900">
                  <strong>Selected Location</strong>
                  <br />
                  Click + to create alarm
                </div>
              </Popup>
            </Marker>
          )}

          {alarms.map((alarm) => (
            <React.Fragment key={alarm.id}>
              <Marker
                position={[alarm.latitude, alarm.longitude]}
                icon={alarmIcon}
                opacity={alarm.is_active ? 1 : 0.5}
              >
                <Popup>
                  <div className="text-gray-900">
                    <strong>{alarm.name}</strong>
                    <br />
                    Radius: {alarm.radius}m
                    <br />
                    {alarm.is_active ? '🔔 Active' : '🔕 Inactive'}
                  </div>
                </Popup>
              </Marker>
              <Circle
                center={[alarm.latitude, alarm.longitude]}
                radius={alarm.radius}
                pathOptions={{
                  color: alarm.is_active ? '#10B981' : '#94A3B8',
                  fillColor: alarm.is_active ? '#10B981' : '#94A3B8',
                  fillOpacity: 0.1,
                  weight: 2,
                }}
              />
            </React.Fragment>
          ))}
        </MapContainer>
      </div>

      {/* UI Layer */}
      <div className="relative z-10 pointer-events-none h-full flex flex-col">
        {/* Top Bar */}
        <div className="p-4 pointer-events-auto">
          <div className="backdrop-blur-xl bg-slate-900/60 border border-white/10 rounded-xl p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Manrope' }}>
                  Location Alarm
                </h1>
                <p className="text-sm text-slate-300 mt-1">
                  {alarms.filter(a => a.is_active).length} active alarm{alarms.filter(a => a.is_active).length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={isTracking}
                    onCheckedChange={toggleTracking}
                    data-testid="tracking-toggle"
                  />
                  <span className="text-sm text-slate-300">
                    {isTracking ? 'Tracking' : 'Off'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Android-style Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-auto">
        <div className="bg-slate-900/95 backdrop-blur-xl border-t border-white/10 px-4 py-3 flex items-center justify-around">
          <Button
            onClick={() => setShowTripList(true)}
            variant="ghost"
            className="flex flex-col items-center gap-1 h-auto py-2 px-4 text-slate-300 hover:text-emerald-400 hover:bg-transparent transition-colors"
            data-testid="nav-trips-btn"
          >
            <Navigation2 className="w-6 h-6" />
            <span className="text-xs">Trips</span>
          </Button>

          <Button
            onClick={() => setShowListDrawer(true)}
            variant="ghost"
            className="flex flex-col items-center gap-1 h-auto py-2 px-4 text-slate-300 hover:text-emerald-400 hover:bg-transparent transition-colors"
            data-testid="nav-alarms-btn"
          >
            <Bell className="w-6 h-6" />
            <span className="text-xs">Alarms</span>
          </Button>

          <Button
            onClick={handleAddAlarm}
            className="w-14 h-14 -mt-8 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-transform active:scale-95"
            data-testid="nav-add-btn"
          >
            <Plus className="w-7 h-7" />
          </Button>

          <Button
            onClick={() => setShowHistoryDrawer(true)}
            variant="ghost"
            className="flex flex-col items-center gap-1 h-auto py-2 px-4 text-slate-300 hover:text-emerald-400 hover:bg-transparent transition-colors"
            data-testid="nav-history-btn"
          >
            <History className="w-6 h-6" />
            <span className="text-xs">History</span>
          </Button>

          <Button
            onClick={centerOnUser}
            variant="ghost"
            className="flex flex-col items-center gap-1 h-auto py-2 px-4 text-slate-300 hover:text-emerald-400 hover:bg-transparent transition-colors"
            data-testid="nav-location-btn"
          >
            <MapPin className="w-6 h-6" />
            <span className="text-xs">Location</span>
          </Button>
        </div>
      </div>

      {/* Add/Edit Alarm/Trip Drawer with Tabs */}
      <Drawer.Root open={showAddDrawer} onOpenChange={setShowAddDrawer}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Drawer.Content 
            className="bg-slate-900 flex flex-col rounded-t-[24px] h-[90vh] mt-12 fixed bottom-0 left-0 right-0 z-50 border-t border-white/10"
            aria-describedby="add-desc"
          >
            <Drawer.Title className="sr-only">
              {addMode === 'alarm' ? 'Add Alarm' : 'Plan Trip'}
            </Drawer.Title>
            <p id="add-desc" className="sr-only">
              {addMode === 'alarm' ? 'Create a single location alarm' : 'Plan a trip with multiple stops'}
            </p>
            <div className="p-4 bg-slate-900 rounded-t-[24px] flex-1 overflow-y-auto flex flex-col">
              <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-slate-700 mb-4" />
              
              {/* Mode Tabs */}
              <div className="flex gap-2 mb-6">
                <Button
                  type="button"
                  onClick={() => setAddMode('alarm')}
                  className={`flex-1 py-3 rounded-lg transition-all ${
                    addMode === 'alarm'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                  data-testid="tab-single-alarm"
                >
                  <Bell className="w-4 h-4 mr-2 inline" />
                  Single Alarm
                </Button>
                <Button
                  type="button"
                  onClick={() => setAddMode('trip')}
                  className={`flex-1 py-3 rounded-lg transition-all ${
                    addMode === 'trip'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                  data-testid="tab-plan-trip"
                >
                  <Navigation2 className="w-4 h-4 mr-2 inline" />
                  Plan Trip
                </Button>
              </div>

              {/* Content based on mode */}
              <div className="flex-1 overflow-y-auto">
                {addMode === 'alarm' ? (
                  <AlarmForm
                    alarm={selectedAlarm}
                    userLocation={userLocation}
                    tempMarker={tempMarker}
                    onClose={handleFormClose}
                  />
                ) : (
                  <TripForm 
                    onClose={handleFormClose}
                    editTrip={editingTrip}
                    editAlarms={editingTripAlarms}
                  />
                )}
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Alarm List Drawer */}
      <Drawer.Root open={showListDrawer} onOpenChange={setShowListDrawer}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Drawer.Content 
            className="bg-slate-900 flex flex-col rounded-t-[24px] h-[70vh] mt-24 fixed bottom-0 left-0 right-0 z-50 border-t border-white/10"
            aria-describedby="alarm-list-desc"
          >
            <Drawer.Title className="sr-only">Alarm List</Drawer.Title>
            <p id="alarm-list-desc" className="sr-only">
              View and manage all your location alarms
            </p>
            <div className="p-4 bg-slate-900 rounded-t-[24px] flex-1 overflow-y-auto pb-20">
              <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-slate-700 mb-6" />
              <AlarmList
                alarms={alarms}
                onEdit={handleEditAlarm}
                onDelete={handleDeleteAlarm}
                onToggle={handleToggleAlarm}
              />
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* History Drawer */}
      <Drawer.Root open={showHistoryDrawer} onOpenChange={setShowHistoryDrawer}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Drawer.Content 
            className="bg-slate-900 flex flex-col rounded-t-[24px] h-[70vh] mt-24 fixed bottom-0 left-0 right-0 z-50 border-t border-white/10"
            aria-describedby="history-desc"
          >
            <Drawer.Title className="sr-only">Alarm History</Drawer.Title>
            <p id="history-desc" className="sr-only">
              View when your alarms were triggered
            </p>
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
          <Drawer.Content 
            className="bg-slate-900 flex flex-col rounded-t-[24px] h-[70vh] mt-24 fixed bottom-0 left-0 right-0 z-50 border-t border-white/10"
            aria-describedby="trip-list-desc"
          >
            <Drawer.Title className="sr-only">My Trips</Drawer.Title>
            <p id="trip-list-desc" className="sr-only">
              View and manage all your planned trips
            </p>
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