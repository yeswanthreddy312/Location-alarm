"""
Test CRUD APIs for Location Alarm PWA after refactoring
Tests: Alarms CRUD, Trips CRUD, Alarm History, Geocode, Reverse Geocode
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAlarmsCRUD:
    """Test Alarm CRUD operations - GET/POST /api/alarms, PUT/DELETE /api/alarms/{id}"""
    
    def test_get_alarms_empty(self):
        """GET /api/alarms - should return empty list when no alarms"""
        response = requests.get(f"{BASE_URL}/api/alarms")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"GET /api/alarms - returned {len(data)} alarms")
    
    def test_create_alarm(self):
        """POST /api/alarms - create a single alarm for Bangalore"""
        payload = {
            "name": "TEST_Bangalore_Single",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "radius": 500,
            "sound": "default",
            "is_active": True,
            "recurring": False
        }
        response = requests.post(f"{BASE_URL}/api/alarms", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "id" in data
        assert data["name"] == payload["name"]
        assert data["latitude"] == payload["latitude"]
        assert data["longitude"] == payload["longitude"]
        assert data["radius"] == payload["radius"]
        assert data["is_active"] == True
        
        # Store ID for later tests
        pytest.alarm_id = data["id"]
        print(f"POST /api/alarms - created alarm {data['id']}")
    
    def test_get_alarm_by_id(self):
        """GET /api/alarms/{id} - verify alarm was persisted"""
        alarm_id = getattr(pytest, 'alarm_id', None)
        if not alarm_id:
            pytest.skip("No alarm ID from previous test")
        
        response = requests.get(f"{BASE_URL}/api/alarms/{alarm_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == alarm_id
        assert data["name"] == "TEST_Bangalore_Single"
        print(f"GET /api/alarms/{alarm_id} - verified alarm exists")
    
    def test_update_alarm(self):
        """PUT /api/alarms/{id} - update alarm status"""
        alarm_id = getattr(pytest, 'alarm_id', None)
        if not alarm_id:
            pytest.skip("No alarm ID from previous test")
        
        payload = {"is_active": False, "radius": 1000}
        response = requests.put(f"{BASE_URL}/api/alarms/{alarm_id}", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["is_active"] == False
        assert data["radius"] == 1000
        
        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/alarms/{alarm_id}")
        assert get_response.json()["is_active"] == False
        print(f"PUT /api/alarms/{alarm_id} - updated successfully")


class TestTripsCRUD:
    """Test Trip CRUD operations - GET/POST /api/trips, PUT/DELETE /api/trips/{id}"""
    
    def test_get_trips_empty(self):
        """GET /api/trips - should return empty list when no trips"""
        response = requests.get(f"{BASE_URL}/api/trips")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"GET /api/trips - returned {len(data)} trips")
    
    def test_create_trip(self):
        """POST /api/trips - create Bangalore to Hyderabad trip"""
        payload = {
            "name": "TEST_Bangalore to Hyderabad",
            "description": "Bus journey with waypoint at Kurnool",
            "start_location": "Bangalore",
            "end_location": "Hyderabad"
        }
        response = requests.post(f"{BASE_URL}/api/trips", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "id" in data
        assert data["name"] == payload["name"]
        assert data["description"] == payload["description"]
        assert data["start_location"] == payload["start_location"]
        assert data["end_location"] == payload["end_location"]
        assert data["is_active"] == True
        
        # Store ID for later tests
        pytest.trip_id = data["id"]
        print(f"POST /api/trips - created trip {data['id']}")
    
    def test_get_trip_by_id(self):
        """GET /api/trips/{id} - verify trip was persisted"""
        trip_id = getattr(pytest, 'trip_id', None)
        if not trip_id:
            pytest.skip("No trip ID from previous test")
        
        response = requests.get(f"{BASE_URL}/api/trips/{trip_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == trip_id
        assert data["name"] == "TEST_Bangalore to Hyderabad"
        print(f"GET /api/trips/{trip_id} - verified trip exists")
    
    def test_update_trip(self):
        """PUT /api/trips/{id} - update trip"""
        trip_id = getattr(pytest, 'trip_id', None)
        if not trip_id:
            pytest.skip("No trip ID from previous test")
        
        payload = {"description": "Updated bus journey description"}
        response = requests.put(f"{BASE_URL}/api/trips/{trip_id}", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["description"] == payload["description"]
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/trips/{trip_id}")
        assert get_response.json()["description"] == payload["description"]
        print(f"PUT /api/trips/{trip_id} - updated successfully")
    
    def test_create_trip_alarms(self):
        """POST /api/alarms - create 3 alarms for the trip (Bangalore, Kurnool, Hyderabad)"""
        trip_id = getattr(pytest, 'trip_id', None)
        if not trip_id:
            pytest.skip("No trip ID from previous test")
        
        waypoints = [
            {"name": "Bangalore", "lat": 12.9716, "lon": 77.5946, "type": "start", "seq": 1},
            {"name": "Kurnool", "lat": 15.8281, "lon": 78.0373, "type": "rest", "seq": 2},
            {"name": "Hyderabad", "lat": 17.3850, "lon": 78.4867, "type": "destination", "seq": 3}
        ]
        
        alarm_ids = []
        for wp in waypoints:
            payload = {
                "name": f"TEST_{wp['name']}",
                "latitude": wp["lat"],
                "longitude": wp["lon"],
                "radius": 500,
                "sound": "default",
                "is_active": True,
                "recurring": False,
                "trip_id": trip_id,
                "sequence": wp["seq"],
                "waypoint_type": wp["type"]
            }
            response = requests.post(f"{BASE_URL}/api/alarms", json=payload)
            assert response.status_code == 200
            alarm_ids.append(response.json()["id"])
        
        pytest.trip_alarm_ids = alarm_ids
        print(f"Created 3 trip alarms: {alarm_ids}")
    
    def test_get_trip_alarms(self):
        """GET /api/trips/{id}/alarms - get alarms for trip"""
        trip_id = getattr(pytest, 'trip_id', None)
        if not trip_id:
            pytest.skip("No trip ID from previous test")
        
        response = requests.get(f"{BASE_URL}/api/trips/{trip_id}/alarms")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 3
        
        # Verify order by sequence
        assert data[0]["waypoint_type"] == "start"
        assert data[1]["waypoint_type"] == "rest"
        assert data[2]["waypoint_type"] == "destination"
        print(f"GET /api/trips/{trip_id}/alarms - returned 3 ordered alarms")


class TestAlarmHistory:
    """Test Alarm History APIs - GET/POST /api/alarm-history"""
    
    def test_get_history_empty(self):
        """GET /api/alarm-history - should return empty or existing history"""
        response = requests.get(f"{BASE_URL}/api/alarm-history")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"GET /api/alarm-history - returned {len(data)} records")
    
    def test_log_alarm_trigger(self):
        """POST /api/alarm-history - log an alarm trigger"""
        alarm_id = getattr(pytest, 'alarm_id', None)
        if not alarm_id:
            alarm_id = "test-alarm-id"
        
        payload = {
            "alarm_id": alarm_id,
            "alarm_name": "TEST_History_Entry",
            "latitude": 12.9716,
            "longitude": 77.5946
        }
        response = requests.post(f"{BASE_URL}/api/alarm-history", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["alarm_name"] == payload["alarm_name"]
        assert "triggered_at" in data
        
        pytest.history_id = data["id"]
        print(f"POST /api/alarm-history - logged trigger {data['id']}")
    
    def test_get_history_after_log(self):
        """GET /api/alarm-history - verify history was logged"""
        response = requests.get(f"{BASE_URL}/api/alarm-history")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        
        # Check latest entry
        latest = data[0]
        assert latest["alarm_name"] == "TEST_History_Entry"
        print(f"GET /api/alarm-history - verified history entry")


class TestGeocodeAPIs:
    """Test Geocode and Reverse Geocode APIs"""
    
    def test_geocode_bangalore(self):
        """GET /api/geocode - search for Bangalore"""
        time.sleep(1)  # Rate limit protection
        response = requests.get(f"{BASE_URL}/api/geocode", params={"q": "Bangalore", "limit": 5})
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "results" in data
        assert len(data["results"]) > 0
        
        # Check first result has required fields
        result = data["results"][0]
        assert "lat" in result
        assert "lon" in result
        assert "display_name" in result
        print(f"GET /api/geocode?q=Bangalore - returned {len(data['results'])} results")
    
    def test_geocode_with_gps_bias(self):
        """GET /api/geocode - search with GPS location bias"""
        time.sleep(1)  # Rate limit protection
        params = {"q": "Koramangala", "limit": 5, "lat": 12.9716, "lon": 77.5946}
        response = requests.get(f"{BASE_URL}/api/geocode", params=params)
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "results" in data
        print(f"GET /api/geocode with GPS bias - returned {len(data.get('results', []))} results")
    
    def test_reverse_geocode(self):
        """GET /api/reverse-geocode - reverse geocode Bangalore coordinates"""
        time.sleep(1)  # Rate limit protection
        response = requests.get(f"{BASE_URL}/api/reverse-geocode", params={"lat": 12.9716, "lon": 77.5946})
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "display_name" in data
        assert len(data["display_name"]) > 0
        print(f"GET /api/reverse-geocode - returned: {data['display_name'][:50]}...")


class TestCleanup:
    """Cleanup test data - run last"""
    
    def test_delete_alarm(self):
        """DELETE /api/alarms/{id} - delete test alarm"""
        alarm_id = getattr(pytest, 'alarm_id', None)
        if not alarm_id:
            pytest.skip("No alarm to delete")
        
        response = requests.delete(f"{BASE_URL}/api/alarms/{alarm_id}")
        assert response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/alarms/{alarm_id}")
        assert get_response.status_code == 404
        print(f"DELETE /api/alarms/{alarm_id} - deleted successfully")
    
    def test_delete_trip(self):
        """DELETE /api/trips/{id} - delete test trip (should also delete trip alarms)"""
        trip_id = getattr(pytest, 'trip_id', None)
        if not trip_id:
            pytest.skip("No trip to delete")
        
        response = requests.delete(f"{BASE_URL}/api/trips/{trip_id}")
        assert response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/trips/{trip_id}")
        assert get_response.status_code == 404
        
        # Verify trip alarms were also deleted
        alarms_response = requests.get(f"{BASE_URL}/api/trips/{trip_id}/alarms")
        assert alarms_response.status_code == 200
        assert len(alarms_response.json()) == 0
        print(f"DELETE /api/trips/{trip_id} - deleted trip and alarms successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
