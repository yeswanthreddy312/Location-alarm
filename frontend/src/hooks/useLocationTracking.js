import { useState, useEffect, useCallback, useRef } from 'react';
import { storage } from '@/utils/storage';
import { toast } from 'sonner';

export function useLocationTracking(alarms, onAlarmUpdate) {
  const [userLocation, setUserLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]);

  const watchIdRef = useRef(null);
  const audioRef = useRef(null);
  const triggeredRef = useRef(new Set());
  const alarmsRef = useRef(alarms);
  const speedRef = useRef(null);

  useEffect(() => { alarmsRef.current = alarms; }, [alarms]);

  useEffect(() => {
    audioRef.current = new Audio('/sounds/alarm.mp3');
    audioRef.current.loop = true;
    return () => { audioRef.current?.pause(); };
  }, []);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setMapCenter([loc.lat, loc.lng]);
      },
      () => {},
      { enableHighAccuracy: true }
    );
  }, []);

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const p1 = (lat1 * Math.PI) / 180;
    const p2 = (lat2 * Math.PI) / 180;
    const dp = ((lat2 - lat1) * Math.PI) / 180;
    const dl = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const stopSound = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
  }, []);

  const triggerAlarm = useCallback((alarm) => {
    audioRef.current?.play().catch(() => {});
    navigator.vibrate?.([500, 200, 500, 200, 500]);
    toast.success(alarm.name, {
      description: 'You have reached your destination!',
      duration: 10000,
      action: { label: 'Stop', onClick: stopSound },
    });
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(alarm.name, { body: 'You have reached your destination!', icon: '/logo192.png', vibrate: [500, 200, 500] });
    }
    storage.addHistory({ alarm_id: alarm.id, alarm_name: alarm.name, latitude: alarm.latitude, longitude: alarm.longitude });
  }, [stopSound]);

  const checkAlarms = useCallback((lat, lng) => {
    const currentAlarms = alarmsRef.current;
    for (const alarm of currentAlarms) {
      if (!alarm.is_active) continue;
      const d = getDistance(lat, lng, alarm.latitude, alarm.longitude);
      let shouldTrigger = false;

      if (alarm.trigger_mode === 'time' && alarm.trigger_time) {
        const speed = (speedRef.current && speedRef.current > 1) ? speedRef.current : 11;
        const etaMinutes = (d / speed) / 60;
        shouldTrigger = etaMinutes <= alarm.trigger_time;
      } else {
        shouldTrigger = d <= alarm.radius;
      }

      if (shouldTrigger && !triggeredRef.current.has(alarm.id)) {
        triggerAlarm(alarm);
        triggeredRef.current.add(alarm.id);
        if (!alarm.recurring) {
          storage.updateAlarm(alarm.id, { is_active: false });
          onAlarmUpdate?.();
        }
      }
      if (!shouldTrigger) triggeredRef.current.delete(alarm.id);
    }
  }, [triggerAlarm, onAlarmUpdate]);

  const toggleTracking = useCallback(() => {
    if (isTracking) {
      if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
      stopSound();
      setIsTracking(false);
      toast.info('Tracking stopped');
    } else {
      if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          speedRef.current = pos.coords.speed;
          setUserLocation(loc);
          checkAlarms(loc.lat, loc.lng);
        },
        () => toast.error('Location tracking error'),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
      setIsTracking(true);
      toast.success('Tracking started');
    }
  }, [isTracking, checkAlarms, stopSound]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      audioRef.current?.pause();
    };
  }, []);

  const centerOnUser = useCallback(() => {
    if (userLocation) setMapCenter([userLocation.lat, userLocation.lng]);
  }, [userLocation]);

  return { userLocation, isTracking, toggleTracking, mapCenter, setMapCenter, centerOnUser };
}
