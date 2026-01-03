# Account Recovery & Two-Factor Authentication (2FA) Guide

## Overview
This guide explains how to use the new Account Recovery and Two-Factor Authentication features in the Medical Store Application.

---

## 1. Account Recovery Features

### What is Account Recovery?
Account Recovery allows you to recover your account if you forget your password. It provides multiple recovery methods and security questions.

### Setting Up Account Recovery

1. **Navigate to Account Settings**
   - Click on your profile icon
   - Select "Settings" or go to `/account-settings.html`

2. **Go to Security Tab → Account Recovery Section**

3. **Fill in Recovery Details:**
   - **Recovery Email**: Alternative email address for account recovery
   - **Recovery Phone**: Phone number for SMS recovery (with country code)
   - **Security Question**: Select a security question
   - **Security Answer**: Provide your answer to the security question

4. **Click "Save Recovery Options"**
   - Your recovery options will be saved securely
   - You'll see a confirmation message

### Using Account Recovery

**If you forget your password:**

1. Go to the Login page → Click "Forgot Password"
2. Enter your username
3. Choose recovery method:
   - **Email Recovery**: Verification code sent to recovery email
   - **Phone Recovery**: Verification code sent to recovery phone (SMS)
   - **Security Question**: Answer the security question you set up
4. Follow the prompts to reset your password
5. Log in with your new password

---

## 2. Two-Factor Authentication (2FA)

### What is Two-Factor Authentication?
2FA adds an extra layer of security to your account by requiring two verification methods:
1. Your password (something you know)
2. A verification code from your phone/email/app (something you have)

### 2FA Methods Available

#### Method 1: SMS Verification
**Setup:**
1. Navigate to Account Settings → Security Tab
2. Click "Setup" button under "SMS Verification"
3. Enter your phone number when prompted
4. You'll receive a verification code via SMS
5. Enter the code to complete setup

**Benefits:**
- Quick and easy
- Works on any phone
- No additional app required

---

#### Method 2: Email Verification
**Setup:**
1. Navigate to Account Settings → Security Tab
2. Click "Setup" button under "Email Verification"
3. A verification code will be sent to your email
4. Check your email for the code
5. Enter the code in the application to complete setup

**Benefits:**
- Accessible from any device
- Code can be resent if needed
- Backup verification method

---

#### Method 3: Authenticator App
**Setup:**
1. Navigate to Account Settings → Security Tab
2. Click "Setup" button under "Authenticator App"
3. A QR code will be displayed
4. Download Google Authenticator or Authy app on your phone
5. Scan the QR code with the authenticator app
6. Enter the 6-digit code from the app
7. Save your backup codes in a secure location

**Backup Codes:**
- You'll receive 10 backup codes during setup
- Each code can be used once if you lose access to your authenticator
- Store these codes in a safe place (password manager, etc.)

**Benefits:**
- Highest security level
- Works offline
- Cannot be intercepted via SMS or email

---

### Logging In With 2FA Enabled

When you have 2FA enabled:

1. Enter your username and password as usual
2. Select your 2FA method (if multiple are enabled):
   - SMS Verification
   - Email Verification
   - Authenticator Code
3. Enter the verification code sent to your phone/email or from your authenticator app
4. Click "Verify" to complete login

**Note:** You'll have typically 5-10 minutes to enter the code before it expires.

---

### Enabling Multiple 2FA Methods

You can enable multiple 2FA methods for redundancy:

1. Go to Account Settings → Security Tab
2. Click "Setup" on different methods
3. Complete verification for each method
4. During login, choose which method to use

**Recommended:** Enable at least 2 methods (e.g., SMS + Authenticator) for better security and backup access.

---

### Disabling 2FA

If you need to disable a 2FA method:

1. Go to Account Settings → Security Tab
2. Find the method you want to disable
3. Click "Disable" or the status button next to it
4. Confirm your choice
5. Method will be removed immediately

**Note:** You should have at least one other 2FA method or recovery option enabled before disabling all 2FA methods.

---

## 3. Security Best Practices

### Recommended Setup:
1. ✅ Enable 2FA (SMS + Authenticator recommended)
2. ✅ Set up Account Recovery options
3. ✅ Save backup codes from Authenticator in secure location
4. ✅ Use strong passwords (8+ chars, uppercase, lowercase, number, special char)
5. ✅ Never share your recovery codes or 2FA codes with anyone

### What NOT to do:
- ❌ Share your recovery email or phone number with untrusted people
- ❌ Write recovery codes in plain text on your computer
- ❌ Use the same password across multiple services
- ❌ Enable 2FA only via SMS if SMS forwarding is enabled on your phone
- ❌ Share your authenticator backup codes

---

## 4. API Reference

### Account Recovery Endpoints

#### Save Recovery Options
```
POST /api/account/save-recovery
Content-Type: application/json

{
  "user_id": 1,
  "recovery_email": "backup@example.com",
  "recovery_phone": "+1-555-123-4567",
  "security_question": "What city were you born in?",
  "security_answer": "New York"
}

Response: { "success": true, "message": "Recovery options saved" }
```

#### Get Recovery Options
```
GET /api/account/recovery/:user_id

Response: {
  "success": true,
  "recovery_email": "backup@example.com",
  "recovery_phone": "+1-555-123-4567",
  "security_question": "What city were you born in?"
}
```

---

### 2FA Endpoints

#### Setup 2FA
```
POST /api/account/setup-2fa
Content-Type: application/json

{
  "user_id": 1,
  "method": "authenticator" // or "sms" or "email"
}

Response (Authenticator):
{
  "success": true,
  "secret": "ABCD1234EFGH5678",
  "backup_codes": ["12345678", "87654321", ...],
  "qr_url": "otpauth://totp/..."
}
```

#### Verify 2FA
```
POST /api/account/verify-2fa
Content-Type: application/json

{
  "user_id": 1,
  "method": "authenticator",
  "code": "123456"
}

Response: { "success": true, "message": "2FA enabled successfully" }
```

#### Get 2FA Status
```
GET /api/account/2fa-status/:user_id

Response: {
  "success": true,
  "status": {
    "sms": { "enabled": true, "verified": true },
    "email": { "enabled": false, "verified": false },
    "authenticator": { "enabled": true, "verified": true }
  }
}
```

#### Disable 2FA
```
POST /api/account/disable-2fa
Content-Type: application/json

{
  "user_id": 1,
  "method": "sms"
}

Response: { "success": true, "message": "SMS 2FA disabled" }
```

---

## 5. Troubleshooting

### Can't receive SMS codes?
- Check that your recovery phone number is correct
- Ensure your phone plan supports SMS
- Try Email Verification instead
- Contact support if issue persists

### Lost authenticator phone?
- Use your backup codes to login
- Go to Account Settings and disable authenticator
- Set up 2FA again with new device
- Save new backup codes

### Recovery email/phone changed?
1. Login with your current credentials
2. Go to Account Settings → Security
3. Update recovery email or phone
4. Save changes

### Can't verify 2FA code?
- Ensure your device clock is synchronized
- Check that the code hasn't expired (usually 5-10 minutes)
- Try a different recovery method
- Use a backup code if available

---

## 6. Support

For issues or questions:
- Contact your store administrator
- Reach out to support@medicalstore.pro
- Check the FAQ section in settings

---

**Last Updated:** December 26, 2025
**Version:** 1.0
