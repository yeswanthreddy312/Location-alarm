"""
Backend API tests for Location Alarm PWA - AlarmBuilder UI redesign
Tests: alarms, trips, geocode endpoints with trigger_mode support
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
assert BASE_URL, "REACT_APP_BACKEND_URL environment variable must be set"


class TestHealthAndBasics:
    """Basic health and connectivity tests"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ API root: {data['message']}")
    
    def test_get_alarms_empty(self):
        """Test GET /api/alarms returns empty list when DB clean"""
        response = requests.get(f"{BASE_URL}/api/alarms")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/alarms: {len(data)} alarms")
    
    def test_get_trips_empty(self):
        """Test GET /api/trips returns empty list when DB clean"""
        response = requests.get(f"{BASE_URL}/api/trips")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/trips: {len(data)} trips")


class TestSingleAlarmCRUD:
    """Single alarm creation/update/delete - simulates AlarmBuilder 'Save Alarm' flow"""
    
    def test_create_distance_alarm(self):
        """Create alarm with distance trigger mode (default)"""
        payload = {
            "name": "TEST_Bangalore_Distance",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "radius": 1000,
            "sound": "default",
            "is_active": True,
            "recurring": False,
            "trigger_mode": "distance"
        }
        response = requests.post(f"{BASE_URL}/api/alarms", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "TEST_Bangalore_Distance"
        assert data["trigger_mode"] == "distance"
        assert data["radius"] == 1000
        assert "id" in data
        print(f"✓ Created distance alarm: {data['id']}")
        
        # Verify via GET
        get_resp = requests.get(f"{BASE_URL}/api/alarms/{data['id']}")
        assert get_resp.status_code == 200
        fetched = get_resp.json()
        assert fetched["trigger_mode"] == "distance"
        
        # Cleanup
        del_resp = requests.delete(f"{BASE_URL}/api/alarms/{data['id']}")
        assert del_resp.status_code == 200
    
    def test_create_time_alarm(self):
        """Create alarm with time trigger mode"""
        payload = {
            "name": "TEST_Hyderabad_Time",
            "latitude": 17.385,
            "longitude": 78.4867,
            "radius": 500,
            "sound": "default",
            "is_active": True,
            "recurring": False,
            "trigger_mode": "time",
            "trigger_time": 30
        }
        response = requests.post(f"{BASE_URL}/api/alarms", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "TEST_Hyderabad_Time"
        assert data["trigger_mode"] == "time"
        assert data["trigger_time"] == 30
        print(f"✓ Created time alarm: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/alarms/{data['id']}")
    
    def test_update_alarm_trigger_mode(self):
        """Update alarm from distance to time mode"""
        # Create
        create_resp = requests.post(f"{BASE_URL}/api/alarms", json={
            "name": "TEST_Update_Mode",
            "latitude": 15.5,
            "longitude": 78.5,
            "radius": 500,
            "trigger_mode": "distance"
        })
        alarm_id = create_resp.json()["id"]
        
        # Update to time mode
        update_resp = requests.put(f"{BASE_URL}/api/alarms/{alarm_id}", json={
            "trigger_mode": "time",
            "trigger_time": 45
        })
        assert update_resp.status_code == 200
        updated = update_resp.json()
        assert updated["trigger_mode"] == "time"
        assert updated["trigger_time"] == 45
        print(f"✓ Updated alarm to time mode: {alarm_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/alarms/{alarm_id}")


class TestTripWithMultipleStops:
    """Trip creation with multiple stops - simulates AlarmBuilder 'Save Trip' flow"""
    
    @pytest.fixture(autouse=True)
    def setup_teardown(self):
        """Setup and teardown for trip tests"""
        self.created_trip_id = None
        self.created_alarm_ids = []
        yield
        # Cleanup
        for alarm_id in self.created_alarm_ids:
            requests.delete(f"{BASE_URL}/api/alarms/{alarm_id}")
        if self.created_trip_id:
            requests.delete(f"{BASE_URL}/api/trips/{self.created_trip_id}")
    
    def test_create_trip_with_three_stops(self):
        """
        Test creating a trip with 3 stops: Bangalore → Kurnool → Hyderabad
        This mimics the AlarmBuilder flow where user:
        1. Sets destination (Hyderabad)
        2. Adds waypoint (Kurnool) - inserted before destination
        3. Adds another waypoint (Bangalore) - inserted before Kurnool
        """
        # 1. Create trip
        trip_payload = {
            "name": "TEST_Bangalore to Hyderabad",
            "description": None,
            "start_location": "Bangalore",
            "end_location": "Hyderabad"
        }
        trip_resp = requests.post(f"{BASE_URL}/api/trips", json=trip_payload)
        assert trip_resp.status_code == 200
        trip = trip_resp.json()
        self.created_trip_id = trip["id"]
        print(f"✓ Created trip: {trip['name']} ({trip['id']})")
        
        # 2. Create stops in sequence order
        stops = [
            {"name": "Bangalore", "lat": 12.9716, "lng": 77.5946, "trigger_mode": "time", "trigger_time": 15, "seq": 1, "type": "stop"},
            {"name": "Kurnool", "lat": 15.8281, "lng": 78.0373, "trigger_mode": "distance", "radius": 500, "seq": 2, "type": "stop"},
            {"name": "Hyderabad", "lat": 17.385, "lng": 78.4867, "trigger_mode": "time", "trigger_time": 30, "seq": 3, "type": "destination"},
        ]
        
        for stop in stops:
            alarm_payload = {
                "name": stop["name"],
                "latitude": stop["lat"],
                "longitude": stop["lng"],
                "radius": stop.get("radius", 500),
                "sound": "default",
                "is_active": True,
                "recurring": False,
                "trip_id": self.created_trip_id,
                "sequence": stop["seq"],
                "waypoint_type": stop["type"],
                "trigger_mode": stop["trigger_mode"],
                "trigger_time": stop.get("trigger_time")
            }
            alarm_resp = requests.post(f"{BASE_URL}/api/alarms", json=alarm_payload)
            assert alarm_resp.status_code == 200
            alarm = alarm_resp.json()
            self.created_alarm_ids.append(alarm["id"])
            print(f"  ✓ Created stop {stop['seq']}: {stop['name']} ({stop['trigger_mode']})")
        
        # 3. Verify trip alarms
        trip_alarms_resp = requests.get(f"{BASE_URL}/api/trips/{self.created_trip_id}/alarms")
        assert trip_alarms_resp.status_code == 200
        trip_alarms = trip_alarms_resp.json()
        
        assert len(trip_alarms) == 3
        assert trip_alarms[0]["name"] == "Bangalore"
        assert trip_alarms[0]["trigger_mode"] == "time"
        assert trip_alarms[0]["trigger_time"] == 15
        assert trip_alarms[1]["name"] == "Kurnool"
        assert trip_alarms[1]["trigger_mode"] == "distance"
        assert trip_alarms[2]["name"] == "Hyderabad"
        assert trip_alarms[2]["trigger_mode"] == "time"
        assert trip_alarms[2]["trigger_time"] == 30
        print(f"✓ Trip has 3 stops in correct order with correct trigger modes")
    
    def test_update_waypoint_trigger_mode(self):
        """Test updating a waypoint's trigger mode (simulates tapping stop row to edit)"""
        # Create trip and one alarm
        trip_resp = requests.post(f"{BASE_URL}/api/trips", json={
            "name": "TEST_Edit_Waypoint_Trip",
            "start_location": "A",
            "end_location": "B"
        })
        self.created_trip_id = trip_resp.json()["id"]
        
        alarm_resp = requests.post(f"{BASE_URL}/api/alarms", json={
            "name": "TEST_Kurnool",
            "latitude": 15.8281,
            "longitude": 78.0373,
            "radius": 500,
            "trip_id": self.created_trip_id,
            "sequence": 1,
            "waypoint_type": "stop",
            "trigger_mode": "distance"
        })
        alarm_id = alarm_resp.json()["id"]
        self.created_alarm_ids.append(alarm_id)
        
        # Update trigger mode from distance to time
        update_resp = requests.put(f"{BASE_URL}/api/alarms/{alarm_id}", json={
            "trigger_mode": "time",
            "trigger_time": 45
        })
        assert update_resp.status_code == 200
        updated = update_resp.json()
        assert updated["trigger_mode"] == "time"
        assert updated["trigger_time"] == 45
        print(f"✓ Updated waypoint trigger mode: distance → time (45 min)")


class TestGeocodeEndpoints:
    """Test geocoding endpoints used by AlarmBuilder search"""
    
    def test_geocode_search(self):
        """Test geocode search for Bangalore"""
        response = requests.get(f"{BASE_URL}/api/geocode", params={"q": "Bangalore", "limit": 5})
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert len(data["results"]) > 0
        result = data["results"][0]
        assert "lat" in result
        assert "lon" in result
        assert "display_name" in result
        print(f"✓ Geocode 'Bangalore': {result['display_name'][:50]}...")
    
    def test_geocode_with_user_location(self):
        """Test geocode search biased by user location"""
        response = requests.get(f"{BASE_URL}/api/geocode", params={
            "q": "station",
            "limit": 5,
            "lat": 12.9716,
            "lon": 77.5946
        })
        assert response.status_code == 200
        data = response.json()
        # May or may not find results depending on data
        assert "success" in data
        print(f"✓ Geocode with location bias: success={data['success']}")
    
    def test_reverse_geocode(self):
        """Test reverse geocode for Bangalore coordinates"""
        response = requests.get(f"{BASE_URL}/api/reverse-geocode", params={
            "lat": 12.9716,
            "lon": 77.5946
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "display_name" in data
        print(f"✓ Reverse geocode: {data['display_name'][:50]}...")


class TestAlarmListAndTrips:
    """Test GET endpoints that populate UI lists"""
    
    def test_get_all_alarms_with_trigger_fields(self):
        """Ensure GET /api/alarms returns trigger_mode and trigger_time"""
        # Create test alarm
        create_resp = requests.post(f"{BASE_URL}/api/alarms", json={
            "name": "TEST_Trigger_Fields",
            "latitude": 17.0,
            "longitude": 78.0,
            "radius": 500,
            "trigger_mode": "time",
            "trigger_time": 25
        })
        alarm_id = create_resp.json()["id"]
        
        # Get all alarms
        get_resp = requests.get(f"{BASE_URL}/api/alarms")
        assert get_resp.status_code == 200
        alarms = get_resp.json()
        
        # Find our alarm
        test_alarm = next((a for a in alarms if a["id"] == alarm_id), None)
        assert test_alarm is not None
        assert "trigger_mode" in test_alarm
        assert "trigger_time" in test_alarm
        assert test_alarm["trigger_mode"] == "time"
        assert test_alarm["trigger_time"] == 25
        print(f"✓ GET /api/alarms includes trigger_mode and trigger_time")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/alarms/{alarm_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
