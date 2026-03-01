import { useState, useEffect, useCallback } from 'react';
import { storage } from '@/utils/storage';
import { toast } from 'sonner';

export function useAlarms() {
  const [alarms, setAlarms] = useState([]);

  const fetchAlarms = useCallback(() => {
    setAlarms(storage.getAlarms());
  }, []);

  const deleteAlarm = useCallback((id) => {
    storage.deleteAlarm(id);
    toast.success('Alarm deleted');
    fetchAlarms();
  }, [fetchAlarms]);

  const toggleAlarm = useCallback((id, active) => {
    storage.updateAlarm(id, { is_active: active });
    toast.success(active ? 'Alarm enabled' : 'Alarm disabled');
    fetchAlarms();
  }, [fetchAlarms]);

  useEffect(() => { fetchAlarms(); }, [fetchAlarms]);

  return { alarms, fetchAlarms, deleteAlarm, toggleAlarm };
}
