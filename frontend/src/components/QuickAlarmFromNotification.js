import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, MapPin, Bell, Plus } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const QuickAlarmFromNotification = ({ sharedText, onClose, onAddWaypoints }) => {
  const [destination, setDestination] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [alarmCreated, setAlarmCreated] = useState(false);

  useEffect(() => {
    if (sharedText) {
      parseAndCreateAlarm(sharedText);
    }
  }, [sharedText]);

  const parseAndCreateAlarm = async (text) => {
    // Parse destination from notification text
    const match = text.match(/(?:trip to|travel to|going to|visiting)\s+([A-Za-z\s]+)/i);
    const dest = match ? match[1].trim() : null;

    if (!dest) {
      toast.error('Could not detect destination from notification');
      return;
    }

    setDestination(dest);
    setIsCreating(true);

    try {
      // Search for destination coordinates
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(dest)}&limit=1`,
        { headers: { 'User-Agent': 'LocationAlarmApp/1.0' } }
      );

      if (response.data && response.data.length > 0) {
        const place = response.data[0];
        
        // Create alarm immediately
        const alarmData = {
          name: dest,
          latitude: parseFloat(place.lat),
          longitude: parseFloat(place.lon),
          radius: 1000, // 1km default for destination
          sound: 'default',
          is_active: true,
          recurring: false,
        };

        await axios.post(`${API}/alarms`, alarmData);
        
        setAlarmCreated(true);
        
        toast.success(`🔔 Alarm set for ${dest}!`, {
          description: 'You\'ll be notified when you arrive',
          duration: 5000,
        });
      } else {
        toast.error('Could not find location');
      }
    } catch (error) {
      console.error('Error creating alarm:', error);
      toast.error('Failed to create alarm');
    } finally {
      setIsCreating(false);
    }
  };

  if (isCreating) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
        <p className="text-white text-lg font-medium">Creating alarm for {destination}...</p>
        <p className="text-slate-400 text-sm mt-2">Setting up location tracking</p>
      </div>
    );
  }

  if (alarmCreated) {
    return (
      <div className="space-y-6 py-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
            <Bell className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Manrope' }}>
            Alarm Set Successfully!
          </h2>
          <p className="text-slate-300 mb-1">
            You'll be notified when you reach
          </p>
          <p className="text-xl font-semibold text-emerald-400" style={{ fontFamily: 'Manrope' }}>
            {destination}
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-white font-medium mb-1">
                What happens next?
              </p>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• Enable tracking from the top toggle</li>
                <li>• Alarm will trigger when you're within 1km</li>
                <li>• You'll get sound + vibration + notification</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-blue-300 font-medium mb-1">
                Want to add stops along the way?
              </p>
              <p className="text-xs text-blue-200/80 mb-3">
                Add waypoints like dinner stops, rest areas, or fuel stations
              </p>
              <Button
                onClick={onAddWaypoints}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Waypoints
              </Button>
            </div>
          </div>
        </div>

        <Button
          onClick={onClose}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          Done
        </Button>
      </div>
    );
  }

  return null;
};

export default QuickAlarmFromNotification;
