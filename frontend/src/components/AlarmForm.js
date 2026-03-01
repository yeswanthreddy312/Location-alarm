import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import axios from 'axios';
import { MapPin, Save } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AlarmForm = ({ alarm, userLocation, onClose }) => {
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState([500]);
  const [isActive, setIsActive] = useState(true);
  const [recurring, setRecurring] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (alarm) {
      setName(alarm.name);
      setLatitude(alarm.latitude.toString());
      setLongitude(alarm.longitude.toString());
      setRadius([alarm.radius]);
      setIsActive(alarm.is_active);
      setRecurring(alarm.recurring);
    } else if (userLocation) {
      setLatitude(userLocation.lat.toString());
      setLongitude(userLocation.lng.toString());
    }
  }, [alarm, userLocation]);

  const handleUseCurrentLocation = () => {
    if (userLocation) {
      setLatitude(userLocation.lat.toString());
      setLongitude(userLocation.lng.toString());
      toast.success('Using current location');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name || !latitude || !longitude) {
      toast.error('Please fill all required fields');
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error('Invalid coordinates');
      return;
    }

    setIsSubmitting(true);

    try {
      const alarmData = {
        name,
        latitude: lat,
        longitude: lng,
        radius: radius[0],
        sound: 'default',
        is_active: isActive,
        recurring,
      };

      if (alarm) {
        // Update existing alarm
        await axios.put(`${API}/alarms/${alarm.id}`, alarmData);
        toast.success('Alarm updated successfully');
      } else {
        // Create new alarm
        await axios.post(`${API}/alarms`, alarmData);
        toast.success('Alarm created successfully');
      }

      onClose();
    } catch (error) {
      console.error('Error saving alarm:', error);
      toast.error('Failed to save alarm');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Manrope' }}>
          {alarm ? 'Edit Alarm' : 'New Alarm'}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Set a location-based alarm for your trip
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Alarm Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-slate-200">Alarm Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Home, Office, Airport"
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            data-testid="alarm-name-input"
            required
          />
        </div>

        {/* Location */}
        <div className="space-y-3">
          <Label className="text-slate-200">Location</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="Latitude"
                type="number"
                step="any"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                data-testid="latitude-input"
                required
              />
            </div>
            <div>
              <Input
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="Longitude"
                type="number"
                step="any"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                data-testid="longitude-input"
                required
              />
            </div>
          </div>
          <Button
            type="button"
            onClick={handleUseCurrentLocation}
            variant="outline"
            className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            data-testid="use-current-location-btn"
          >
            <MapPin className="w-4 h-4 mr-2" />
            Use Current Location
          </Button>
        </div>

        {/* Radius */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-slate-200">Alert Radius</Label>
            <span className="text-sm text-emerald-400 font-medium">{radius[0]}m</span>
          </div>
          <Slider
            value={radius}
            onValueChange={setRadius}
            min={100}
            max={5000}
            step={100}
            className="w-full"
            data-testid="radius-slider"
          />
          <p className="text-xs text-slate-500">
            You'll be alerted when within {radius[0]} meters of this location
          </p>
        </div>

        {/* Recurring */}
        <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <div>
            <Label htmlFor="recurring" className="text-slate-200 cursor-pointer">Recurring Alarm</Label>
            <p className="text-xs text-slate-500 mt-1">
              Alarm will trigger every time you enter the area
            </p>
          </div>
          <Switch
            id="recurring"
            checked={recurring}
            onCheckedChange={setRecurring}
            data-testid="recurring-switch"
          />
        </div>

        {/* Active Status */}
        <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <div>
            <Label htmlFor="active" className="text-slate-200 cursor-pointer">Active</Label>
            <p className="text-xs text-slate-500 mt-1">
              Enable or disable this alarm
            </p>
          </div>
          <Switch
            id="active"
            checked={isActive}
            onCheckedChange={setIsActive}
            data-testid="active-switch"
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            className="flex-1 bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            data-testid="cancel-btn"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
            data-testid="save-alarm-btn"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Saving...' : alarm ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AlarmForm;