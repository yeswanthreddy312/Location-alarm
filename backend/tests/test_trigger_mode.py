"""
Test Trigger Mode Feature - Distance/Time based alarm triggering
Tests: trigger_mode (distance/time), trigger_time field for time-based alarms
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestDistanceModeAlarms:
    """Test distance-based alarm triggering (default mode)"""
    
    def test_create_distance_alarm(self):
        """POST /api/alarms with trigger_mode='distance' - verify default mode works"""
        payload = {
            "name": "TEST_Distance_Alarm",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "radius": 1000,
            "sound": "default",
            "is_active": True,
            "recurring": False,
            "trigger_mode": "distance"
        }
        response = requests.post(f"{BASE_URL}/api/alarms", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate trigger_mode field
        assert data["trigger_mode"] == "distance", f"Expected 'distance', got {data.get('trigger_mode')}"
        assert data["trigger_time"] is None, f"trigger_time should be None for distance mode"
        assert data["radius"] == 1000
        
        pytest.distance_alarm_id = data["id"]
        print(f"✓ POST /api/alarms - created distance alarm: {data['id']}")
    
    def test_get_distance_alarm_verify_fields(self):
        """GET /api/alarms/{id} - verify trigger_mode is persisted correctly"""
        alarm_id = getattr(pytest, 'distance_alarm_id', None)
        if not alarm_id:
            pytest.skip("No distance alarm ID from previous test")
        
        response = requests.get(f"{BASE_URL}/api/alarms/{alarm_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert data["trigger_mode"] == "distance"
        assert data["trigger_time"] is None
        print(f"✓ GET /api/alarms/{alarm_id} - trigger_mode='distance' persisted")


class TestTimeModeAlarms:
    """Test time-based alarm triggering (new feature)"""
    
    def test_create_time_alarm(self):
        """POST /api/alarms with trigger_mode='time', trigger_time=30 - verify time mode works"""
        payload = {
            "name": "TEST_Time_Alarm_30min",
            "latitude": 15.8281,
            "longitude": 78.0373,
            "radius": 500,
            "sound": "default",
            "is_active": True,
            "recurring": False,
            "trigger_mode": "time",
            "trigger_time": 30
        }
        response = requests.post(f"{BASE_URL}/api/alarms", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate trigger_mode and trigger_time fields
        assert data["trigger_mode"] == "time", f"Expected 'time', got {data.get('trigger_mode')}"
        assert data["trigger_time"] == 30, f"Expected trigger_time=30, got {data.get('trigger_time')}"
        
        pytest.time_alarm_id = data["id"]
        print(f"✓ POST /api/alarms - created time alarm (30min): {data['id']}")
    
    def test_get_time_alarm_verify_fields(self):
        """GET /api/alarms/{id} - verify trigger_time is persisted correctly"""
        alarm_id = getattr(pytest, 'time_alarm_id', None)
        if not alarm_id:
            pytest.skip("No time alarm ID from previous test")
        
        response = requests.get(f"{BASE_URL}/api/alarms/{alarm_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert data["trigger_mode"] == "time"
        assert data["trigger_time"] == 30
        print(f"✓ GET /api/alarms/{alarm_id} - trigger_mode='time', trigger_time=30 persisted")
    
    def test_create_time_alarm_45min(self):
        """POST /api/alarms with trigger_time=45 - verify different time values"""
        payload = {
            "name": "TEST_Time_Alarm_45min",
            "latitude": 17.3850,
            "longitude": 78.4867,
            "radius": 500,
            "sound": "default",
            "is_active": True,
            "recurring": False,
            "trigger_mode": "time",
            "trigger_time": 45
        }
        response = requests.post(f"{BASE_URL}/api/alarms", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["trigger_mode"] == "time"
        assert data["trigger_time"] == 45
        
        pytest.time_alarm_45_id = data["id"]
        print(f"✓ POST /api/alarms - created time alarm (45min): {data['id']}")


class TestUpdateTriggerMode:
    """Test updating alarm trigger mode"""
    
    def test_update_distance_to_time(self):
        """PUT /api/alarms/{id} - change from distance to time mode"""
        alarm_id = getattr(pytest, 'distance_alarm_id', None)
        if not alarm_id:
            pytest.skip("No distance alarm ID from previous test")
        
        payload = {
            "trigger_mode": "time",
            "trigger_time": 15
        }
        response = requests.put(f"{BASE_URL}/api/alarms/{alarm_id}", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["trigger_mode"] == "time"
        assert data["trigger_time"] == 15
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/alarms/{alarm_id}")
        get_data = get_response.json()
        assert get_data["trigger_mode"] == "time"
        assert get_data["trigger_time"] == 15
        print(f"✓ PUT /api/alarms/{alarm_id} - updated to time mode (15min)")
    
    def test_update_time_to_distance(self):
        """PUT /api/alarms/{id} - change from time to distance mode"""
        alarm_id = getattr(pytest, 'time_alarm_id', None)
        if not alarm_id:
            pytest.skip("No time alarm ID from previous test")
        
        payload = {
            "trigger_mode": "distance",
            "radius": 2000
        }
        response = requests.put(f"{BASE_URL}/api/alarms/{alarm_id}", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["trigger_mode"] == "distance"
        assert data["radius"] == 2000
        print(f"✓ PUT /api/alarms/{alarm_id} - updated to distance mode (2000m)")


class TestTripWithMixedModes:
    """Test trip with waypoints using different trigger modes"""
    
    def test_create_trip(self):
        """POST /api/trips - create trip for mixed mode testing"""
        payload = {
            "name": "TEST_Mixed_Mode_Trip",
            "description": "Bangalore→Kurnool(time)→Hyderabad(distance)",
            "start_location": "Bangalore",
            "end_location": "Hyderabad"
        }
        response = requests.post(f"{BASE_URL}/api/trips", json=payload)
        assert response.status_code == 200
        pytest.mixed_trip_id = response.json()["id"]
        print(f"✓ POST /api/trips - created mixed mode trip: {pytest.mixed_trip_id}")
    
    def test_create_trip_waypoints_mixed_modes(self):
        """POST /api/alarms - create waypoints with Distance and Time modes"""
        trip_id = getattr(pytest, 'mixed_trip_id', None)
        if not trip_id:
            pytest.skip("No trip ID from previous test")
        
        # Waypoint 1: Bangalore (start) - Distance mode
        wp1 = {
            "name": "Bangalore_Start",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "radius": 500,
            "is_active": True,
            "recurring": False,
            "trip_id": trip_id,
            "sequence": 1,
            "waypoint_type": "start",
            "trigger_mode": "distance"
        }
        
        # Waypoint 2: Kurnool (rest) - Time mode 30min
        wp2 = {
            "name": "Kurnool_Rest",
            "latitude": 15.8281,
            "longitude": 78.0373,
            "radius": 500,
            "is_active": True,
            "recurring": False,
            "trip_id": trip_id,
            "sequence": 2,
            "waypoint_type": "rest",
            "trigger_mode": "time",
            "trigger_time": 30
        }
        
        # Waypoint 3: Hyderabad (destination) - Distance mode 500m
        wp3 = {
            "name": "Hyderabad_Destination",
            "latitude": 17.3850,
            "longitude": 78.4867,
            "radius": 500,
            "is_active": True,
            "recurring": False,
            "trip_id": trip_id,
            "sequence": 3,
            "waypoint_type": "destination",
            "trigger_mode": "distance"
        }
        
        alarm_ids = []
        for wp in [wp1, wp2, wp3]:
            response = requests.post(f"{BASE_URL}/api/alarms", json=wp)
            assert response.status_code == 200
            alarm_ids.append(response.json()["id"])
        
        pytest.mixed_trip_alarm_ids = alarm_ids
        print(f"✓ Created 3 trip waypoints with mixed modes: {alarm_ids}")
    
    def test_get_trip_alarms_verify_modes(self):
        """GET /api/trips/{id}/alarms - verify each waypoint has correct trigger mode"""
        trip_id = getattr(pytest, 'mixed_trip_id', None)
        if not trip_id:
            pytest.skip("No trip ID from previous test")
        
        response = requests.get(f"{BASE_URL}/api/trips/{trip_id}/alarms")
        assert response.status_code == 200
        alarms = response.json()
        
        assert len(alarms) == 3, f"Expected 3 alarms, got {len(alarms)}"
        
        # Verify order and modes
        assert alarms[0]["waypoint_type"] == "start"
        assert alarms[0]["trigger_mode"] == "distance"
        
        assert alarms[1]["waypoint_type"] == "rest"
        assert alarms[1]["trigger_mode"] == "time"
        assert alarms[1]["trigger_time"] == 30
        
        assert alarms[2]["waypoint_type"] == "destination"
        assert alarms[2]["trigger_mode"] == "distance"
        
        print("✓ GET /api/trips/{id}/alarms - verified mixed trigger modes per waypoint")


class TestGetAlarmsIncludesTriggerFields:
    """Test that GET /api/alarms returns trigger_mode and trigger_time fields"""
    
    def test_list_alarms_has_trigger_fields(self):
        """GET /api/alarms - verify response includes trigger_mode and trigger_time"""
        response = requests.get(f"{BASE_URL}/api/alarms")
        assert response.status_code == 200
        alarms = response.json()
        
        # Should have alarms from previous tests
        assert len(alarms) > 0, "Expected some alarms to exist"
        
        for alarm in alarms:
            # Every alarm should have trigger_mode field
            assert "trigger_mode" in alarm, f"Alarm {alarm.get('id')} missing trigger_mode"
            assert alarm["trigger_mode"] in ["distance", "time"], f"Invalid trigger_mode: {alarm['trigger_mode']}"
            
            # trigger_time should be present (even if None for distance mode)
            assert "trigger_time" in alarm, f"Alarm {alarm.get('id')} missing trigger_time field"
        
        print(f"✓ GET /api/alarms - all {len(alarms)} alarms have trigger_mode/trigger_time fields")


class TestCleanupTriggerModeTests:
    """Cleanup test data"""
    
    def test_cleanup_distance_alarm(self):
        """DELETE distance mode test alarm"""
        alarm_id = getattr(pytest, 'distance_alarm_id', None)
        if alarm_id:
            requests.delete(f"{BASE_URL}/api/alarms/{alarm_id}")
            print(f"✓ Deleted distance alarm: {alarm_id}")
    
    def test_cleanup_time_alarm(self):
        """DELETE time mode test alarm"""
        alarm_id = getattr(pytest, 'time_alarm_id', None)
        if alarm_id:
            requests.delete(f"{BASE_URL}/api/alarms/{alarm_id}")
            print(f"✓ Deleted time alarm: {alarm_id}")
    
    def test_cleanup_time_alarm_45(self):
        """DELETE time mode 45min test alarm"""
        alarm_id = getattr(pytest, 'time_alarm_45_id', None)
        if alarm_id:
            requests.delete(f"{BASE_URL}/api/alarms/{alarm_id}")
            print(f"✓ Deleted time alarm 45min: {alarm_id}")
    
    def test_cleanup_mixed_trip(self):
        """DELETE mixed mode trip (cascade deletes alarms)"""
        trip_id = getattr(pytest, 'mixed_trip_id', None)
        if trip_id:
            requests.delete(f"{BASE_URL}/api/trips/{trip_id}")
            print(f"✓ Deleted mixed mode trip and alarms: {trip_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
