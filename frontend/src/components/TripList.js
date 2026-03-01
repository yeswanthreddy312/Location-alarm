import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Navigation2, Trash2, MapPin, ChevronRight, Circle, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TripList = ({ onSelectTrip }) => {
  const [trips, setTrips] = useState([]);
  const [tripAlarms, setTripAlarms] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const response = await axios.get(`${API}/trips`);
      const tripsData = response.data;
      setTrips(tripsData);

      for (const trip of tripsData) {
        const alarmsResponse = await axios.get(`${API}/trips/${trip.id}/alarms`);
        setTripAlarms(prev => ({ ...prev, [trip.id]: alarmsResponse.data }));
      }
    } catch (error) {
      console.error('Error fetching trips:', error);
      toast.error('Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  const deleteTrip = async (tripId) => {
    try {
      await axios.delete(`${API}/trips/${tripId}`);
      toast.success('Trip deleted');
      fetchTrips();
    } catch (error) {
      console.error('Error deleting trip:', error);
      toast.error('Failed to delete trip');
    }
  };

  const getWaypointIcon = (type) => {
    const icons = {
      start: '🏁',
      stop: '⏸️',
      meal: '🍽️',
      rest: '🛏️',
      fuel: '⛽',
      destination: '🎯',
    };
    return icons[type] || '📍';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Navigation2 className="w-16 h-16 text-slate-600 mb-4" />
        <h3 className="text-xl font-semibold text-slate-300 mb-2" style={{ fontFamily: 'Manrope' }}>
          No Trips Yet
        </h3>
        <p className="text-slate-500 text-sm">
          Create your first multi-stop trip
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Manrope' }}>
          My Trips
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {trips.length} trip{trips.length !== 1 ? 's' : ''} planned
        </p>
      </div>

      <div className="space-y-3">
        {trips.map((trip) => {
          const alarms = tripAlarms[trip.id] || [];
          const completedCount = alarms.filter(a => a.triggered_at).length;
          
          return (
            <div
              key={trip.id}
              className="backdrop-blur-xl bg-slate-800/60 border border-white/10 rounded-xl p-4 shadow-lg"
              data-testid={`trip-card-${trip.id}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Navigation2 className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-lg font-semibold text-white" style={{ fontFamily: 'Manrope' }}>
                      {trip.name}
                    </h3>
                  </div>
                  {trip.description && (
                    <p className="text-sm text-slate-400 mb-2">{trip.description}</p>
                  )}
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <span>{trip.start_location}</span>
                    <ChevronRight className="w-3 h-3" />
                    <span>{trip.end_location}</span>
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Progress</span>
                  <span>{completedCount} / {alarms.length} stops</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${alarms.length > 0 ? (completedCount / alarms.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Waypoints */}
              <div className="space-y-2 mb-3">
                {alarms.slice(0, 3).map((alarm, idx) => (
                  <div key={alarm.id} className="flex items-center gap-2 text-sm">
                    {alarm.triggered_at ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-500" />
                    )}
                    <span className="text-slate-300">
                      {getWaypointIcon(alarm.waypoint_type)} {alarm.name}
                    </span>
                  </div>
                ))}
                {alarms.length > 3 && (
                  <div className="text-xs text-slate-500 ml-6">
                    +{alarms.length - 3} more stops
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={() => onSelectTrip && onSelectTrip(trip)}
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-slate-700/50 border-slate-600 text-white hover:bg-slate-600"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  View on Map
                </Button>
                <Button
                  onClick={() => deleteTrip(trip.id)}
                  variant="outline"
                  size="sm"
                  className="bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
                  data-testid={`delete-trip-${trip.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TripList;