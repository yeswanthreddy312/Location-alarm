import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import axios from 'axios';
import { MapPin, Save, Plus, X, Search, Loader2, Navigation2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TripForm = ({ onClose }) => {
  const [tripName, setTripName] = useState('');
  const [description, setDescription] = useState('');
  const [waypoints, setWaypoints] = useState([
    { name: '', type: 'start', latitude: '', longitude: '', radius: 500, searchQuery: '', searchResults: [], isSearching: false, showResults: false },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const waypointTypes = [
    { value: 'start', label: '🏁 Start', color: 'text-blue-400' },
    { value: 'stop', label: '⏸️ Stop', color: 'text-yellow-400' },
    { value: 'meal', label: '🍽️ Meal', color: 'text-orange-400' },
    { value: 'rest', label: '🛏️ Rest', color: 'text-purple-400' },
    { value: 'fuel', label: '⛽ Fuel', color: 'text-green-400' },
    { value: 'destination', label: '🎯 Destination', color: 'text-red-400' },
  ];

  const searchPlace = async (query, index) => {
    if (!query || query.length < 3) {
      updateWaypoint(index, { searchResults: [] });
      return;
    }

    updateWaypoint(index, { isSearching: true });
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        { headers: { 'User-Agent': 'LocationAlarmApp/1.0' } }
      );
      updateWaypoint(index, { searchResults: response.data, showResults: true });
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search location');
    } finally {
      updateWaypoint(index, { isSearching: false });
    }
  };

  const updateWaypoint = (index, updates) => {
    setWaypoints(prev => {
      const newWaypoints = [...prev];
      newWaypoints[index] = { ...newWaypoints[index], ...updates };
      return newWaypoints;
    });
  };

  const selectPlace = (place, index) => {
    updateWaypoint(index, {
      latitude: place.lat,
      longitude: place.lon,
      searchQuery: place.display_name,
      showResults: false,
      name: waypoints[index].name || place.display_name.split(',')[0]
    });
    toast.success('Location selected');
  };

  const addWaypoint = () => {
    setWaypoints([...waypoints, {
      name: '',
      type: 'stop',
      latitude: '',
      longitude: '',
      radius: 500,
      searchQuery: '',
      searchResults: [],
      isSearching: false,
      showResults: false
    }]);
  };

  const removeWaypoint = (index) => {
    if (waypoints.length > 1) {
      setWaypoints(waypoints.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!tripName) {
      toast.error('Please enter trip name');
      return;
    }

    const invalidWaypoints = waypoints.filter(w => !w.latitude || !w.longitude);
    if (invalidWaypoints.length > 0) {
      toast.error('Please set location for all waypoints');
      return;
    }

    setIsSubmitting(true);

    try {
      const tripData = {
        name: tripName,
        description: description || null,
        start_location: waypoints[0].name || waypoints[0].searchQuery,
        end_location: waypoints[waypoints.length - 1].name || waypoints[waypoints.length - 1].searchQuery,
      };

      const tripResponse = await axios.post(`${API}/trips`, tripData);
      const tripId = tripResponse.data.id;

      for (let i = 0; i < waypoints.length; i++) {
        const waypoint = waypoints[i];
        const alarmData = {
          name: waypoint.name || waypoint.searchQuery.split(',')[0],
          latitude: parseFloat(waypoint.latitude),
          longitude: parseFloat(waypoint.longitude),
          radius: waypoint.radius,
          sound: 'default',
          is_active: true,
          recurring: false,
          trip_id: tripId,
          sequence: i + 1,
          waypoint_type: waypoint.type,
        };
        await axios.post(`${API}/alarms`, alarmData);
      }

      toast.success(`Trip "${tripName}" created with ${waypoints.length} waypoints!`);
      onClose();
    } catch (error) {
      console.error('Error creating trip:', error);
      toast.error('Failed to create trip');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Manrope' }}>
          Plan Your Trip
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Create a journey with multiple stops
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Trip Name */}
        <div className="space-y-2">
          <Label htmlFor="tripName" className="text-slate-200">Trip Name</Label>
          <Input
            id="tripName"
            value={tripName}
            onChange={(e) => setTripName(e.target.value)}
            placeholder="e.g., Bangalore to Hyderabad"
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            data-testid="trip-name-input"
            required
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-slate-200">Description (Optional)</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Bus journey with meal stops"
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>

        {/* Waypoints */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-slate-200">Trip Waypoints</Label>
            <span className="text-xs text-slate-400">{waypoints.length} stop{waypoints.length !== 1 ? 's' : ''}</span>
          </div>

          {waypoints.map((waypoint, index) => (
            <div key={index} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-white">Stop {index + 1}</span>
                </div>
                {waypoints.length > 1 && (
                  <Button
                    type="button"
                    onClick={() => removeWaypoint(index)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Waypoint Type */}
              <div className="space-y-2">
                <Label className="text-slate-300 text-xs">Type</Label>
                <select
                  value={waypoint.type}
                  onChange={(e) => updateWaypoint(index, { type: e.target.value })}
                  className="w-full bg-slate-700 border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                >
                  {waypointTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* Waypoint Name */}
              <div className="space-y-2">
                <Label className="text-slate-300 text-xs">Name</Label>
                <Input
                  value={waypoint.name}
                  onChange={(e) => updateWaypoint(index, { name: e.target.value })}
                  placeholder="e.g., Devanahalli, Kurnool"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 text-sm"
                />
              </div>

              {/* Search Location */}
              <div className="space-y-2">
                <Label className="text-slate-300 text-xs">Search Location</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    value={waypoint.searchQuery}
                    onChange={(e) => {
                      updateWaypoint(index, { searchQuery: e.target.value });
                      const timeoutId = setTimeout(() => searchPlace(e.target.value, index), 500);
                      return () => clearTimeout(timeoutId);
                    }}
                    placeholder="Search for a place..."
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 pl-10 text-sm"
                  />
                  {waypoint.isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 animate-spin" />
                  )}
                </div>

                {/* Search Results */}
                {waypoint.showResults && waypoint.searchResults.length > 0 && (
                  <div className="absolute mt-2 w-full bg-slate-700 border border-slate-600 rounded-lg shadow-2xl z-50 max-h-48 overflow-y-auto">
                    {waypoint.searchResults.map((result, resIndex) => (
                      <button
                        key={resIndex}
                        type="button"
                        onClick={() => selectPlace(result, index)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-600 border-b border-slate-600 last:border-b-0 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3 h-3 text-emerald-400 mt-1 flex-shrink-0" />
                          <p className="text-xs text-white">{result.display_name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Coordinates */}
              {waypoint.latitude && waypoint.longitude && (
                <div className="text-xs text-slate-400">
                  📍 {parseFloat(waypoint.latitude).toFixed(4)}, {parseFloat(waypoint.longitude).toFixed(4)}
                </div>
              )}
            </div>
          ))}

          {/* Add Waypoint Button */}
          <Button
            type="button"
            onClick={addWaypoint}
            variant="outline"
            className="w-full bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700 hover:text-emerald-300"
            data-testid="add-waypoint-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Another Stop
          </Button>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            className="flex-1 bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50"
            data-testid="create-trip-btn"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Creating...' : 'Create Trip'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TripForm;