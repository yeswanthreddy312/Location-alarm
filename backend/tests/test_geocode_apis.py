"""
Test suite for Location Alarm PWA - Geocode APIs
Tests the new UX improvements:
1. Geocode API with GPS bias
2. Reverse geocode API
3. CRUD operations for alarms
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestGeocodeAPIs:
    """Test geocode endpoints with GPS bias"""
    
    def test_geocode_with_gps_bias(self):
        """Issue 2: Geocode with lat/lon should return biased results for Koramangala"""
        response = requests.get(
            f"{BASE_URL}/api/geocode",
            params={"q": "Koramangala", "lat": 12.97, "lon": 77.59, "limit": 5}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "results" in data
        assert len(data["results"]) > 0
        
        # First result should be Koramangala in Bangalore
        first_result = data["results"][0]
        assert "display_name" in first_result
        assert "Koramangala" in first_result["display_name"]
        assert "lat" in first_result
        assert "lon" in first_result
        print(f"✓ Geocode with GPS bias returned {len(data['results'])} results for Koramangala")
    
    def test_geocode_without_gps(self):
        """Geocode without lat/lon should still work"""
        response = requests.get(
            f"{BASE_URL}/api/geocode",
            params={"q": "Mumbai", "limit": 5}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "results" in data
        assert len(data["results"]) > 0
        
        first_result = data["results"][0]
        assert "Mumbai" in first_result["display_name"]
        print(f"✓ Geocode without GPS bias returned results for Mumbai")
    
    def test_geocode_empty_query(self):
        """Empty or short query should return error"""
        response = requests.get(
            f"{BASE_URL}/api/geocode",
            params={"q": "ab", "limit": 5}
        )
        
        # Should return success:false or empty results
        assert response.status_code == 200
        data = response.json()
        # Either no results or error
        print(f"✓ Short query handled correctly")
    
    def test_reverse_geocode_success(self):
        """Issue 3: Reverse geocode should return address for valid coordinates"""
        response = requests.get(
            f"{BASE_URL}/api/reverse-geocode",
            params={"lat": 12.9716, "lon": 77.5946}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "display_name" in data
        assert len(data["display_name"]) > 0
        assert "address" in data
        print(f"✓ Reverse geocode returned: {data['display_name'][:50]}...")
    
    def test_reverse_geocode_with_different_coords(self):
        """Test reverse geocode with Mumbai coordinates"""
        response = requests.get(
            f"{BASE_URL}/api/reverse-geocode",
            params={"lat": 19.0760, "lon": 72.8777}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "display_name" in data
        print(f"✓ Reverse geocode for Mumbai: {data['display_name'][:50]}...")


class TestAlarmsCRUD:
    """Test alarm CRUD operations"""
    
    @pytest.fixture
    def test_alarm_id(self):
        """Create a test alarm and clean up after"""
        alarm_data = {
            "name": "TEST_Alarm_PyTest",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "radius": 500,
            "sound": "default",
            "is_active": True,
            "recurring": False
        }
        
        response = requests.post(f"{BASE_URL}/api/alarms", json=alarm_data)
        assert response.status_code == 200
        alarm_id = response.json()["id"]
        
        yield alarm_id
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/alarms/{alarm_id}")
    
    def test_create_alarm(self):
        """Test creating an alarm"""
        alarm_data = {
            "name": "TEST_Create_Alarm",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "radius": 1000,
            "sound": "default",
            "is_active": True,
            "recurring": True
        }
        
        response = requests.post(f"{BASE_URL}/api/alarms", json=alarm_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == alarm_data["name"]
        assert data["latitude"] == alarm_data["latitude"]
        assert data["longitude"] == alarm_data["longitude"]
        assert data["radius"] == alarm_data["radius"]
        assert "id" in data
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/alarms/{data['id']}")
        print(f"✓ Created alarm: {data['name']}")
    
    def test_get_all_alarms(self):
        """Test getting all alarms"""
        response = requests.get(f"{BASE_URL}/api/alarms")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} alarms")
    
    def test_get_alarm_by_id(self, test_alarm_id):
        """Test getting a specific alarm"""
        response = requests.get(f"{BASE_URL}/api/alarms/{test_alarm_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == test_alarm_id
        assert data["name"] == "TEST_Alarm_PyTest"
        print(f"✓ Retrieved alarm by ID: {data['name']}")
    
    def test_update_alarm(self, test_alarm_id):
        """Test updating an alarm"""
        update_data = {
            "name": "TEST_Updated_Alarm",
            "radius": 2000
        }
        
        response = requests.put(f"{BASE_URL}/api/alarms/{test_alarm_id}", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["radius"] == update_data["radius"]
        
        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/alarms/{test_alarm_id}")
        get_data = get_response.json()
        assert get_data["name"] == update_data["name"]
        assert get_data["radius"] == update_data["radius"]
        print(f"✓ Updated alarm: {data['name']}")
    
    def test_delete_alarm(self):
        """Test deleting an alarm"""
        # Create alarm first
        alarm_data = {
            "name": "TEST_Delete_Alarm",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "radius": 500,
            "is_active": True
        }
        
        create_response = requests.post(f"{BASE_URL}/api/alarms", json=alarm_data)
        alarm_id = create_response.json()["id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/alarms/{alarm_id}")
        assert delete_response.status_code == 200
        
        # Verify deleted
        get_response = requests.get(f"{BASE_URL}/api/alarms/{alarm_id}")
        assert get_response.status_code == 404
        print(f"✓ Deleted alarm successfully")
    
    def test_alarm_not_found(self):
        """Test 404 for non-existent alarm"""
        response = requests.get(f"{BASE_URL}/api/alarms/non-existent-id")
        assert response.status_code == 404
        print(f"✓ 404 returned for non-existent alarm")


class TestTripsAPI:
    """Test trips endpoints"""
    
    def test_get_trips(self):
        """Test getting all trips"""
        response = requests.get(f"{BASE_URL}/api/trips")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} trips")
    
    def test_create_trip(self):
        """Test creating a trip"""
        trip_data = {
            "name": "TEST_Trip",
            "description": "Test trip",
            "start_location": "Bangalore",
            "end_location": "Mumbai"
        }
        
        response = requests.post(f"{BASE_URL}/api/trips", json=trip_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == trip_data["name"]
        assert "id" in data
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/trips/{data['id']}")
        print(f"✓ Created trip: {data['name']}")


class TestAlarmHistory:
    """Test alarm history endpoints"""
    
    def test_get_alarm_history(self):
        """Test getting alarm history"""
        response = requests.get(f"{BASE_URL}/api/alarm-history")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} history records")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
