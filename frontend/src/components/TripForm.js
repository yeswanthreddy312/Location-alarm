import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import axios from 'axios';
import { MapPin, Save, Plus, X, Search, Loader2, Navigation2, Sparkles, Copy } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TripForm = ({ onClose, prefillData = null, editTrip = null, editAlarms = null, userLocation = null }) => {
  const [tripName, setTripName] = useState('');
  const [description, setDescription] = useState('');
  const [waypoints, setWaypoints] = useState([
    { name: '', type: 'start', latitude: '', longitude: '', radius: 500, searchQuery: '', searchResults: [], isSearching: false, showResults: false },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showIntegrationTip, setShowIntegrationTip] = useState(false);

  const waypointTypes = [
    { value: 'start', label: '🏁 Start', color: 'text-blue-400' },
    { value: 'stop', label: '⏸️ Stop', color: 'text-yellow-400' },
    { value: 'meal', label: '🍽️ Meal', color: 'text-orange-400' },
    { value: 'rest', label: '🛏️ Rest', color: 'text-purple-400' },
    { value: 'fuel', label: '⛽ Fuel', color: 'text-green-400' },
    { value: 'destination', label: '🎯 Destination', color: 'text-red-400' },
  ];

  useEffect(() => {
    // Load existing trip for editing
    if (editTrip && editAlarms) {
      setTripName(editTrip.name);
      setDescription(editTrip.description || '');
      
      // Convert alarms to waypoints format
      const waypointsFromAlarms = editAlarms.map(alarm => ({
        id: alarm.id,
        name: alarm.name,
        type: alarm.waypoint_type || 'stop',
        latitude: alarm.latitude.toString(),
        longitude: alarm.longitude.toString(),
        radius: alarm.radius,
        searchQuery: alarm.name,
        searchResults: [],
        isSearching: false,
        showResults: false
      }));
      
      setWaypoints(waypointsFromAlarms);
      toast.info('Editing trip - Add or remove waypoints as needed');
      return;
    }
    
    // Check URL parameters for shared trip data
    const urlParams = new URLSearchParams(window.location.search);
    const sharedText = urlParams.get('text') || urlParams.get('title');
    
    if (sharedText || prefillData) {
      parseSharedTripData(sharedText || prefillData);
    }
  }, [prefillData, editTrip, editAlarms]);

  // Auto-generate trip name from waypoints
  useEffect(() => {
    if (waypoints.length >= 2 && !editTrip) {
      const firstStop = waypoints[0].name || waypoints[0].searchQuery.split(',')[0];
      const lastStop = waypoints[waypoints.length - 1].name || waypoints[waypoints.length - 1].searchQuery.split(',')[0];
      
      if (firstStop && lastStop && firstStop !== lastStop) {
        const autoName = `${firstStop} to ${lastStop}`;
        if (tripName !== autoName) {
          setTripName(autoName);
        }
      }
    }
  }, [waypoints, editTrip, tripName]);

  const parseSharedTripData = async (text) => {
    if (!text) return;

    // Parse trip details
    const match = text.match(/to ([A-Za-z\s]+)/i);
    if (match) {
      const destination = match[1].trim();
      setTripName(`Trip to ${destination}`);
      
      // Auto-suggest route waypoints based on destination
      const suggested = suggestRouteWaypoints(destination);
      
      if (suggested && suggested.length > 0) {
        setWaypoints(suggested);
        
        // Auto-search for each waypoint
        suggested.forEach((wp, index) => {
          setTimeout(() => searchPlace(wp.searchQuery, index), index * 1000);
        });
        
        toast.success('Trip auto-configured from notification!', {
          description: `${suggested.length} stops suggested along the route`,
          icon: <Sparkles className="w-4 h-4" />
        });
      } else {
        toast.success('Trip details detected from Android!', {
          description: `Destination: ${destination}`,
          icon: <Sparkles className="w-4 h-4" />
        });
      }
    }
  };

  const suggestRouteWaypoints = (destination) => {
    // Common routes with pre-configured waypoints
    const routes = {
      'hyderabad': [
        { name: 'Bangalore Start', type: 'start', searchQuery: 'Bangalore, Karnataka, India' },
        { name: 'Devanahalli (Dinner)', type: 'meal', searchQuery: 'Devanahalli, Bangalore, Karnataka' },
        { name: 'Kurnool (Rest)', type: 'rest', searchQuery: 'Kurnool, Andhra Pradesh, India' },
        { name: 'Hyderabad', type: 'destination', searchQuery: 'Hyderabad, Telangana, India' }
      ],
      'mumbai': [
        { name: 'Bangalore Start', type: 'start', searchQuery: 'Bangalore, Karnataka, India' },
        { name: 'Hubli (Lunch)', type: 'meal', searchQuery: 'Hubli, Karnataka, India' },
        { name: 'Belgaum (Rest)', type: 'rest', searchQuery: 'Belgaum, Karnataka, India' },
        { name: 'Mumbai', type: 'destination', searchQuery: 'Mumbai, Maharashtra, India' }
      ],
      'chennai': [
        { name: 'Bangalore Start', type: 'start', searchQuery: 'Bangalore, Karnataka, India' },
        { name: 'Hosur', type: 'stop', searchQuery: 'Hosur, Tamil Nadu, India' },
        { name: 'Chennai', type: 'destination', searchQuery: 'Chennai, Tamil Nadu, India' }
      ]
    };

    const destLower = destination.toLowerCase();
    
    // Find matching route
    for (const [key, routeWaypoints] of Object.entries(routes)) {
      if (destLower.includes(key)) {
        return routeWaypoints.map(wp => ({
          name: wp.name,
          type: wp.type,
          latitude: '',
          longitude: '',
          radius: 500,
          searchQuery: wp.searchQuery,
          searchResults: [],
          isSearching: false,
          showResults: false
        }));
      }
    }
    
    return null;
  };

  const copyShareInstructions = () => {
    const instructions = `To use with Android notifications:
1. When you get "Trip to Hyderabad" notification
2. Long press → Share
3. Choose "Location Alarm"
4. Trip form opens pre-filled!

Or copy trip details and paste here.`;
    
    navigator.clipboard.writeText(instructions);
    toast.success('Instructions copied!');
  };

  const searchPlace = async (query, index) => {
    if (!query || query.length < 3) {
      updateWaypoint(index, { searchResults: [] });
      return;
    }

    updateWaypoint(index, { isSearching: true });
    try {
      const params = { q: query, limit: 5 };
      if (userLocation) {
        params.lat = userLocation.lat;
        params.lon = userLocation.lng;
      }

      const response = await axios.get(`${API}/geocode`, { params });

      if (response.data.success && response.data.results) {
        updateWaypoint(index, { searchResults: response.data.results, showResults: true });
      } else {
        updateWaypoint(index, { searchResults: [] });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search location');
      updateWaypoint(index, { searchResults: [] });
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
      let tripId;
      
      if (editTrip) {
        // Update existing trip
        const tripData = {
          name: tripName,
          description: description || null,
          start_location: waypoints[0].name || waypoints[0].searchQuery,
          end_location: waypoints[waypoints.length - 1].name || waypoints[waypoints.length - 1].searchQuery,
        };
        
        await axios.put(`${API}/trips/${editTrip.id}`, tripData);
        tripId = editTrip.id;
        
        // Delete all existing alarms for this trip
        if (editAlarms && editAlarms.length > 0) {
          for (const alarm of editAlarms) {
            await axios.delete(`${API}/alarms/${alarm.id}`);
          }
        }
        
        toast.info('Updating trip waypoints...');
      } else {
        // Create new trip
        const tripData = {
          name: tripName,
          description: description || null,
          start_location: waypoints[0].name || waypoints[0].searchQuery,
          end_location: waypoints[waypoints.length - 1].name || waypoints[waypoints.length - 1].searchQuery,
        };

        const tripResponse = await axios.post(`${API}/trips`, tripData);
        tripId = tripResponse.data.id;
      }

      // Create new alarms for all waypoints
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

      toast.success(editTrip ? `Trip updated with ${waypoints.length} waypoints!` : `Trip "${tripName}" created with ${waypoints.length} waypoints!`);
      onClose();
    } catch (error) {
      console.error('Error saving trip:', error);
      toast.error('Failed to save trip');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Manrope' }}>
          {editTrip ? 'Edit Your Trip' : 'Plan Your Trip'}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {editTrip ? 'Modify stops or add new waypoints' : 'Create a journey with multiple stops'}
        </p>
      </div>

      {/* Android Integration Tip */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-blue-300 font-medium mb-1">
              💡 Pro Tip: Use with Android Calendar
            </p>
            <p className="text-xs text-blue-200/80">
              When you get trip notification from Google Calendar, share it to this app for instant setup!
            </p>
            <Button
              type="button"
              onClick={() => setShowIntegrationTip(!showIntegrationTip)}
              variant="ghost"
              size="sm"
              className="mt-2 h-auto p-0 text-xs text-blue-400 hover:text-blue-300"
            >
              {showIntegrationTip ? 'Hide' : 'Show'} instructions
            </Button>
          </div>
        </div>
        
        {showIntegrationTip && (
          <div className="mt-3 pl-6 space-y-1 text-xs text-blue-200/70">
            <p>1. Get trip notification (e.g., "Trip to Hyderabad tomorrow")</p>
            <p>2. Long press notification → Share</p>
            <p>3. Choose "Location Alarm"</p>
            <p>4. Trip form opens pre-filled!</p>
            <Button
              type="button"
              onClick={copyShareInstructions}
              size="sm"
              className="mt-2 h-7 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs"
            >
              <Copy className="w-3 h-3 mr-1" />
              Copy Instructions
            </Button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Waypoints - PRIMARY FOCUS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-slate-200 text-lg font-semibold">Add Your Stops</Label>
            <span className="text-xs text-slate-400">{waypoints.length} stop{waypoints.length !== 1 ? 's' : ''}</span>
          </div>
          <p className="text-sm text-slate-400">
            Add waypoints for your journey. Trip name will be auto-generated.
          </p>

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

              {/* Search Location - PRIMARY */}
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
                    onFocus={(e) => {
                      setTimeout(() => {
                        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 300);
                    }}
                    placeholder="Search for a place..."
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 pl-10 text-sm"
                    data-testid={`waypoint-search-${index}`}
                  />
                  {waypoint.isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 animate-spin" />
                  )}
                </div>

                {/* Search Results */}
                {waypoint.showResults && waypoint.searchResults.length > 0 && (
                  <div className="mt-2 w-full bg-slate-700 border border-slate-600 rounded-lg shadow-2xl z-50 max-h-48 overflow-y-auto">
                    {waypoint.searchResults.map((result, resIndex) => (
                      <button
                        key={resIndex}
                        type="button"
                        onClick={() => selectPlace(result, index)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-600 border-b border-slate-600 last:border-b-0 transition-colors"
                        data-testid={`waypoint-result-${index}-${resIndex}`}
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

              {/* Waypoint Name - SECONDARY (auto-filled) */}
              <div className="space-y-2">
                <Label className="text-slate-300 text-xs">
                  Name <span className="text-slate-500">(auto-filled)</span>
                </Label>
                <Input
                  value={waypoint.name}
                  onChange={(e) => updateWaypoint(index, { name: e.target.value })}
                  placeholder="Will be set from location"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 text-sm"
                />
                <p className="text-xs text-slate-500">
                  Auto-filled from location. Edit if needed.
                </p>
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

        {/* Auto-generated Trip Name (shown after waypoints) */}
        {tripName && waypoints.length >= 2 && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-emerald-300 font-medium mb-1">
                  Trip Name (Auto-generated)
                </p>
                <p className="text-lg font-semibold text-white mb-2" style={{ fontFamily: 'Manrope' }}>
                  {tripName}
                </p>
                <details className="text-xs">
                  <summary className="text-emerald-400 cursor-pointer hover:text-emerald-300">
                    Edit trip name
                  </summary>
                  <div className="mt-3 space-y-2">
                    <Input
                      value={tripName}
                      onChange={(e) => setTripName(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white text-sm"
                      placeholder="Custom trip name"
                    />
                    <Input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white text-sm"
                      placeholder="Add description (optional)"
                    />
                  </div>
                </details>
              </div>
            </div>
          </div>
        )}

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
            {isSubmitting ? 'Saving...' : editTrip ? 'Update Trip' : 'Create Trip'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TripForm;