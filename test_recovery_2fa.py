#!/usr/bin/env python3
"""
Test script for Account Recovery and 2FA endpoints
Run: python test_recovery_2fa.py
"""

import requests
import json

BASE_URL = "http://localhost:5000/api"

def test_save_recovery():
    """Test saving recovery options"""
    print("\n=== Test: Save Recovery Options ===")
    data = {
        "user_id": 1,
        "recovery_email": "backup@example.com",
        "recovery_phone": "+1-555-123-4567",
        "security_question": "What city were you born in?",
        "security_answer": "New York"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/account/save-recovery", json=data)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

def test_get_recovery():
    """Test getting recovery options"""
    print("\n=== Test: Get Recovery Options ===")
    
    try:
        response = requests.get(f"{BASE_URL}/account/recovery/1")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

def test_setup_2fa_sms():
    """Test setting up SMS 2FA"""
    print("\n=== Test: Setup SMS 2FA ===")
    data = {
        "user_id": 1,
        "method": "sms"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/account/setup-2fa", json=data)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

def test_setup_2fa_authenticator():
    """Test setting up Authenticator 2FA"""
    print("\n=== Test: Setup Authenticator 2FA ===")
    data = {
        "user_id": 1,
        "method": "authenticator"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/account/setup-2fa", json=data)
        result = response.json()
        print(f"Status: {response.status_code}")
        print(f"Success: {result['success']}")
        print(f"Message: {result['message']}")
        if 'secret' in result:
            print(f"Secret: {result['secret']}")
        if 'backup_codes' in result:
            print(f"Backup Codes: {result['backup_codes'][:3]}... (showing first 3)")
    except Exception as e:
        print(f"Error: {e}")

def test_verify_2fa():
    """Test verifying 2FA"""
    print("\n=== Test: Verify 2FA ===")
    data = {
        "user_id": 1,
        "method": "sms",
        "code": "123456"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/account/verify-2fa", json=data)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

def test_get_2fa_status():
    """Test getting 2FA status"""
    print("\n=== Test: Get 2FA Status ===")
    
    try:
        response = requests.get(f"{BASE_URL}/account/2fa-status/1")
        result = response.json()
        print(f"Status: {response.status_code}")
        print(f"Response:")
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"Error: {e}")

def test_disable_2fa():
    """Test disabling 2FA"""
    print("\n=== Test: Disable 2FA ===")
    data = {
        "user_id": 1,
        "method": "sms"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/account/disable-2fa", json=data)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print("=" * 50)
    print("Account Recovery & 2FA Endpoint Tests")
    print("=" * 50)
    
    # Note: Make sure you have created a user first (user_id = 1)
    # Run these tests in order
    
    test_save_recovery()
    test_get_recovery()
    test_setup_2fa_sms()
    test_setup_2fa_authenticator()
    test_verify_2fa()
    test_get_2fa_status()
    test_disable_2fa()
    
    print("\n" + "=" * 50)
    print("Tests Complete!")
    print("=" * 50)
