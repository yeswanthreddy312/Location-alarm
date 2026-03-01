import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import axios from 'axios';
import { MapPin, Save, Search, Loader2, Clock, Ruler, Plus, X, ChevronLeft } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const emptyForm = () => ({
  searchQuery: '', name: '', lat: '', lng: '',
  triggerMode: 'time', triggerTime: 30, radius: 500,
  searchResults: [], isSearching: false, showResults: false,
});

const AlarmBuilder = ({ onClose, userLocation, tempMarker, editAlarm, editTrip, editTripAlarms }) => {
  const [stops, setStops] = useState([]);
  const [editing, setEditing] = useState(null); // null=summary, 'new'=adding, number=editing index
  const [form, setForm] = useState(emptyForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchRef = useRef(null);

  // Initialize
  useEffect(() => {
    if (editAlarm) {
      setStops([{
        name: editAlarm.name, lat: editAlarm.latitude, lng: editAlarm.longitude,
        triggerMode: editAlarm.trigger_mode || 'distance',
        triggerTime: editAlarm.trigger_time || 30,
        radius: editAlarm.radius, type: 'destination',
      }]);
    } else if (editTrip && editTripAlarms) {
      setStops(editTripAlarms.map(a => ({
        name: a.name, lat: a.latitude, lng: a.longitude,
        triggerMode: a.trigger_mode || 'distance',
        triggerTime: a.trigger_time || 30,
        radius: a.radius, type: a.waypoint_type || 'stop',
      })));
    } else if (tempMarker) {
      // Map click: auto-add start with GPS, pre-fill destination from marker
      const startStop = userLocation
        ? { name: 'Current Location', lat: userLocation.lat, lng: userLocation.lng, triggerMode: 'distance', triggerTime: 30, radius: 500, type: 'start' }
        : null;
      if (startStop) setStops([startStop]);
      setEditing('new');
      setForm({
        ...emptyForm(),
        lat: tempMarker.lat, lng: tempMarker.lng,
        searchQuery: tempMarker.address || `${tempMarker.lat.toFixed(4)}, ${tempMarker.lng.toFixed(4)}`,
        name: tempMarker.name || '',
      });
    } else {
      // Fresh: ask for start location, pre-fill with GPS
      setEditing('new');
      if (userLocation) {
        setForm({
          ...emptyForm(),
          lat: userLocation.lat, lng: userLocation.lng,
          searchQuery: 'Current Location',
          name: 'Current Location',
        });
      }
    }
  }, [editAlarm, editTrip, editTripAlarms, tempMarker, userLocation]);

  // Search
  const searchPlace = async (query) => {
    if (!query || query.length < 3) { setForm(f => ({ ...f, searchResults: [], showResults: false })); return; }
    setForm(f => ({ ...f, isSearching: true }));
    try {
      const params = { q: query, limit: 5 };
      if (userLocation) { params.lat = userLocation.lat; params.lon = userLocation.lng; }
      const res = await axios.get(`${API}/geocode`, { params });
      if (res.data.success && res.data.results) {
        setForm(f => ({ ...f, searchResults: res.data.results, showResults: true }));
      } else {
        setForm(f => ({ ...f, searchResults: [], showResults: false }));
      }
    } catch {
      toast.error('Search failed');
    } finally {
      setForm(f => ({ ...f, isSearching: false }));
    }
  };

  const onSearchChange = (val) => {
    setForm(f => ({ ...f, searchQuery: val }));
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => searchPlace(val), 500);
  };

  const pickPlace = (place) => {
    setForm(f => ({
      ...f, lat: place.lat, lng: place.lon,
      searchQuery: place.display_name, showResults: false,
      name: f.name || place.display_name.split(',')[0],
    }));
  };

  const useCurrentLocation = () => {
    if (!userLocation) { toast.error('GPS not available'); return; }
    setForm(f => ({
      ...f, lat: userLocation.lat, lng: userLocation.lng,
      searchQuery: 'Current Location',
      name: f.name || 'Current Location',
    }));
  };

  // Confirm stop
  const confirmStop = () => {
    if (!form.lat || !form.lng) { toast.error('Select a location'); return; }
    const stop = {
      name: form.name || form.searchQuery.split(',')[0] || 'Unnamed',
      lat: parseFloat(form.lat), lng: parseFloat(form.lng),
      triggerMode: form.triggerMode, triggerTime: form.triggerTime,
      radius: form.radius, type: 'destination',
    };

    if (editing === 'new') {
      if (stops.length === 0) {
        // First stop = Start. Add it, then immediately ask for destination.
        setStops([{ ...stop, type: 'start' }]);
        setForm(emptyForm());
        setEditing('new');
        return;
      } else if (stops.length === 1 && stops[0].type === 'start') {
        // Second stop = Destination
        setStops([...stops, { ...stop, type: 'destination' }]);
      } else {
        // Insert as waypoint before destination
        const next = [...stops];
        next.splice(stops.length - 1, 0, { ...stop, type: 'stop' });
        setStops(next);
      }
    } else if (typeof editing === 'number') {
      const next = [...stops];
      next[editing] = { ...stop, type: next[editing].type };
      setStops(next);
    }
    setEditing(null);
    setForm(emptyForm());
  };

  const startEdit = (i) => {
    const s = stops[i];
    setForm({
      searchQuery: s.name, name: s.name, lat: s.lat, lng: s.lng,
      triggerMode: s.triggerMode, triggerTime: s.triggerTime, radius: s.radius,
      searchResults: [], isSearching: false, showResults: false,
    });
    setEditing(i);
  };

  const removeStop = (i) => {
    if (stops[i].type === 'start' || stops[i].type === 'destination') return;
    setStops(stops.filter((_, idx) => idx !== i));
  };

  const addWaypoint = () => {
    setForm(emptyForm());
    setEditing('new');
  };

  // Save
  const handleSave = async () => {
    if (stops.length === 0) { toast.error('Add a destination'); return; }
    setIsSubmitting(true);
    try {
      if (stops.length === 1 && !stops[0].trip_id) {
        // Single alarm edit (no start)
        const s = stops[0];
        const data = {
          name: s.name, latitude: s.lat, longitude: s.lng, radius: s.radius,
          sound: 'default', is_active: true, recurring: false,
          trigger_mode: s.triggerMode,
          trigger_time: s.triggerMode === 'time' ? s.triggerTime : null,
        };
        if (editAlarm) await axios.put(`${API}/alarms/${editAlarm.id}`, data);
        else await axios.post(`${API}/alarms`, data);
        toast.success(editAlarm ? 'Alarm updated' : 'Alarm created');
      } else {
        // Trip (start + destination + optional waypoints)
        const startName = stops[0].name;
        const destName = stops[stops.length - 1].name;
        const tripName = `${startName} to ${destName}`;
        const tripData = { name: tripName, description: null, start_location: startName, end_location: destName };
        let tripId;
        if (editTrip) {
          await axios.put(`${API}/trips/${editTrip.id}`, tripData);
          tripId = editTrip.id;
          if (editTripAlarms?.length) for (const a of editTripAlarms) await axios.delete(`${API}/alarms/${a.id}`);
        } else {
          tripId = (await axios.post(`${API}/trips`, tripData)).data.id;
        }
        for (let i = 0; i < stops.length; i++) {
          const s = stops[i];
          await axios.post(`${API}/alarms`, {
            name: s.name, latitude: s.lat, longitude: s.lng, radius: s.radius,
            sound: 'default', is_active: true, recurring: false,
            trip_id: tripId, sequence: i + 1, waypoint_type: s.type,
            trigger_mode: s.triggerMode,
            trigger_time: s.triggerMode === 'time' ? s.triggerTime : null,
          });
        }
        toast.success(editTrip ? 'Trip updated' : `Trip with ${stops.length} stops created`);
      }
      onClose();
    } catch {
      toast.error('Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fmtAlarm = (s) => s.triggerMode === 'time' ? `${s.triggerTime} min` : `${s.radius}m`;

  // ─── EDITOR VIEW ───
  if (editing !== null) {
    const isNew = editing === 'new';
    const isAskingStart = isNew && stops.length === 0;
    const isAskingDest = isNew && stops.length === 1 && stops[0].type === 'start';
    const title = isAskingStart ? 'Where are you starting?'
      : isAskingDest ? 'Where are you going?'
      : isNew ? 'Add a stop'
      : `Edit ${stops[editing]?.name || 'stop'}`;

    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          {!isAskingStart && (
            <button onClick={() => {
              if (isAskingDest) { startEdit(0); } // Back to editing start
              else { setEditing(null); setForm(emptyForm()); }
            }} className="text-slate-400 hover:text-white" data-testid="editor-back-btn">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Manrope' }}>{title}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAskingStart ? 'Set your departure point' : 'Search a location, then set your alarm'}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            value={form.searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
            placeholder="Search for a place..."
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 pl-10"
            data-testid="builder-search-input"
          />
          {form.isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 animate-spin" />}
        </div>

        {form.showResults && form.searchResults.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg max-h-48 overflow-y-auto">
            {form.searchResults.map((r, i) => (
              <button key={i} type="button" onClick={() => pickPlace(r)} className="w-full text-left px-3 py-2.5 hover:bg-slate-700 border-b border-slate-700 last:border-b-0" data-testid={`builder-result-${i}`}>
                <div className="flex items-start gap-2">
                  <MapPin className="w-3 h-3 text-emerald-400 mt-1 flex-shrink-0" />
                  <p className="text-sm text-white">{r.display_name}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {isAskingStart && (
          <Button type="button" onClick={useCurrentLocation} variant="outline" className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700" data-testid="builder-current-loc-btn">
            <MapPin className="w-4 h-4 mr-2" />Use Current Location
          </Button>
        )}

        {/* Selected location info */}
        {form.lat && form.lng && (
          <>
            <div className="space-y-2">
              <Label className="text-slate-300 text-xs">Name</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Auto-filled from location" className="bg-slate-800 border-slate-700 text-white text-sm" data-testid="builder-name-input" />
            </div>

            {/* Alarm mode */}
            <div className="space-y-3">
              <Label className="text-slate-200 text-sm">Alert me by</Label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm(f => ({ ...f, triggerMode: 'distance' }))}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${form.triggerMode === 'distance' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}
                  data-testid="builder-mode-distance"
                >
                  <Ruler className="w-4 h-4 inline mr-1" />Distance
                </button>
                <button type="button" onClick={() => setForm(f => ({ ...f, triggerMode: 'time' }))}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${form.triggerMode === 'time' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'}`}
                  data-testid="builder-mode-time"
                >
                  <Clock className="w-4 h-4 inline mr-1" />Time
                </button>
              </div>

              <div data-vaul-no-drag>
                {form.triggerMode === 'distance' ? (
                  <div className="flex items-center gap-3">
                    <Slider value={[form.radius]} onValueChange={([v]) => setForm(f => ({ ...f, radius: v }))} min={100} max={5000} step={100} className="flex-1" data-testid="builder-radius-slider" />
                    <span className="text-sm text-emerald-400 font-medium w-16 text-right">{form.radius}m</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Slider value={[form.triggerTime]} onValueChange={([v]) => setForm(f => ({ ...f, triggerTime: v }))} min={5} max={120} step={5} className="flex-1" data-testid="builder-time-slider" />
                    <span className="text-sm text-blue-400 font-medium w-16 text-right">{form.triggerTime} min</span>
                  </div>
                )}
              </div>
            </div>

            <Button onClick={confirmStop} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3" data-testid="builder-confirm-btn">
              {isAskingStart ? 'Set Start' : isAskingDest ? 'Set Destination' : isNew ? 'Add Waypoint' : 'Update'}
            </Button>
          </>
        )}
      </div>
    );
  }

  // ─── SUMMARY VIEW ───
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Manrope' }}>
          {stops.length > 1 ? `${stops[0].name} to ${stops[stops.length - 1].name}` : stops[0]?.name || 'Your Trip'}
        </h2>
        <p className="text-xs text-slate-400 mt-1">{stops.length} stop{stops.length !== 1 ? 's' : ''} &middot; Tap to edit</p>
      </div>

      {/* Trip visual */}
      <div className="py-2">
        {stops.map((stop, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div className="ml-[7px] h-5 border-l-2 border-dashed border-slate-700" />}

            {/* Stop row — tappable */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => startEdit(i)}
              onKeyDown={(e) => e.key === 'Enter' && startEdit(i)}
              className="flex items-center gap-3 py-2.5 w-full text-left hover:bg-slate-800/60 rounded-lg px-1 -mx-1 transition-colors group cursor-pointer"
              data-testid={`stop-row-${i}`}
            >
              <div className={`w-3 h-3 rounded-full ml-0.5 ${
                stop.type === 'start' ? 'bg-slate-400 ring-2 ring-slate-400/20' :
                stop.type === 'destination' ? 'bg-emerald-500 ring-2 ring-emerald-500/20' :
                'bg-amber-500 ring-2 ring-amber-500/20'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{stop.name}</p>
                <p className="text-[11px] text-slate-500">
                  {stop.type === 'start' ? 'Start' : stop.type === 'destination' ? 'Destination' : 'Waypoint'}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded font-medium ${
                stop.triggerMode === 'time' ? 'bg-blue-500/15 text-blue-400' : 'bg-emerald-500/15 text-emerald-400'
              }`}>
                {fmtAlarm(stop)}
              </span>
              {stop.type === 'stop' && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeStop(i); }}
                  className="text-slate-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  data-testid={`remove-stop-${i}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Add waypoint */}
      <Button onClick={addWaypoint} variant="outline" className="w-full bg-slate-800/50 border-slate-700 border-dashed text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30" data-testid="builder-add-waypoint-btn">
        <Plus className="w-4 h-4 mr-2" />Add Waypoint
      </Button>

      {/* Save */}
      <div className="flex gap-3 pt-2">
        <Button onClick={onClose} variant="outline" className="flex-1 bg-slate-800 border-slate-700 text-white hover:bg-slate-700" data-testid="builder-cancel-btn">
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSubmitting} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white" data-testid="builder-save-btn">
          <Save className="w-4 h-4 mr-2" />
          {isSubmitting ? 'Saving...' : 'Save Trip'}
        </Button>
      </div>
    </div>
  );
};

export default AlarmBuilder;
