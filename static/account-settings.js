const API_BASE_URL = "https://medicalapplication-g71s.onrender.com/api";

let currentUser = null;
let selectedAvatar = null;

// Check if user is logged in
function checkAuth() {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        window.location.href = 'login.html';
        return null;
    }
    return JSON.parse(userStr);
}

// Initialize page
window.addEventListener('DOMContentLoaded', () => {
    currentUser = checkAuth();
    if (currentUser) {
        document.getElementById('welcomeUser').textContent = currentUser.username;
        loadUserProfile();
        initTheme();
        
        // Initialize tabs
        initializeTabs();
        
        // Force page to be fresh (prevent cached version)
        if (performance.navigation.type === 1) {
            // Page was reloaded, ensure latest UI
            setTimeout(() => {
                window.scrollTo(0, 0);
            }, 100);
        }
    }
});

// Initialize Tab System
function initializeTabs() {
    // Add click event to all sidebar items
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const tabName = this.id.replace('Tab', '');
            showSettingsTab(tabName);
        });
    });
    
    // Show first tab by default
    showSettingsTab('profile');
}

// Tab Navigation
function showSettingsTab(tabName) {
    console.log('Opening tab:', tabName);
    
    // Hide all tabs
    document.querySelectorAll('.settings-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active from all sidebar items
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected tab
    const tabContent = document.getElementById(tabName + 'Content');
    const tabButton = document.getElementById(tabName + 'Tab');
    
    if (tabContent) {
        tabContent.classList.add('active');
        console.log('Tab content displayed:', tabName + 'Content');
    } else {
        console.error('Tab content not found:', tabName + 'Content');
    }
    
    if (tabButton) {
        tabButton.classList.add('active');
        console.log('Tab button activated:', tabName + 'Tab');
    } else {
        console.error('Tab button not found:', tabName + 'Tab');
    }
}

// Load User Profile
async function loadUserProfile() {
    // Load from localStorage or API
    const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    
    // Populate form fields
    if (profile.fullName) document.getElementById('fullName').value = profile.fullName;
    if (profile.email) document.getElementById('email').value = profile.email;
    if (profile.phone) document.getElementById('phone').value = profile.phone;
    if (profile.pronouns) document.getElementById('pronouns').value = profile.pronouns;
    if (profile.title) document.getElementById('title').value = profile.title;
    if (profile.designation) document.getElementById('designation').value = profile.designation;
    if (profile.altEmail) document.getElementById('altEmail').value = profile.altEmail;
    if (profile.emergencyContact) document.getElementById('emergencyContact').value = profile.emergencyContact;
    if (profile.address) document.getElementById('address').value = profile.address;
    if (profile.dob) document.getElementById('dob').value = profile.dob;
    if (profile.gender) document.getElementById('gender').value = profile.gender;
    if (profile.bloodGroup) document.getElementById('bloodGroup').value = profile.bloodGroup;
    if (profile.licenseNumber) document.getElementById('licenseNumber').value = profile.licenseNumber;
    if (profile.certifications) document.getElementById('certifications').value = profile.certifications;
    if (profile.linkedin) document.getElementById('linkedin').value = profile.linkedin;
    if (profile.twitter) document.getElementById('twitter').value = profile.twitter;
    
    // Load avatar
    const avatarType = localStorage.getItem('avatarType');
    
    if (avatarType === 'photo') {
        const savedAvatar = localStorage.getItem('userAvatar');
        if (savedAvatar) {
            document.getElementById('avatarDisplay').innerHTML = `
                <img src="${savedAvatar}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
            `;
        }
    } else if (avatarType === 'generated') {
        const gradient = localStorage.getItem('avatarGradient');
        const initials = localStorage.getItem('avatarInitials');
        if (gradient && initials) {
            document.getElementById('avatarDisplay').innerHTML = `
                <div style="width: 100%; height: 100%; border-radius: 50%; background: ${gradient}; display: flex; align-items: center; justify-content: center; font-size: 48px; font-weight: 700; color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                    ${initials}
                </div>
            `;
        }
    } else {
        // Default avatar with initials
        const initials = getInitials(profile.fullName || currentUser.username);
        document.getElementById('avatarDisplay').innerHTML = `
            <div style="width: 100%; height: 100%; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; font-size: 48px; font-weight: 700; color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                ${initials}
            </div>
        `;
    }
}

// Show Toast Notification
function showToast(message, type = 'info') {
    // Create toast element if it doesn't exist
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    
    // Set message and type
    toast.textContent = message;
    toast.className = `toast toast-${type} show`;
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Get initials from name
function getInitials(name) {
    if (!name) return 'AB';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Upload Photo
function uploadPhoto() {
    const file = document.getElementById('photoUpload').files[0];
    if (file) {
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }
        
        // Check file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                // Create canvas for image preview
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Set canvas size
                const maxSize = 500;
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > maxSize) {
                        height *= maxSize / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                
                // Update avatar display
                document.getElementById('avatarDisplay').innerHTML = `
                    <img src="${dataUrl}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
                `;
                
                // Save to localStorage
                localStorage.setItem('userAvatar', dataUrl);
                localStorage.setItem('avatarType', 'photo');
                selectedAvatar = dataUrl;
                
                // Show success message
                showToast('Profile photo updated!', 'success');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// Generate Avatar with initials
function generateAvatar() {
    const name = document.getElementById('fullName').value || currentUser.username;
    const initials = getInitials(name);
    
    // Generate random gradient colors
    const gradients = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
        'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        'linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)'
    ];
    
    const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];
    
    document.getElementById('avatarDisplay').innerHTML = `
        <div style="width: 100%; height: 100%; border-radius: 50%; background: ${randomGradient}; display: flex; align-items: center; justify-content: center; font-size: 48px; font-weight: 700; color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
            ${initials}
        </div>
    `;
    
    localStorage.setItem('avatarGradient', randomGradient);
    localStorage.setItem('avatarInitials', initials);
    localStorage.setItem('avatarType', 'generated');
    localStorage.removeItem('userAvatar');
    
    showToast('Avatar generated!', 'success');
}

// Remove Photo
function removePhoto() {
    generateAvatar();
    localStorage.removeItem('userAvatar');
}

// Show QR Code
function showQRCode() {
    document.getElementById('qrModal').classList.add('show');
    // Generate QR code (you can use a library like qrcode.js)
    document.getElementById('qrCode').innerHTML = '<div style="width: 200px; height: 200px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; margin: 0 auto;"><i class="fas fa-qrcode" style="font-size: 100px; color: #667eea;"></i></div>';
}

// Close QR Modal
function closeQRModal() {
    document.getElementById('qrModal').classList.remove('show');
}

// Download QR
function downloadQR() {
    alert('QR Code downloaded!');
}

// Open Map
function openMap() {
    const address = document.getElementById('address').value;
    if (address) {
        window.open(`https://www.google.com/maps/search/${encodeURIComponent(address)}`, '_blank');
    }
}

// Save Personal Details
document.getElementById('personalDetailsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const profile = {
        fullName: document.getElementById('fullName').value,
        pronouns: document.getElementById('pronouns').value,
        title: document.getElementById('title').value,
        designation: document.getElementById('designation').value,
        email: document.getElementById('email').value,
        altEmail: document.getElementById('altEmail').value,
        phone: document.getElementById('phone').value,
        emergencyContact: document.getElementById('emergencyContact').value,
        address: document.getElementById('address').value,
        dob: document.getElementById('dob').value,
        gender: document.getElementById('gender').value,
        bloodGroup: document.getElementById('bloodGroup').value,
        licenseNumber: document.getElementById('licenseNumber').value,
        certifications: document.getElementById('certifications').value,
        linkedin: document.getElementById('linkedin').value,
        twitter: document.getElementById('twitter').value
    };
    
    localStorage.setItem('userProfile', JSON.stringify(profile));
    showToast('Profile updated successfully!', 'success');
});

// Setup 2FA
function setup2FA(method) {
    showToast('2FA and Account Recovery will be available in June 2026! 🔒', 'info');
}

// Verify 2FA
function verify2FA(userId, method, code) {
    fetch(`${API_BASE_URL}/account/verify-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, method: method, code: code })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast(data.message, 'success');
            load2FAStatus(userId);
        } else {
            showToast(data.message || 'Verification failed', 'error');
        }
    })
    .catch(err => {
        console.error('Error:', err);
        showToast('Connection error', 'error');
    });
}

// Load 2FA Status
function load2FAStatus(userId) {
    fetch(`${API_BASE_URL}/account/2fa-status/${userId}`)
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const status = data.status;
            // Update UI based on status
            updateUI2FAStatus(status);
        }
    })
    .catch(err => console.error('Error loading 2FA status:', err));
}

// Update 2FA Status UI
function updateUI2FAStatus(status) {
    // Update SMS button
    const smsBtnElement = document.querySelector('button[onclick*="setup2FA(\'sms\')"]');
    if (smsBtnElement && status.sms.enabled) {
        smsBtnElement.textContent = '✓ Enabled';
        smsBtnElement.classList.add('btn-success');
        smsBtnElement.onclick = () => disable2FA('sms');
    }
    
    // Update Email button
    const emailBtnElement = document.querySelector('button[onclick*="setup2FA(\'email\')"]');
    if (emailBtnElement && status.email.enabled) {
        emailBtnElement.textContent = '✓ Enabled';
        emailBtnElement.classList.add('btn-success');
        emailBtnElement.onclick = () => disable2FA('email');
    }
    
    // Update Authenticator button
    const authBtnElement = document.querySelector('button[onclick*="setupAuthenticator()"]');
    if (authBtnElement && status.authenticator.enabled) {
        authBtnElement.textContent = '✓ Enabled';
        authBtnElement.classList.add('btn-success');
        authBtnElement.onclick = () => disable2FA('authenticator');
    }
}

// Disable 2FA
function disable2FA(method) {
    if (!confirm(`Are you sure you want to disable ${method.toUpperCase()} 2FA?`)) {
        return;
    }
    
    const userId = localStorage.getItem('userId');
    fetch(`${API_BASE_URL}/account/disable-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, method: method })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast(data.message, 'success');
            load2FAStatus(userId);
        } else {
            showToast(data.message || 'Failed to disable 2FA', 'error');
        }
    })
    .catch(err => {
        console.error('Error:', err);
        showToast('Connection error', 'error');
    });
}

// Setup Authenticator
function setupAuthenticator() {
    showToast('Google Authenticator will be available in June 2026! 🔒', 'info');
}

// Generate Backup Codes
function generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
        codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    return codes;
}

// Display Backup Codes
function displayBackupCodes(codes) {
    const container = document.getElementById('codesDisplay');
    container.innerHTML = codes.map(code => `<div class="code-item">${code}</div>`).join('');
}

// Download Backup Codes
function downloadBackupCodes() {
    alert('Backup codes downloaded to Downloads folder');
}

// Password Requirements (same as signup)
const PASSWORD_REQUIREMENTS_ACCOUNT = {
    minLength: 8,
    hasUppercase: /[A-Z]/,
    hasLowercase: /[a-z]/,
    hasNumber: /[0-9]/,
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/
};

// Validate password strength (account settings)
function validatePasswordStrengthAccount(password) {
    const results = {
        length: password.length >= PASSWORD_REQUIREMENTS_ACCOUNT.minLength,
        uppercase: PASSWORD_REQUIREMENTS_ACCOUNT.hasUppercase.test(password),
        lowercase: PASSWORD_REQUIREMENTS_ACCOUNT.hasLowercase.test(password),
        number: PASSWORD_REQUIREMENTS_ACCOUNT.hasNumber.test(password),
        specialChar: PASSWORD_REQUIREMENTS_ACCOUNT.hasSpecialChar.test(password),
        isValid: false
    };
    
    results.isValid = results.length && results.uppercase && results.lowercase && results.number && results.specialChar;
    return results;
}

// Change Password Form
document.getElementById('changePasswordForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match!', 'error');
        return;
    }
    
    const validation = validatePasswordStrengthAccount(newPassword);
    if (!validation.isValid) {
        const missing = [];
        if (!validation.length) missing.push('at least 8 characters');
        if (!validation.uppercase) missing.push('one uppercase letter');
        if (!validation.lowercase) missing.push('one lowercase letter');
        if (!validation.number) missing.push('one number');
        if (!validation.specialChar) missing.push('one special character');
        showToast('Password must include: ' + missing.join(', '), 'error');
        return;
    }
    
    // Call reset password API
    try {
        const response = await fetch(`${API_BASE_URL}/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: currentUser.username,
                new_password: newPassword
            })
        });
        
        const data = await response.json();
        if (data.success) {
            showToast('Password changed successfully!', 'success');
            document.getElementById('changePasswordForm').reset();
        } else {
            showToast(data.message || 'Failed to change password', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Connection error. Please try again.', 'error');
    }
});

// Check Password Strength
function checkPasswordStrength() {
    const password = document.getElementById('newPassword').value;
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');
    
    if (!password) {
        strengthBar.style.width = '0%';
        strengthText.textContent = '';
        return;
    }
    
    const validation = validatePasswordStrengthAccount(password);
    
    // Calculate strength percentage
    let strength = 0;
    if (validation.length) strength += 20;
    if (validation.uppercase) strength += 20;
    if (validation.lowercase) strength += 20;
    if (validation.number) strength += 20;
    if (validation.specialChar) strength += 20;
    
    // Update visual indicators
    strengthBar.style.width = strength + '%';
    if (strength < 40) {
        strengthBar.style.backgroundColor = '#e63757';
        strengthText.textContent = 'Weak';
        strengthText.style.color = '#e63757';
    } else if (strength < 80) {
        strengthBar.style.backgroundColor = '#f6c343';
        strengthText.textContent = 'Fair';
        strengthText.style.color = '#f6c343';
    } else {
        strengthBar.style.backgroundColor = '#00d97e';
        strengthText.textContent = 'Strong';
        strengthText.style.color = '#00d97e';
    }
    
    // Update requirement indicators
    const reqMap = {
        'req-length': validation.length,
        'req-upper': validation.uppercase,
        'req-lower': validation.lowercase,
        'req-number': validation.number,
        'req-special': validation.specialChar
    };
    
    Object.entries(reqMap).forEach(([id, met]) => {
        const elem = document.getElementById(id);
        if (elem) {
            if (met) {
                elem.classList.add('met');
                elem.querySelector('i').className = 'fas fa-check-circle';
            } else {
                elem.classList.remove('met');
                elem.querySelector('i').className = 'fas fa-circle';
            }
        }
    });
}

// Validate Password
function validatePassword(password) {
    return password.length >= 8 &&
           /[A-Z]/.test(password) &&
           /[a-z]/.test(password) &&
           /[0-9]/.test(password) &&
           /[^A-Za-z0-9]/.test(password);
}

// Toggle Password Visibility
function togglePasswordVisibility(fieldId) {
    const field = document.getElementById(fieldId);
    const icon = field.nextElementSibling.querySelector('i');
    
    if (field.type === 'password') {
        field.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        field.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Logout All Sessions
function logoutAllSessions() {
    if (confirm('Are you sure you want to logout from all devices?')) {
        localStorage.clear();
        window.location.href = 'login.html';
    }
}

// Download Certificate
function downloadCertificate(id) {
    alert(`Certificate ${id} downloaded!`);
}

// Apply Theme
function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// Initialize Theme
function initTheme() {
    const savedTheme = localStorage.getItem('medicalStoreTheme') || 'light';
    applyTheme(savedTheme);
    
    // Ensure theme is applied immediately
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            const savedTheme = localStorage.getItem('medicalStoreTheme') || 'light';
            applyTheme(savedTheme);
            initializeRecoveryAndAuth();
        });
    } else {
        initializeRecoveryAndAuth();
    }
}

// Initialize Recovery and Auth
function initializeRecoveryAndAuth() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    
    // Load recovery options
    loadRecoveryOptions(userId);
    
    // Load 2FA status
    load2FAStatus(userId);
    
    // Setup Save Recovery Options button
    const saveRecoveryBtn = document.querySelector('button[onclick*="Save Recovery"]');
    if (!saveRecoveryBtn) {
        const existingBtn = document.querySelector('.recovery-save-btn');
        if (existingBtn) {
            existingBtn.addEventListener('click', () => saveRecoveryOptions(userId));
        }
    }
}

// Load Recovery Options
function loadRecoveryOptions(userId) {
    if (!userId) return;
    
    fetch(`${API_BASE_URL}/account/recovery/${userId}`)
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            if (data.recovery_email) document.getElementById('recoveryEmail').value = data.recovery_email;
            if (data.recovery_phone) document.getElementById('recoveryPhone').value = data.recovery_phone;
            if (data.security_question) {
                const questionSelect = document.getElementById('securityQ1');
                if (questionSelect) questionSelect.value = data.security_question;
            }
        }
    })
    .catch(err => console.error('Error loading recovery options:', err));
}

// Save Recovery Options
function saveRecoveryOptions(userId) {
    showToast('Account Recovery will be available in June 2026! 🔐', 'info');

}

