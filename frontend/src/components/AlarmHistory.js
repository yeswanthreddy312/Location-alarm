import React, { useState, useEffect } from 'react';
import { History, Clock, MapPin } from 'lucide-react';
import { storage } from '@/utils/storage';
import { format } from 'date-fns';

const AlarmHistory = () => {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setHistory(storage.getHistory());
  }, []);

  const formatDate = (dateString) => {
    try { return format(new Date(dateString), 'MMM dd, yyyy h:mm a'); }
    catch { return dateString; }
  };

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <History className="w-16 h-16 text-slate-600 mb-4" />
        <h3 className="text-xl font-semibold text-slate-300 mb-2" style={{ fontFamily: 'Manrope' }}>No History Yet</h3>
        <p className="text-slate-500 text-sm">Your alarm triggers will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Manrope' }}>Alarm History</h2>
        <p className="text-sm text-slate-400 mt-1">{history.length} trigger{history.length !== 1 ? 's' : ''} recorded</p>
      </div>
      <div className="space-y-3">
        {history.map((record) => (
          <div key={record.id} className="backdrop-blur-xl bg-slate-800/60 border border-white/10 rounded-xl p-4 shadow-lg" data-testid={`history-record-${record.id}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1" style={{ fontFamily: 'Manrope' }}>{record.alarm_name}</h3>
                <div className="flex items-center gap-1 text-sm text-slate-400 mb-2">
                  <MapPin className="w-3 h-3" />
                  <span>{record.latitude.toFixed(4)}, {record.longitude.toFixed(4)}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-400">
                  <Clock className="w-3 h-3" />
                  <span>{formatDate(record.triggered_at)}</span>
                </div>
              </div>
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400">
                <History className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlarmHistory;
