import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar, MapPin, Navigation2, Clock, Sparkles, ArrowRight, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const SmartTripDetection = ({ onCreateTrip, onSkip }) => {
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [detectedTrips, setDetectedTrips] = useState([]);
  const [loading, setLoading] = useState(false);

  // Trip detection keywords
  const tripKeywords = [
    'trip to', 'travel to', 'flight to', 'bus to', 'train to',
    'going to', 'visiting', 'journey to', 'trip', 'travel'
  ];

  // Common routes with suggested stops
  const routeDatabase = {
    'bangalore-hyderabad': {
      stops: [
        { name: 'Devanahalli', type: 'meal', description: 'Popular dinner stop' },
        { name: 'Kurnool', type: 'rest', description: 'Overnight rest point' }
      ]
    },
    'bangalore-mumbai': {
      stops: [
        { name: 'Hubli', type: 'meal', description: 'Lunch stop' },
        { name: 'Belgaum', type: 'rest', description: 'Rest area' },
        { name: 'Kolhapur', type: 'meal', description: 'Dinner stop' }
      ]
    },
    'delhi-jaipur': {
      stops: [
        { name: 'Neemrana', type: 'meal', description: 'Popular breakfast stop' },
        { name: 'Shahpura', type: 'rest', description: 'Rest point' }
      ]
    }
  };

  useEffect(() => {
    detectSmartTrips();
  }, []);

  const detectSmartTrips = () => {
    setLoading(true);
    
    // Simulated calendar events (in production, integrate with Google Calendar API)
    const mockEvents = [
      {
        id: '1',
        title: 'Trip to Hyderabad - Bus Journey',
        description: 'Overnight bus from Bangalore to Hyderabad',
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        location: 'Hyderabad'
      },
      {
        id: '2',
        title: 'Meeting in Mumbai',
        description: 'Client meeting',
        startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        location: 'Mumbai'
      }
    ];

    // Parse events for trip keywords
    const trips = mockEvents
      .filter(event => {
        const text = `${event.title} ${event.description}`.toLowerCase();
        return tripKeywords.some(keyword => text.includes(keyword));
      })
      .map(event => {
        const destination = extractDestination(event);
        const route = guessRoute(destination);
        
        return {
          ...event,
          destination,
          suggestedStops: routeDatabase[route] || null,
          confidence: calculateConfidence(event)
        };
      });

    setCalendarEvents(mockEvents);
    setDetectedTrips(trips);
    setLoading(false);

    if (trips.length > 0) {
      toast.success(`Found ${trips.length} upcoming trip${trips.length > 1 ? 's' : ''}`, {
        description: 'Set location alarms now',
        icon: <Sparkles className="w-4 h-4" />
      });
    }
  };

  const extractDestination = (event) => {
    // Simple extraction - in production use NLP
    const text = `${event.title} ${event.description} ${event.location}`;
    const cities = ['Hyderabad', 'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Pune', 'Jaipur'];
    
    for (const city of cities) {
      if (text.includes(city)) {
        return city;
      }
    }
    return event.location || 'Unknown';
  };

  const guessRoute = (destination) => {
    // Guess current location (in production, use geolocation)
    const currentCity = 'bangalore';
    return `${currentCity}-${destination.toLowerCase()}`;
  };

  const calculateConfidence = (event) => {
    const text = `${event.title} ${event.description}`.toLowerCase();
    let score = 0;
    
    if (text.includes('trip') || text.includes('travel')) score += 40;
    if (text.includes('bus') || text.includes('flight') || text.includes('train')) score += 30;
    if (event.location) score += 20;
    if (text.includes('overnight') || text.includes('journey')) score += 10;
    
    return Math.min(score, 100);
  };

  const handleQuickSetup = (trip) => {
    onCreateTrip({
      name: trip.title,
      destination: trip.destination,
      startDate: trip.startDate,
      suggestedStops: trip.suggestedStops
    });
  };

  const requestCalendarAccess = async () => {
    toast.info('Calendar integration coming soon!', {
      description: 'Will integrate with Google Calendar API'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse" />
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Manrope' }}>
            Smart Trip Detection
          </h1>
        </div>
        <p className="text-slate-400 text-sm">
          AI-powered trip planning from your calendar
        </p>
      </div>

      {/* Detected Trips */}
      {detectedTrips.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <Bell className="w-4 h-4" />
            <span className="text-sm font-medium">Upcoming Trips Detected</span>
          </div>

          {detectedTrips.map((trip) => (
            <Card key={trip.id} className="bg-slate-800/60 border-emerald-500/30 p-4 space-y-4">
              {/* Trip Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Navigation2 className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-lg font-semibold text-white" style={{ fontFamily: 'Manrope' }}>
                      {trip.title}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-400 mb-2">{trip.description}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{format(trip.startDate, 'MMM dd, h:mm a')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{trip.destination}</span>
                    </div>
                  </div>
                </div>
                <div className="px-2 py-1 bg-emerald-500/20 rounded-full">
                  <span className="text-xs text-emerald-400 font-medium">
                    {trip.confidence}% match
                  </span>
                </div>
              </div>

              {/* Suggested Stops */}
              {trip.suggestedStops && (
                <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-blue-400 mb-2">
                    <Sparkles className="w-3 h-3" />
                    <span className="text-xs font-medium">AI Suggested Stops</span>
                  </div>
                  {trip.suggestedStops.stops.map((stop, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500">•</span>
                      <span className="text-white">{stop.name}</span>
                      <span className="text-xs text-slate-400">({stop.description})</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={() => handleQuickSetup(trip)}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                  data-testid="quick-setup-btn"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Quick Setup
                </Button>
                <Button
                  onClick={onSkip}
                  variant="outline"
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                >
                  Skip
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* No Trips Detected */
        <Card className="bg-slate-800/60 border-slate-700 p-6 text-center space-y-4">
          <Calendar className="w-16 h-16 text-slate-600 mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: 'Manrope' }}>
              No Upcoming Trips
            </h3>
            <p className="text-sm text-slate-400">
              Connect your calendar to detect trips automatically
            </p>
          </div>
          <Button
            onClick={requestCalendarAccess}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Connect Calendar
          </Button>
        </Card>
      )}

      {/* Manual Setup Option */}
      <div className="text-center">
        <Button
          onClick={onSkip}
          variant="ghost"
          className="text-slate-400 hover:text-white"
        >
          Create Trip Manually
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default SmartTripDetection;