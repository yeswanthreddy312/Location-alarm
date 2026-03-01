import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function useAlarms() {
  const [alarms, setAlarms] = useState([]);

  const fetchAlarms = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/alarms`);
      setAlarms(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching alarms:', err);
      toast.error('Failed to load alarms');
    }
  }, []);

  const deleteAlarm = useCallback(async (id) => {
    try {
      await axios.delete(`${API}/alarms/${id}`);
      toast.success('Alarm deleted');
      await fetchAlarms();
    } catch (err) {
      console.error('Error deleting alarm:', err);
      toast.error('Failed to delete alarm');
    }
  }, [fetchAlarms]);

  const toggleAlarm = useCallback(async (id, active) => {
    try {
      await axios.put(`${API}/alarms/${id}`, { is_active: active });
      toast.success(active ? 'Alarm enabled' : 'Alarm disabled');
      await fetchAlarms();
    } catch (err) {
      console.error('Error toggling alarm:', err);
    }
  }, [fetchAlarms]);

  useEffect(() => { fetchAlarms(); }, [fetchAlarms]);

  return { alarms, fetchAlarms, deleteAlarm, toggleAlarm };
}
