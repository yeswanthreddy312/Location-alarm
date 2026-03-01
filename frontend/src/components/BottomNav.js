import React from 'react';
import { Bell, Plus, History, MapPin, Navigation2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BottomNav = ({ onTrips, onAlarms, onAdd, onHistory, onCenter }) => (
  <div className="fixed bottom-0 left-0 right-0 z-40">
    <div className="bg-slate-900/95 backdrop-blur-xl border-t border-white/10 px-4 py-3 flex items-center justify-around">
      <Button
        onClick={onTrips}
        variant="ghost"
        className="flex flex-col items-center gap-1 h-auto py-2 px-4 text-slate-300 hover:text-emerald-400 hover:bg-transparent"
        data-testid="nav-trips-btn"
      >
        <Navigation2 className="w-6 h-6" />
        <span className="text-xs">Trips</span>
      </Button>

      <Button
        onClick={onAlarms}
        variant="ghost"
        className="flex flex-col items-center gap-1 h-auto py-2 px-4 text-slate-300 hover:text-emerald-400 hover:bg-transparent"
        data-testid="nav-alarms-btn"
      >
        <Bell className="w-6 h-6" />
        <span className="text-xs">Alarms</span>
      </Button>

      <Button
        onClick={onAdd}
        className="w-14 h-14 -mt-8 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-transform active:scale-95"
        data-testid="nav-add-btn"
      >
        <Plus className="w-7 h-7" />
      </Button>

      <Button
        onClick={onHistory}
        variant="ghost"
        className="flex flex-col items-center gap-1 h-auto py-2 px-4 text-slate-300 hover:text-emerald-400 hover:bg-transparent"
        data-testid="nav-history-btn"
      >
        <History className="w-6 h-6" />
        <span className="text-xs">History</span>
      </Button>

      <Button
        onClick={onCenter}
        variant="ghost"
        className="flex flex-col items-center gap-1 h-auto py-2 px-4 text-slate-300 hover:text-emerald-400 hover:bg-transparent"
        data-testid="nav-location-btn"
      >
        <MapPin className="w-6 h-6" />
        <span className="text-xs">Location</span>
      </Button>
    </div>
  </div>
);

export default BottomNav;
