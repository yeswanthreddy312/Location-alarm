import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Bell, Plus, List as ListIcon, Navigation, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Drawer } from 'vaul';
import { toast } from 'sonner';
import axios from 'axios';
import AlarmForm from '@/components/AlarmForm';
import AlarmList from '@/components/AlarmList';

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

// Component to handle map centering
function MapController({ center }) {
  const map = useMap();
  
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
  const [selectedAlarm, setSelectedAlarm] = useState(null);
  const [mapCenter, setMapCenter] = useState([28.6139, 77.2090]); // Default: New Delhi
  const [isTracking, setIsTracking] = useState(false);
  const [mapReady, setMapReady] = useState(true); // Always show map
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

  // Get user's current location
  useEffect(() => {
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
          // Don't show error toast - just use default location
          // toast.error('Unable to get your location');
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
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

      // If within radius and not already triggered
      if (distance <= alarm.radius && !triggeredAlarmsRef.current.has(alarm.id)) {
        triggerAlarm(alarm);
        triggeredAlarmsRef.current.add(alarm.id);

        // If not recurring, mark as triggered
        if (!alarm.recurring) {
          updateAlarmStatus(alarm.id, false);
        }
      }

      // Reset trigger if user moves out of radius (for recurring alarms)
      if (distance > alarm.radius && triggeredAlarmsRef.current.has(alarm.id)) {
        triggeredAlarmsRef.current.delete(alarm.id);
      }
    });
  };

  // Trigger alarm (sound + vibration + notification)
  const triggerAlarm = (alarm) => {
    // Play sound
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.error('Audio play error:', e));
    }

    // Vibrate
    if ('vibrate' in navigator) {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }

    // Show notification
    toast.success(`🔔 ${alarm.name}`, {
      description: 'You have reached your destination!',
      duration: 10000,
      action: {
        label: 'Stop',
        onClick: () => stopAlarm(),
      },
    });

    // Request notification permission and show browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`🔔 ${alarm.name}`, {
        body: 'You have reached your destination!',
        icon: '/logo192.png',
        vibrate: [500, 200, 500],
      });
    }
  };

  // Stop alarm sound
  const stopAlarm = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // Update alarm status
  const updateAlarmStatus = async (alarmId, isActive) => {
    try {
      await axios.put(`${API}/alarms/${alarmId}`, { is_active: isActive });
      await fetchAlarms();
    } catch (error) {
      console.error('Error updating alarm:', error);
    }
  };

  // Start location tracking
  const startTracking = () => {
    if ('geolocation' in navigator) {
      // Request notification permission
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

  // Stop location tracking
  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsTracking(false);
      stopAlarm();
      toast.info('Location tracking stopped');
    }
  };

  // Toggle tracking
  const toggleTracking = () => {
    if (isTracking) {
      stopTracking();
    } else {
      startTracking();
    }
  };

  // Center map on user location
  const centerOnUser = () => {
    if (userLocation) {
      setMapCenter([userLocation.lat, userLocation.lng]);
    }
  };

  const handleAddAlarm = () => {
    setSelectedAlarm(null);
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
    fetchAlarms();
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
          
          {/* Current Location Marker */}
          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]} icon={currentLocationIcon}>
              <Popup>Your Current Location</Popup>
            </Marker>
          )}

          {/* Alarm Markers */}
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

      {/* FAB Buttons - Fixed Position */}
      <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-3 items-end pointer-events-auto">
        {/* Center on User Button */}
        <Button
          onClick={centerOnUser}
          className="w-14 h-14 rounded-full bg-slate-800/90 hover:bg-slate-700 border border-white/10 shadow-lg"
          data-testid="center-location-btn"
        >
          <Navigation className="w-5 h-5" />
        </Button>

        {/* Alarm List Button */}
        <Button
          onClick={() => setShowListDrawer(true)}
          className="w-14 h-14 rounded-full bg-slate-800/90 hover:bg-slate-700 border border-white/10 shadow-lg"
          data-testid="show-alarm-list-btn"
        >
          <ListIcon className="w-5 h-5" />
        </Button>

        {/* Add Alarm Button (FAB) */}
        <Button
          onClick={handleAddAlarm}
          className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)] transition-transform hover:scale-105 active:scale-95"
          data-testid="add-alarm-btn"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Add/Edit Alarm Drawer */}
      <Drawer.Root open={showAddDrawer} onOpenChange={setShowAddDrawer}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Drawer.Content 
            className="bg-slate-900 flex flex-col rounded-t-[24px] h-[85vh] mt-24 fixed bottom-0 left-0 right-0 z-50 border-t border-white/10"
            aria-describedby="add-alarm-desc"
          >
            <Drawer.Title className="sr-only">
              {selectedAlarm ? 'Edit Alarm' : 'New Alarm'}
            </Drawer.Title>
            <p id="add-alarm-desc" className="sr-only">
              Set a location-based alarm for your trip
            </p>
            <div className="p-4 bg-slate-900 rounded-t-[24px] flex-1 overflow-y-auto">
              <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-slate-700 mb-6" />
              <AlarmForm
                alarm={selectedAlarm}
                userLocation={userLocation}
                onClose={handleFormClose}
              />
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
            <div className="p-4 bg-slate-900 rounded-t-[24px] flex-1 overflow-y-auto">
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
    </div>
  );
};

export default MapView;