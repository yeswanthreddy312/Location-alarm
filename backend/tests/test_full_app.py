"""
Comprehensive test suite for Location-based alarm PWA
Testing: All CRUD APIs, Geocoding, Trip flow, Trigger modes
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndRoot:
    """Basic API health checks"""
    
    def test_api_root(self):
        """GET /api/ - API root responds"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ API root: {data['message']}")

class TestAlarmsCRUD:
    """Alarm CRUD operations - GET/POST/PUT/DELETE"""
    
    def test_get_alarms_initially_empty(self):
        """GET /api/alarms - returns empty list initially"""
        response = requests.get(f"{BASE_URL}/api/alarms")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/alarms returns list: {len(data)} alarms")

    def test_create_alarm_distance_mode(self):
        """POST /api/alarms with trigger_mode='distance'"""
        payload = {
            "name": "TEST_Distance_Alarm",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "radius": 500,
            "sound": "default",
            "is_active": True,
            "recurring": False,
            "trigger_mode": "distance",
            "trigger_time": None
        }
        response = requests.post(f"{BASE_URL}/api/alarms", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Distance_Alarm"
        assert data["trigger_mode"] == "distance"
        assert data["radius"] == 500
        assert "id" in data
        print(f"✓ Created distance-mode alarm: {data['id']}")
        
        # Verify persistence with GET
        get_resp = requests.get(f"{BASE_URL}/api/alarms/{data['id']}")
        assert get_resp.status_code == 200
        fetched = get_resp.json()
        assert fetched["trigger_mode"] == "distance"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/alarms/{data['id']}")

    def test_create_alarm_time_mode(self):
        """POST /api/alarms with trigger_mode='time', trigger_time=30"""
        payload = {
            "name": "TEST_Time_Alarm",
            "latitude": 17.3850,
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
        assert data["name"] == "TEST_Time_Alarm"
        assert data["trigger_mode"] == "time"
        assert data["trigger_time"] == 30
        print(f"✓ Created time-mode alarm: {data['id']}")
        
        # Verify persistence
        get_resp = requests.get(f"{BASE_URL}/api/alarms/{data['id']}")
        assert get_resp.status_code == 200
        fetched = get_resp.json()
        assert fetched["trigger_mode"] == "time"
        assert fetched["trigger_time"] == 30
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/alarms/{data['id']}")

    def test_update_alarm(self):
        """PUT /api/alarms/{id} - update alarm"""
        # Create first
        payload = {
            "name": "TEST_Update_Alarm",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "radius": 300,
            "trigger_mode": "distance"
        }
        create_resp = requests.post(f"{BASE_URL}/api/alarms", json=payload)
        alarm_id = create_resp.json()["id"]
        
        # Update
        update_payload = {"name": "TEST_Updated_Alarm", "radius": 800}
        update_resp = requests.put(f"{BASE_URL}/api/alarms/{alarm_id}", json=update_payload)
        assert update_resp.status_code == 200
        updated = update_resp.json()
        assert updated["name"] == "TEST_Updated_Alarm"
        assert updated["radius"] == 800
        print(f"✓ Updated alarm: {alarm_id}")
        
        # Verify with GET
        get_resp = requests.get(f"{BASE_URL}/api/alarms/{alarm_id}")
        assert get_resp.json()["radius"] == 800
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/alarms/{alarm_id}")

    def test_delete_alarm(self):
        """DELETE /api/alarms/{id} - delete alarm"""
        # Create first
        payload = {"name": "TEST_Delete_Alarm", "latitude": 12.9716, "longitude": 77.5946, "radius": 200}
        create_resp = requests.post(f"{BASE_URL}/api/alarms", json=payload)
        alarm_id = create_resp.json()["id"]
        
        # Delete
        del_resp = requests.delete(f"{BASE_URL}/api/alarms/{alarm_id}")
        assert del_resp.status_code == 200
        print(f"✓ Deleted alarm: {alarm_id}")
        
        # Verify deletion
        get_resp = requests.get(f"{BASE_URL}/api/alarms/{alarm_id}")
        assert get_resp.status_code == 404

    def test_alarm_not_found(self):
        """GET /api/alarms/{id} - returns 404 for non-existent"""
        response = requests.get(f"{BASE_URL}/api/alarms/nonexistent-id-123")
        assert response.status_code == 404
        print("✓ Non-existent alarm returns 404")


class TestTripsCRUD:
    """Trip CRUD operations"""
    
    def test_get_trips_initially_empty(self):
        """GET /api/trips - returns empty list initially"""
        response = requests.get(f"{BASE_URL}/api/trips")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/trips returns list: {len(data)} trips")

    def test_create_trip(self):
        """POST /api/trips - create new trip"""
        payload = {
            "name": "TEST_Bangalore to Hyderabad",
            "description": "Test trip",
            "start_location": "Bangalore",
            "end_location": "Hyderabad"
        }
        response = requests.post(f"{BASE_URL}/api/trips", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Bangalore to Hyderabad"
        assert data["start_location"] == "Bangalore"
        assert data["end_location"] == "Hyderabad"
        assert "id" in data
        print(f"✓ Created trip: {data['id']}")
        
        # Verify persistence
        get_resp = requests.get(f"{BASE_URL}/api/trips/{data['id']}")
        assert get_resp.status_code == 200
        assert get_resp.json()["name"] == "TEST_Bangalore to Hyderabad"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/trips/{data['id']}")

    def test_update_trip(self):
        """PUT /api/trips/{id} - update trip"""
        # Create
        payload = {"name": "TEST_Trip", "start_location": "A", "end_location": "B"}
        create_resp = requests.post(f"{BASE_URL}/api/trips", json=payload)
        trip_id = create_resp.json()["id"]
        
        # Update
        update_resp = requests.put(f"{BASE_URL}/api/trips/{trip_id}", json={"name": "TEST_Updated_Trip"})
        assert update_resp.status_code == 200
        assert update_resp.json()["name"] == "TEST_Updated_Trip"
        print(f"✓ Updated trip: {trip_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/trips/{trip_id}")

    def test_delete_trip_cascades_alarms(self):
        """DELETE /api/trips/{id} - deletes trip and associated alarms"""
        # Create trip
        trip_resp = requests.post(f"{BASE_URL}/api/trips", json={
            "name": "TEST_Cascade_Trip",
            "start_location": "X",
            "end_location": "Y"
        })
        trip_id = trip_resp.json()["id"]
        
        # Create alarm associated with trip
        alarm_resp = requests.post(f"{BASE_URL}/api/alarms", json={
            "name": "TEST_Trip_Alarm",
            "latitude": 12.97,
            "longitude": 77.59,
            "radius": 500,
            "trip_id": trip_id,
            "sequence": 1,
            "waypoint_type": "start"
        })
        alarm_id = alarm_resp.json()["id"]
        
        # Delete trip
        del_resp = requests.delete(f"{BASE_URL}/api/trips/{trip_id}")
        assert del_resp.status_code == 200
        print(f"✓ Deleted trip: {trip_id}")
        
        # Verify trip's alarms were also deleted
        alarm_get = requests.get(f"{BASE_URL}/api/alarms/{alarm_id}")
        assert alarm_get.status_code == 404
        print("✓ Associated alarms were cascade-deleted")

    def test_get_trip_alarms(self):
        """GET /api/trips/{id}/alarms - returns ordered alarms for trip"""
        # Create trip
        trip_resp = requests.post(f"{BASE_URL}/api/trips", json={
            "name": "TEST_Multi_Stop_Trip",
            "start_location": "Bangalore",
            "end_location": "Hyderabad"
        })
        trip_id = trip_resp.json()["id"]
        
        # Create alarms with different sequences
        for i, (name, seq, wp_type) in enumerate([
            ("Bangalore", 1, "start"),
            ("Kurnool", 2, "stop"),
            ("Hyderabad", 3, "destination")
        ]):
            requests.post(f"{BASE_URL}/api/alarms", json={
                "name": name,
                "latitude": 12.97 + i * 0.5,
                "longitude": 77.59 + i * 0.5,
                "radius": 500,
                "trip_id": trip_id,
                "sequence": seq,
                "waypoint_type": wp_type,
                "trigger_mode": "distance" if i < 2 else "time",
                "trigger_time": 45 if i == 2 else None
            })
        
        # Get trip alarms
        alarms_resp = requests.get(f"{BASE_URL}/api/trips/{trip_id}/alarms")
        assert alarms_resp.status_code == 200
        alarms = alarms_resp.json()
        assert len(alarms) == 3
        assert alarms[0]["sequence"] == 1
        assert alarms[0]["waypoint_type"] == "start"
        assert alarms[1]["sequence"] == 2
        assert alarms[1]["waypoint_type"] == "stop"
        assert alarms[2]["sequence"] == 3
        assert alarms[2]["waypoint_type"] == "destination"
        assert alarms[2]["trigger_mode"] == "time"
        assert alarms[2]["trigger_time"] == 45
        print(f"✓ GET /api/trips/{trip_id}/alarms returns 3 ordered alarms")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/trips/{trip_id}")


class TestGeocodingAPIs:
    """Geocoding and Reverse Geocoding APIs"""
    
    def test_geocode_bangalore(self):
        """GET /api/geocode?q=Bangalore - returns results"""
        # Add delay to avoid rate limiting
        time.sleep(1.5)
        response = requests.get(f"{BASE_URL}/api/geocode", params={
            "q": "Bangalore",
            "lat": 12.97,
            "lon": 77.59
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "results" in data
        assert len(data["results"]) > 0
        print(f"✓ Geocode 'Bangalore' returned {len(data['results'])} results")

    def test_reverse_geocode(self):
        """GET /api/reverse-geocode?lat=12.97&lon=77.59 - returns display_name"""
        time.sleep(1.5)
        response = requests.get(f"{BASE_URL}/api/reverse-geocode", params={
            "lat": 12.9716,
            "lon": 77.5946
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "display_name" in data
        assert len(data["display_name"]) > 0
        print(f"✓ Reverse geocode returned: {data['display_name'][:50]}...")


class TestAlarmHistory:
    """Alarm History API"""
    
    def test_get_alarm_history_empty(self):
        """GET /api/alarm-history - returns list"""
        response = requests.get(f"{BASE_URL}/api/alarm-history")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/alarm-history returns list: {len(data)} records")

    def test_log_alarm_trigger(self):
        """POST /api/alarm-history - log alarm trigger"""
        payload = {
            "alarm_id": "test-alarm-id",
            "alarm_name": "TEST_History_Alarm",
            "latitude": 12.97,
            "longitude": 77.59,
            "trip_id": None
        }
        response = requests.post(f"{BASE_URL}/api/alarm-history", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["alarm_name"] == "TEST_History_Alarm"
        assert "triggered_at" in data
        print(f"✓ Logged alarm trigger: {data['id']}")


class TestFullTripCreationFlow:
    """Test complete trip creation with start, waypoint, and destination"""
    
    def test_create_full_trip_bangalore_kurnool_hyderabad(self):
        """Create trip: Bangalore(start) → Kurnool(waypoint, 500m) → Hyderabad(destination, 45min)"""
        
        # Step 1: Create trip
        trip_payload = {
            "name": "Bangalore to Hyderabad",
            "description": "Full trip test",
            "start_location": "Bangalore",
            "end_location": "Hyderabad"
        }
        trip_resp = requests.post(f"{BASE_URL}/api/trips", json=trip_payload)
        assert trip_resp.status_code == 200
        trip_id = trip_resp.json()["id"]
        print(f"✓ Created trip: {trip_id}")
        
        # Step 2: Create start alarm (Bangalore, distance 500m)
        start_resp = requests.post(f"{BASE_URL}/api/alarms", json={
            "name": "Bangalore",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "radius": 500,
            "trip_id": trip_id,
            "sequence": 1,
            "waypoint_type": "start",
            "trigger_mode": "distance",
            "trigger_time": None
        })
        assert start_resp.status_code == 200
        print("✓ Created start alarm: Bangalore (500m)")
        
        # Step 3: Create waypoint alarm (Kurnool, distance 500m)
        waypoint_resp = requests.post(f"{BASE_URL}/api/alarms", json={
            "name": "Kurnool",
            "latitude": 15.8281,
            "longitude": 78.0373,
            "radius": 500,
            "trip_id": trip_id,
            "sequence": 2,
            "waypoint_type": "stop",
            "trigger_mode": "distance",
            "trigger_time": None
        })
        assert waypoint_resp.status_code == 200
        print("✓ Created waypoint alarm: Kurnool (500m)")
        
        # Step 4: Create destination alarm (Hyderabad, time 45min)
        dest_resp = requests.post(f"{BASE_URL}/api/alarms", json={
            "name": "Hyderabad",
            "latitude": 17.3850,
            "longitude": 78.4867,
            "radius": 500,
            "trip_id": trip_id,
            "sequence": 3,
            "waypoint_type": "destination",
            "trigger_mode": "time",
            "trigger_time": 45
        })
        assert dest_resp.status_code == 200
        print("✓ Created destination alarm: Hyderabad (45 min)")
        
        # Verify: GET trip alarms
        alarms_resp = requests.get(f"{BASE_URL}/api/trips/{trip_id}/alarms")
        assert alarms_resp.status_code == 200
        alarms = alarms_resp.json()
        
        assert len(alarms) == 3
        
        # Verify start
        assert alarms[0]["name"] == "Bangalore"
        assert alarms[0]["waypoint_type"] == "start"
        assert alarms[0]["trigger_mode"] == "distance"
        assert alarms[0]["radius"] == 500
        
        # Verify waypoint
        assert alarms[1]["name"] == "Kurnool"
        assert alarms[1]["waypoint_type"] == "stop"
        assert alarms[1]["trigger_mode"] == "distance"
        
        # Verify destination
        assert alarms[2]["name"] == "Hyderabad"
        assert alarms[2]["waypoint_type"] == "destination"
        assert alarms[2]["trigger_mode"] == "time"
        assert alarms[2]["trigger_time"] == 45
        
        print("✓ Full trip verified: Bangalore(start,500m) → Kurnool(stop,500m) → Hyderabad(dest,45min)")
        
        # Keep trip for frontend testing - don't cleanup
        return trip_id


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
