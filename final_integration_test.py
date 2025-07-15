#!/usr/bin/env python3
"""
Final Integration Test for Briefly AI Audio Generation
Tests the complete workflow including navigation fix verification
"""

import requests
import json
import time
import os
import subprocess
import signal
import sys

class BrieflyAITester:
    def __init__(self):
        self.base_url = "http://127.0.0.1:5001"
        self.server_process = None
        self.test_urls = [
            "https://example.com/news/article1",
            "https://example.com/news/article2", 
            "https://example.com/news/article3"
        ]
    
    def start_server(self):
        """Start the API server"""
        print("🚀 Starting API server...")
        try:
            self.server_process = subprocess.Popen(
                ["python3", "api_server.py"],
                cwd="/Users/genami133/Projects/Briefly AI/Website",
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            # Give server time to start
            time.sleep(3)
            print("✅ Server started successfully")
            return True
        except Exception as e:
            print(f"❌ Failed to start server: {e}")
            return False
    
    def stop_server(self):
        """Stop the API server"""
        if self.server_process:
            print("🛑 Stopping API server...")
            self.server_process.terminate()
            self.server_process.wait()
            print("✅ Server stopped")
    
    def test_health_endpoint(self):
        """Test the health endpoint"""
        print("\n🔍 Testing health endpoint...")
        try:
            response = requests.get(f"{self.base_url}/health", timeout=5)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Health check passed: {data}")
                return True
            else:
                print(f"❌ Health check failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Health check error: {e}")
            return False
    
    def test_broadcast_generation(self):
        """Test the broadcast generation endpoint"""
        print("\n🎙️ Testing broadcast generation...")
        try:
            payload = {"urls": self.test_urls}
            response = requests.post(
                f"{self.base_url}/api/generate-broadcast",
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Broadcast generation successful: {data}")
                return data.get("success", False)
            else:
                print(f"❌ Broadcast generation failed: {response.status_code}")
                print(f"Response: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Broadcast generation error: {e}")
            return False
    
    def test_audio_file_serving(self):
        """Test the audio file serving endpoint"""
        print("\n🔊 Testing audio file serving...")
        try:
            response = requests.head(f"{self.base_url}/Broadcast.wav", timeout=10)
            if response.status_code == 200:
                print("✅ Audio file is accessible")
                content_length = response.headers.get('Content-Length', 'unknown')
                print(f"   Audio file size: {content_length} bytes")
                return True
            else:
                print(f"❌ Audio file not accessible: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Audio file serving error: {e}")
            return False
    
    def verify_audio_file_quality(self):
        """Verify the generated audio file exists and has reasonable size"""
        print("\n🎵 Verifying audio file quality...")
        audio_path = "/Users/genami133/Projects/Briefly AI/Website/Broadcast.wav"
        
        if os.path.exists(audio_path):
            file_size = os.path.getsize(audio_path)
            print(f"✅ Audio file exists: {file_size} bytes")
            
            # Check if file size seems reasonable (should be > 1KB for a real audio file)
            if file_size > 1024:
                print("✅ Audio file size looks reasonable")
                return True
            else:
                print("⚠️ Audio file size seems too small")
                return False
        else:
            print("❌ Audio file does not exist")
            return False
    
    def check_javascript_integration_points(self):
        """Check key integration points in the JavaScript file"""
        print("\n🔧 Checking JavaScript integration points...")
        js_path = "/Users/genami133/Projects/Briefly AI/Website/your-briefly.js"
        
        try:
            with open(js_path, 'r') as f:
                content = f.read()
            
            # Check for key integration components
            checks = [
                ("URL collection logic", "const selectedUrls = [];"),
                ("API call to broadcast generation", "/api/generate-broadcast"),
                ("Audio element integration", "this.audioElement = new Audio()"),
                ("Navigation fix", "app && app.isPlaying"),
                ("Audio protection dialog", "app && app.audioLoaded"),
                ("Real audio loading", "loadAudioFile(audioUrl)"),
                ("Escape key handler", "if (e.key === 'Escape')")
            ]
            
            all_good = True
            for check_name, check_string in checks:
                if check_string in content:
                    print(f"✅ {check_name} found")
                else:
                    print(f"❌ {check_name} missing")
                    all_good = False
            
            return all_good
            
        except Exception as e:
            print(f"❌ Error checking JavaScript file: {e}")
            return False
    
    def run_complete_test(self):
        """Run the complete integration test suite"""
        print("🧪 Starting Complete Integration Test for Briefly AI")
        print("=" * 60)
        
        success_count = 0
        total_tests = 6
        
        try:
            # Test 1: Start server
            if self.start_server():
                success_count += 1
            
            # Test 2: Health check
            if self.test_health_endpoint():
                success_count += 1
            
            # Test 3: JavaScript integration points
            if self.check_javascript_integration_points():
                success_count += 1
            
            # Test 4: Broadcast generation
            if self.test_broadcast_generation():
                success_count += 1
            
            # Test 5: Audio file serving
            if self.test_audio_file_serving():
                success_count += 1
            
            # Test 6: Audio file quality
            if self.verify_audio_file_quality():
                success_count += 1
            
        finally:
            self.stop_server()
        
        # Final report
        print("\n" + "=" * 60)
        print("🏁 FINAL TEST RESULTS")
        print("=" * 60)
        print(f"✅ Passed: {success_count}/{total_tests} tests")
        
        if success_count == total_tests:
            print("🎉 ALL TESTS PASSED! The integration is working correctly.")
            print("\n📋 What this means:")
            print("   • API server starts and responds correctly")
            print("   • JavaScript has all required integration points")
            print("   • Broadcast generation works end-to-end")
            print("   • Audio files are generated and served properly")
            print("   • Navigation fix is in place to prevent accidental resets")
            print("\n🎯 The complete workflow is ready for use!")
        else:
            print(f"⚠️ {total_tests - success_count} tests failed. Review the issues above.")
        
        return success_count == total_tests

def main():
    tester = BrieflyAITester()
    success = tester.run_complete_test()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
