import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { MapPin, Trash2, Edit, Bell, BellOff } from 'lucide-react';

const AlarmList = ({ alarms, onEdit, onDelete, onToggle }) => {
  if (alarms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Bell className="w-16 h-16 text-slate-600 mb-4" />
        <h3 className="text-xl font-semibold text-slate-300 mb-2" style={{ fontFamily: 'Manrope' }}>
          No Alarms Yet
        </h3>
        <p className="text-slate-500 text-sm">
          Create your first location alarm to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Manrope' }}>
          My Alarms
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {alarms.length} alarm{alarms.length !== 1 ? 's' : ''} configured
        </p>
      </div>

      <div className="space-y-3">
        {alarms.map((alarm) => (
          <div
            key={alarm.id}
            className="backdrop-blur-xl bg-slate-800/60 border border-white/10 rounded-xl p-4 shadow-lg"
            data-testid={`alarm-card-${alarm.id}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-white" style={{ fontFamily: 'Manrope' }}>
                    {alarm.name}
                  </h3>
                  {alarm.is_active ? (
                    <Bell className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <BellOff className="w-4 h-4 text-slate-500" />
                  )}
                </div>
                <div className="flex items-center gap-1 text-sm text-slate-400 mt-1">
                  <MapPin className="w-3 h-3" />
                  <span>
                    {alarm.latitude.toFixed(4)}, {alarm.longitude.toFixed(4)}
                  </span>
                </div>
              </div>
              <Switch
                checked={alarm.is_active}
                onCheckedChange={(checked) => onToggle(alarm.id, checked)}
                data-testid={`alarm-toggle-${alarm.id}`}
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400 mb-3">
              {alarm.trigger_mode === 'time' ? (
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-md">
                  {alarm.trigger_time} min before
                </span>
              ) : (
                <span className="px-2 py-1 bg-slate-700/50 rounded-md">
                  {alarm.radius}m radius
                </span>
              )}
              {alarm.recurring && (
                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-md">
                  Recurring
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => onEdit(alarm)}
                variant="outline"
                size="sm"
                className="flex-1 bg-slate-700/50 border-slate-600 text-white hover:bg-slate-600"
                data-testid={`edit-alarm-${alarm.id}`}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                onClick={() => onDelete(alarm.id)}
                variant="outline"
                size="sm"
                className="flex-1 bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
                data-testid={`delete-alarm-${alarm.id}`}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlarmList;