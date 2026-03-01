const ALARMS = 'loc_alarm_alarms';
const TRIPS = 'loc_alarm_trips';
const HISTORY = 'loc_alarm_history';

const get = (key) => JSON.parse(localStorage.getItem(key) || '[]');
const set = (key, data) => localStorage.setItem(key, JSON.stringify(data));
const uid = () => crypto.randomUUID();

export const storage = {
  // Alarms
  getAlarms: () => get(ALARMS),
  addAlarm: (data) => {
    const alarm = { id: uid(), created_at: new Date().toISOString(), triggered_at: null, ...data };
    const all = get(ALARMS);
    all.push(alarm);
    set(ALARMS, all);
    return alarm;
  },
  updateAlarm: (id, updates) => {
    set(ALARMS, get(ALARMS).map(a => a.id === id ? { ...a, ...updates } : a));
  },
  deleteAlarm: (id) => set(ALARMS, get(ALARMS).filter(a => a.id !== id)),
  getAlarmsByTrip: (tripId) => get(ALARMS).filter(a => a.trip_id === tripId).sort((a, b) => (a.sequence || 0) - (b.sequence || 0)),

  // Trips
  getTrips: () => get(TRIPS),
  addTrip: (data) => {
    const trip = { id: uid(), is_active: true, created_at: new Date().toISOString(), ...data };
    const all = get(TRIPS);
    all.push(trip);
    set(TRIPS, all);
    return trip;
  },
  updateTrip: (id, updates) => {
    set(TRIPS, get(TRIPS).map(t => t.id === id ? { ...t, ...updates } : t));
  },
  deleteTrip: (id) => {
    set(TRIPS, get(TRIPS).filter(t => t.id !== id));
    set(ALARMS, get(ALARMS).filter(a => a.trip_id !== id));
  },

  // History
  getHistory: () => get(HISTORY).sort((a, b) => new Date(b.triggered_at) - new Date(a.triggered_at)),
  addHistory: (data) => {
    const entry = { id: uid(), triggered_at: new Date().toISOString(), ...data };
    const all = get(HISTORY);
    all.push(entry);
    set(HISTORY, all);
  },
};
