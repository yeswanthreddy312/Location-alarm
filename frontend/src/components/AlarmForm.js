import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import axios from 'axios';
import { MapPin, Save, Search, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AlarmForm = ({ alarm, userLocation, tempMarker, onClose }) => {
  const [name, setName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
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
    } else if (tempMarker) {
      setLatitude(tempMarker.lat.toString());
      setLongitude(tempMarker.lng.toString());
      setSearchQuery('Location from map');
    } else if (userLocation) {
      setLatitude(userLocation.lat.toString());
      setLongitude(userLocation.lng.toString());
    }
  }, [alarm, userLocation, tempMarker]);

  const searchPlace = async (query) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        {
          headers: {
            'User-Agent': 'LocationAlarmApp/1.0'
          }
        }
      );
      setSearchResults(response.data);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search location');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      searchPlace(query);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const selectPlace = (place) => {
    setLatitude(place.lat);
    setLongitude(place.lon);
    setSearchQuery(place.display_name);
    setShowResults(false);
    if (!name) {
      // Auto-fill name with first part of address
      const placeName = place.display_name.split(',')[0];
      setName(placeName);
    }
    toast.success('Location selected');
  };

  const handleUseCurrentLocation = () => {
    if (userLocation) {
      setLatitude(userLocation.lat.toString());
      setLongitude(userLocation.lng.toString());
      setSearchQuery('Current Location');
      toast.success('Using current location');
    } else {
      toast.error('Current location not available');
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
        await axios.put(`${API}/alarms/${alarm.id}`, alarmData);
        toast.success('Alarm updated successfully');
      } else {
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

        {/* Place Search */}
        <div className="space-y-3">
          <Label className="text-slate-200">Search Location</Label>
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search for a place..."
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 pl-10"
                data-testid="place-search-input"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 animate-spin" />
              )}
            </div>
            
            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 max-h-60 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => selectPlace(result)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-700 border-b border-slate-700 last:border-b-0 transition-colors"
                    data-testid={`search-result-${index}`}
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-white">{result.display_name}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {parseFloat(result.lat).toFixed(4)}, {parseFloat(result.lon).toFixed(4)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
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

          {/* Show selected coordinates */}
          {latitude && longitude && (
            <div className="text-xs text-slate-400 mt-2">
              Selected: {parseFloat(latitude).toFixed(4)}, {parseFloat(longitude).toFixed(4)}
            </div>
          )}
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
            disabled={isSubmitting || !latitude || !longitude}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50"
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