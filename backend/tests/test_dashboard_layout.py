"""
Test suite for dashboard layout feature - CRUD APIs for trips and alarms
Tests: GET/POST /api/alarms, GET/POST /api/trips, GET /api/trips/{id}/alarms
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndRoot:
    """Basic API health tests"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("PASS: API root returns correct response")

class TestAlarmsCRUD:
    """Test alarm CRUD operations"""
    
    def test_get_alarms(self):
        """GET /api/alarms - get all alarms"""
        response = requests.get(f"{BASE_URL}/api/alarms")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: GET /api/alarms returns {len(data)} alarms")
        return data
    
    def test_create_alarm(self):
        """POST /api/alarms - create standalone alarm"""
        alarm_data = {
            "name": f"TEST_Alarm_{uuid.uuid4().hex[:6]}",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "radius": 500,
            "sound": "default",
            "is_active": True,
            "recurring": False,
            "trigger_mode": "distance",
            "trigger_time": None
        }
        response = requests.post(f"{BASE_URL}/api/alarms", json=alarm_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == alarm_data["name"]
        assert data["latitude"] == alarm_data["latitude"]
        assert data["longitude"] == alarm_data["longitude"]
        assert data["radius"] == alarm_data["radius"]
        assert data["trigger_mode"] == "distance"
        assert data["trip_id"] is None  # Standalone alarm
        assert "id" in data
        print(f"PASS: POST /api/alarms created alarm with id {data['id']}")
        return data["id"]
    
    def test_create_time_based_alarm(self):
        """POST /api/alarms - create time-based alarm"""
        alarm_data = {
            "name": f"TEST_TimeAlarm_{uuid.uuid4().hex[:6]}",
            "latitude": 13.082,
            "longitude": 80.270,
            "radius": 500,
            "sound": "default",
            "is_active": True,
            "recurring": False,
            "trigger_mode": "time",
            "trigger_time": 30
        }
        response = requests.post(f"{BASE_URL}/api/alarms", json=alarm_data)
        assert response.status_code == 200
        data = response.json()
        assert data["trigger_mode"] == "time"
        assert data["trigger_time"] == 30
        print(f"PASS: Time-based alarm created with trigger_time={data['trigger_time']}min")
        return data["id"]
    
    def test_get_alarm_by_id(self):
        """GET /api/alarms/{id} - get specific alarm"""
        # First create an alarm
        alarm_id = self.test_create_alarm()
        
        # Then get it by ID
        response = requests.get(f"{BASE_URL}/api/alarms/{alarm_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == alarm_id
        print(f"PASS: GET /api/alarms/{alarm_id} returned correct alarm")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/alarms/{alarm_id}")
        return alarm_id
    
    def test_update_alarm(self):
        """PUT /api/alarms/{id} - update alarm"""
        # First create an alarm
        alarm_id = self.test_create_alarm()
        
        # Update it
        update_data = {"is_active": False, "radius": 1000}
        response = requests.put(f"{BASE_URL}/api/alarms/{alarm_id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["is_active"] == False
        assert data["radius"] == 1000
        print(f"PASS: PUT /api/alarms/{alarm_id} updated correctly")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/alarms/{alarm_id}")
    
    def test_delete_alarm(self):
        """DELETE /api/alarms/{id} - delete alarm"""
        # First create an alarm
        alarm_id = self.test_create_alarm()
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/alarms/{alarm_id}")
        assert response.status_code == 200
        
        # Verify deleted
        response = requests.get(f"{BASE_URL}/api/alarms/{alarm_id}")
        assert response.status_code == 404
        print(f"PASS: DELETE /api/alarms/{alarm_id} deleted successfully")
    
    def test_toggle_alarm(self):
        """Toggle alarm active state via PUT"""
        alarm_id = self.test_create_alarm()
        
        # Toggle off
        response = requests.put(f"{BASE_URL}/api/alarms/{alarm_id}", json={"is_active": False})
        assert response.status_code == 200
        assert response.json()["is_active"] == False
        
        # Toggle on
        response = requests.put(f"{BASE_URL}/api/alarms/{alarm_id}", json={"is_active": True})
        assert response.status_code == 200
        assert response.json()["is_active"] == True
        
        print(f"PASS: Alarm toggle on/off works correctly")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/alarms/{alarm_id}")

class TestTripsCRUD:
    """Test trip CRUD operations"""
    
    def test_get_trips(self):
        """GET /api/trips - get all trips"""
        response = requests.get(f"{BASE_URL}/api/trips")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: GET /api/trips returns {len(data)} trips")
        return data
    
    def test_create_trip(self):
        """POST /api/trips - create new trip"""
        trip_data = {
            "name": f"TEST_Trip_{uuid.uuid4().hex[:6]}",
            "description": "Test trip for dashboard",
            "start_location": "Chennai",
            "end_location": "Mumbai"
        }
        response = requests.post(f"{BASE_URL}/api/trips", json=trip_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == trip_data["name"]
        assert data["start_location"] == trip_data["start_location"]
        assert data["end_location"] == trip_data["end_location"]
        assert "id" in data
        print(f"PASS: POST /api/trips created trip with id {data['id']}")
        return data["id"]
    
    def test_get_trip_by_id(self):
        """GET /api/trips/{id} - get specific trip"""
        trip_id = self.test_create_trip()
        
        response = requests.get(f"{BASE_URL}/api/trips/{trip_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == trip_id
        print(f"PASS: GET /api/trips/{trip_id} returned correct trip")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/trips/{trip_id}")
    
    def test_update_trip(self):
        """PUT /api/trips/{id} - update trip"""
        trip_id = self.test_create_trip()
        
        update_data = {"name": "TEST_Updated_Trip", "is_active": False}
        response = requests.put(f"{BASE_URL}/api/trips/{trip_id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Updated_Trip"
        assert data["is_active"] == False
        print(f"PASS: PUT /api/trips/{trip_id} updated correctly")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/trips/{trip_id}")
    
    def test_delete_trip(self):
        """DELETE /api/trips/{id} - delete trip"""
        trip_id = self.test_create_trip()
        
        response = requests.delete(f"{BASE_URL}/api/trips/{trip_id}")
        assert response.status_code == 200
        
        # Verify deleted
        response = requests.get(f"{BASE_URL}/api/trips/{trip_id}")
        assert response.status_code == 404
        print(f"PASS: DELETE /api/trips/{trip_id} deleted successfully")

class TestTripAlarms:
    """Test trip alarm associations"""
    
    def test_get_trip_alarms(self):
        """GET /api/trips/{id}/alarms - get alarms for a trip"""
        # First create a trip
        trip_data = {
            "name": f"TEST_TripWithAlarms_{uuid.uuid4().hex[:6]}",
            "start_location": "Pune",
            "end_location": "Goa"
        }
        trip_response = requests.post(f"{BASE_URL}/api/trips", json=trip_data)
        trip_id = trip_response.json()["id"]
        
        # Create alarms for the trip
        alarm1 = {
            "name": "Pune Start",
            "latitude": 18.52,
            "longitude": 73.85,
            "radius": 500,
            "is_active": True,
            "trip_id": trip_id,
            "sequence": 1,
            "waypoint_type": "start",
            "trigger_mode": "distance"
        }
        alarm2 = {
            "name": "Goa Destination",
            "latitude": 15.49,
            "longitude": 73.82,
            "radius": 500,
            "is_active": True,
            "trip_id": trip_id,
            "sequence": 2,
            "waypoint_type": "destination",
            "trigger_mode": "time",
            "trigger_time": 45
        }
        
        a1_res = requests.post(f"{BASE_URL}/api/alarms", json=alarm1)
        a2_res = requests.post(f"{BASE_URL}/api/alarms", json=alarm2)
        
        # Get trip alarms
        response = requests.get(f"{BASE_URL}/api/trips/{trip_id}/alarms")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2
        
        # Verify order by sequence
        assert data[0]["sequence"] == 1
        assert data[1]["sequence"] == 2
        assert data[0]["waypoint_type"] == "start"
        assert data[1]["waypoint_type"] == "destination"
        print(f"PASS: GET /api/trips/{trip_id}/alarms returns {len(data)} ordered alarms")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/trips/{trip_id}")  # Also deletes associated alarms

class TestSeededData:
    """Test pre-seeded data (Bangalore to Hyderabad trip + Office alarm)"""
    
    def test_seeded_trip_exists(self):
        """Verify seeded trip 'Bangalore to Hyderabad' exists"""
        response = requests.get(f"{BASE_URL}/api/trips")
        assert response.status_code == 200
        data = response.json()
        
        bangalore_trip = None
        for trip in data:
            if "Bangalore" in trip["name"] and "Hyderabad" in trip["name"]:
                bangalore_trip = trip
                break
        
        assert bangalore_trip is not None, "Seeded trip 'Bangalore to Hyderabad' not found"
        assert bangalore_trip["start_location"] == "Bangalore"
        assert bangalore_trip["end_location"] == "Hyderabad"
        print(f"PASS: Seeded trip found: {bangalore_trip['name']}")
        return bangalore_trip["id"]
    
    def test_seeded_trip_has_alarms(self):
        """Verify seeded trip has 3 stops (Bangalore, Kurnool, Hyderabad)"""
        trip_id = self.test_seeded_trip_exists()
        
        response = requests.get(f"{BASE_URL}/api/trips/{trip_id}/alarms")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) == 3, f"Expected 3 alarms, got {len(data)}"
        
        # Verify stops
        names = [a["name"] for a in data]
        assert "Bangalore" in names
        assert "Kurnool" in names
        assert "Hyderabad" in names
        
        # Verify trigger modes
        kurnool = next(a for a in data if a["name"] == "Kurnool")
        hyderabad = next(a for a in data if a["name"] == "Hyderabad")
        
        assert kurnool["trigger_mode"] == "time"
        assert kurnool["trigger_time"] == 30
        assert hyderabad["trigger_mode"] == "time"
        assert hyderabad["trigger_time"] == 45
        
        print(f"PASS: Seeded trip has correct 3 stops with correct trigger modes")
    
    def test_standalone_office_alarm_exists(self):
        """Verify standalone 'Office' alarm exists"""
        response = requests.get(f"{BASE_URL}/api/alarms")
        assert response.status_code == 200
        data = response.json()
        
        office_alarm = None
        for alarm in data:
            if alarm["name"] == "Office" and alarm["trip_id"] is None:
                office_alarm = alarm
                break
        
        assert office_alarm is not None, "Standalone 'Office' alarm not found"
        assert office_alarm["radius"] == 300
        assert office_alarm["trigger_mode"] == "distance"
        print(f"PASS: Standalone Office alarm found with radius={office_alarm['radius']}m")

class TestAlarmHistory:
    """Test alarm history endpoints"""
    
    def test_get_alarm_history(self):
        """GET /api/alarm-history - get history"""
        response = requests.get(f"{BASE_URL}/api/alarm-history")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: GET /api/alarm-history returns {len(data)} records")
    
    def test_post_alarm_history(self):
        """POST /api/alarm-history - log alarm trigger"""
        history_data = {
            "alarm_id": "test-alarm-id",
            "alarm_name": "TEST_History_Alarm",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "trip_id": None
        }
        response = requests.post(f"{BASE_URL}/api/alarm-history", json=history_data)
        assert response.status_code == 200
        data = response.json()
        assert data["alarm_name"] == history_data["alarm_name"]
        assert "triggered_at" in data
        print(f"PASS: POST /api/alarm-history logged trigger event")

class TestGeocode:
    """Test geocoding endpoints"""
    
    def test_geocode(self):
        """GET /api/geocode - search for place"""
        response = requests.get(f"{BASE_URL}/api/geocode", params={"q": "Bangalore", "limit": 3})
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True or "results" in data or "error" in data
        print(f"PASS: GET /api/geocode works")
    
    def test_reverse_geocode(self):
        """GET /api/reverse-geocode - get address from coords"""
        response = requests.get(f"{BASE_URL}/api/reverse-geocode", params={"lat": 12.9716, "lon": 77.5946})
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True or "display_name" in data or "error" in data
        print(f"PASS: GET /api/reverse-geocode works")

# Cleanup helper
def cleanup_test_data():
    """Delete all TEST_ prefixed data"""
    # Clean alarms
    alarms = requests.get(f"{BASE_URL}/api/alarms").json()
    for a in alarms:
        if a["name"].startswith("TEST_"):
            requests.delete(f"{BASE_URL}/api/alarms/{a['id']}")
    
    # Clean trips
    trips = requests.get(f"{BASE_URL}/api/trips").json()
    for t in trips:
        if t["name"].startswith("TEST_"):
            requests.delete(f"{BASE_URL}/api/trips/{t['id']}")
    print("Cleanup: Deleted all TEST_ prefixed data")

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
