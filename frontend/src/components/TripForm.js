import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import axios from 'axios';
import { MapPin, Save, Plus, X, Search, Loader2, Navigation2, Clock, Ruler } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const waypointTypes = [
  { value: 'start', label: 'Start' },
  { value: 'stop', label: 'Stop' },
  { value: 'meal', label: 'Meal' },
  { value: 'rest', label: 'Rest' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'destination', label: 'Destination' },
];

const TripForm = ({ onClose, editTrip = null, editAlarms = null, userLocation = null }) => {
  const [tripName, setTripName] = useState('');
  const [description, setDescription] = useState('');
  const [waypoints, setWaypoints] = useState([
    { name: '', type: 'start', latitude: '', longitude: '', radius: 500, searchQuery: '', searchResults: [], isSearching: false, showResults: false },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    if (!editTrip || !editAlarms) return;
    setTripName(editTrip.name);
    setDescription(editTrip.description || '');
    setWaypoints(
      editAlarms.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.waypoint_type || 'stop',
        latitude: a.latitude.toString(),
        longitude: a.longitude.toString(),
        radius: a.radius,
        searchQuery: a.name,
        searchResults: [],
        isSearching: false,
        showResults: false,
      }))
    );
  }, [editTrip, editAlarms]);

  // Auto-generate trip name from first + last waypoint
  useEffect(() => {
    if (waypoints.length < 2 || editTrip) return;
    const first = waypoints[0].name || waypoints[0].searchQuery.split(',')[0];
    const last = waypoints[waypoints.length - 1].name || waypoints[waypoints.length - 1].searchQuery.split(',')[0];
    if (first && last && first !== last) {
      setTripName(`${first} to ${last}`);
    }
  }, [waypoints, editTrip]);

  const updateWaypoint = (index, updates) => {
    setWaypoints((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const searchPlace = async (query, index) => {
    if (!query || query.length < 3) {
      updateWaypoint(index, { searchResults: [], showResults: false });
      return;
    }
    updateWaypoint(index, { isSearching: true });
    try {
      const params = { q: query, limit: 5 };
      if (userLocation) {
        params.lat = userLocation.lat;
        params.lon = userLocation.lng;
      }
      const res = await axios.get(`${API}/geocode`, { params });
      if (res.data.success && res.data.results) {
        updateWaypoint(index, { searchResults: res.data.results, showResults: true });
      } else {
        updateWaypoint(index, { searchResults: [], showResults: false });
      }
    } catch {
      toast.error('Failed to search location');
      updateWaypoint(index, { searchResults: [], showResults: false });
    } finally {
      updateWaypoint(index, { isSearching: false });
    }
  };

  const handleSearchChange = (value, index) => {
    updateWaypoint(index, { searchQuery: value });
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchPlace(value, index), 500);
  };

  const selectPlace = (place, index) => {
    updateWaypoint(index, {
      latitude: place.lat,
      longitude: place.lon,
      searchQuery: place.display_name,
      showResults: false,
      name: waypoints[index].name || place.display_name.split(',')[0],
    });
    toast.success('Location selected');
  };

  const addWaypoint = () => {
    setWaypoints((prev) => [
      ...prev,
      { name: '', type: 'stop', latitude: '', longitude: '', radius: 500, searchQuery: '', searchResults: [], isSearching: false, showResults: false },
    ]);
  };

  const removeWaypoint = (index) => {
    if (waypoints.length > 1) setWaypoints((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tripName) { toast.error('Please enter trip name'); return; }
    if (waypoints.some((w) => !w.latitude || !w.longitude)) { toast.error('Please set location for all waypoints'); return; }

    setIsSubmitting(true);
    try {
      const tripData = {
        name: tripName,
        description: description || null,
        start_location: waypoints[0].name || waypoints[0].searchQuery,
        end_location: waypoints[waypoints.length - 1].name || waypoints[waypoints.length - 1].searchQuery,
      };

      let tripId;
      if (editTrip) {
        await axios.put(`${API}/trips/${editTrip.id}`, tripData);
        tripId = editTrip.id;
        // Delete old alarms
        if (editAlarms?.length) {
          for (const a of editAlarms) await axios.delete(`${API}/alarms/${a.id}`);
        }
      } else {
        const res = await axios.post(`${API}/trips`, tripData);
        tripId = res.data.id;
      }

      // Create alarms for each waypoint
      for (let i = 0; i < waypoints.length; i++) {
        const wp = waypoints[i];
        await axios.post(`${API}/alarms`, {
          name: wp.name || wp.searchQuery.split(',')[0],
          latitude: parseFloat(wp.latitude),
          longitude: parseFloat(wp.longitude),
          radius: wp.radius,
          sound: 'default',
          is_active: true,
          recurring: false,
          trip_id: tripId,
          sequence: i + 1,
          waypoint_type: wp.type,
        });
      }

      toast.success(editTrip ? `Trip updated with ${waypoints.length} stops!` : `"${tripName}" created with ${waypoints.length} stops!`);
      onClose();
    } catch {
      toast.error('Failed to save trip');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Manrope' }}>
          {editTrip ? 'Edit Trip' : 'Plan Your Trip'}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {editTrip ? 'Modify stops or add new waypoints' : 'Create a journey with multiple stops'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Waypoints */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-slate-200 text-lg font-semibold">Stops</Label>
            <span className="text-xs text-slate-400">{waypoints.length} stop{waypoints.length !== 1 ? 's' : ''}</span>
          </div>

          {waypoints.map((wp, index) => (
            <div key={index} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-white">Stop {index + 1}</span>
                </div>
                {waypoints.length > 1 && (
                  <Button type="button" onClick={() => removeWaypoint(index)} variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20">
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Type */}
              <select
                value={wp.type}
                onChange={(e) => updateWaypoint(index, { type: e.target.value })}
                className="w-full bg-slate-700 border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                data-testid={`waypoint-type-${index}`}
              >
                {waypointTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  value={wp.searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value, index)}
                  onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
                  placeholder="Search for a place..."
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 pl-10 text-sm"
                  data-testid={`waypoint-search-${index}`}
                />
                {wp.isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 animate-spin" />}
              </div>

              {/* Results */}
              {wp.showResults && wp.searchResults.length > 0 && (
                <div className="w-full bg-slate-700 border border-slate-600 rounded-lg shadow-2xl max-h-48 overflow-y-auto">
                  {wp.searchResults.map((r, ri) => (
                    <button key={ri} type="button" onClick={() => selectPlace(r, index)} className="w-full text-left px-3 py-2 hover:bg-slate-600 border-b border-slate-600 last:border-b-0" data-testid={`waypoint-result-${index}-${ri}`}>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3 h-3 text-emerald-400 mt-1 flex-shrink-0" />
                        <p className="text-xs text-white">{r.display_name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Name (auto-filled) */}
              <Input
                value={wp.name}
                onChange={(e) => updateWaypoint(index, { name: e.target.value })}
                placeholder="Name (auto-filled from location)"
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 text-sm"
                data-testid={`waypoint-name-${index}`}
              />

              {wp.latitude && wp.longitude && (
                <div className="text-xs text-slate-400">
                  {parseFloat(wp.latitude).toFixed(4)}, {parseFloat(wp.longitude).toFixed(4)}
                </div>
              )}
            </div>
          ))}

          <Button type="button" onClick={addWaypoint} variant="outline" className="w-full bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700" data-testid="add-waypoint-btn">
            <Plus className="w-4 h-4 mr-2" />
            Add Another Stop
          </Button>
        </div>

        {/* Trip Name (auto-generated) */}
        {tripName && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 space-y-2">
            <Label className="text-xs text-emerald-300">Trip Name</Label>
            <Input value={tripName} onChange={(e) => setTripName(e.target.value)} className="bg-slate-800 border-slate-700 text-white text-sm" data-testid="trip-name-input" />
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="bg-slate-800 border-slate-700 text-white text-sm" placeholder="Description (optional)" data-testid="trip-description-input" />
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-4">
          <Button type="button" onClick={onClose} variant="outline" className="flex-1 bg-slate-800 border-slate-700 text-white hover:bg-slate-700" data-testid="cancel-trip-btn">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50" data-testid="create-trip-btn">
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Saving...' : editTrip ? 'Update Trip' : 'Create Trip'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TripForm;
