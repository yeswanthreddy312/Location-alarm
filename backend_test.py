import requests
import sys
import json
from datetime import datetime

class LocationAlarmAPITester:
    def __init__(self, base_url="https://trip-notifier-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_alarm_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, check_response=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else self.api_url
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            print(f"   Status: {response.status_code}")
            
            # Check if response is JSON
            try:
                response_json = response.json()
                print(f"   Response: {json.dumps(response_json, indent=2)}")
            except:
                print(f"   Response (text): {response.text[:200]}...")
                response_json = {}

            success = response.status_code == expected_status
            
            # Additional response validation if provided
            if success and check_response:
                success = check_response(response_json)
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")

            return success, response_json

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test API root endpoint"""
        return self.run_test(
            "API Root",
            "GET", 
            "",
            200,
            check_response=lambda r: "message" in r
        )

    def test_create_alarm(self):
        """Test creating a new alarm"""
        alarm_data = {
            "name": "Test Home Alarm",
            "latitude": 28.6139,
            "longitude": 77.2090,
            "radius": 500,
            "sound": "default",
            "is_active": True,
            "recurring": False
        }
        
        success, response = self.run_test(
            "Create Alarm",
            "POST",
            "alarms",
            200,
            data=alarm_data,
            check_response=lambda r: "id" in r and r.get("name") == "Test Home Alarm"
        )
        
        if success and "id" in response:
            self.created_alarm_id = response["id"]
            print(f"   Created alarm ID: {self.created_alarm_id}")
            
        return success

    def test_get_alarms(self):
        """Test getting all alarms"""
        return self.run_test(
            "Get All Alarms",
            "GET",
            "alarms",
            200,
            check_response=lambda r: isinstance(r, list)
        )

    def test_get_specific_alarm(self):
        """Test getting a specific alarm"""
        if not self.created_alarm_id:
            print("❌ Skipping - No alarm ID available")
            return False
            
        return self.run_test(
            "Get Specific Alarm",
            "GET",
            f"alarms/{self.created_alarm_id}",
            200,
            check_response=lambda r: r.get("id") == self.created_alarm_id
        )

    def test_update_alarm(self):
        """Test updating an alarm"""
        if not self.created_alarm_id:
            print("❌ Skipping - No alarm ID available")
            return False
            
        update_data = {
            "name": "Updated Test Alarm",
            "radius": 1000,
            "is_active": False
        }
        
        return self.run_test(
            "Update Alarm",
            "PUT",
            f"alarms/{self.created_alarm_id}",
            200,
            data=update_data,
            check_response=lambda r: r.get("name") == "Updated Test Alarm" and r.get("radius") == 1000
        )

    def test_delete_alarm(self):
        """Test deleting an alarm"""
        if not self.created_alarm_id:
            print("❌ Skipping - No alarm ID available")
            return False
            
        return self.run_test(
            "Delete Alarm",
            "DELETE",
            f"alarms/{self.created_alarm_id}",
            200,
            check_response=lambda r: "message" in r
        )

    def test_error_cases(self):
        """Test error handling"""
        print("\n🔍 Testing Error Cases...")
        
        # Test invalid alarm ID
        success1, _ = self.run_test(
            "Get Non-existent Alarm",
            "GET",
            "alarms/invalid-id",
            404
        )
        
        # Test invalid data for creation
        invalid_data = {
            "name": "",  # Empty name
            "latitude": "invalid",  # Invalid latitude
            "longitude": 77.2090
        }
        
        success2, _ = self.run_test(
            "Create Alarm with Invalid Data",
            "POST",
            "alarms",
            422  # Validation error
        )
        
        return success1 and success2

def main():
    print("🚀 Starting Location Alarm API Tests...")
    print("=" * 50)
    
    tester = LocationAlarmAPITester()
    
    # Test sequence
    tests = [
        tester.test_root_endpoint,
        tester.test_create_alarm,
        tester.test_get_alarms,
        tester.test_get_specific_alarm,
        tester.test_update_alarm,
        tester.test_get_alarms,  # Check after update
        tester.test_delete_alarm,
        tester.test_error_cases
    ]
    
    for test in tests:
        test()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Backend API Test Results:")
    print(f"   Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All backend tests passed!")
        return 0
    else:
        print("⚠️  Some backend tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())