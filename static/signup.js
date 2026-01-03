const API_BASE_URL = 'https://medicalapplication-3p64.onrender.com//api';


// Password Requirements
const PASSWORD_REQUIREMENTS = {
    minLength: 8,
    hasUppercase: /[A-Z]/,
    hasLowercase: /[a-z]/,
    hasNumber: /[0-9]/,
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/
};

// Validate password strength
function validatePasswordStrength(password) {
    const results = {
        length: password.length >= PASSWORD_REQUIREMENTS.minLength,
        uppercase: PASSWORD_REQUIREMENTS.hasUppercase.test(password),
        lowercase: PASSWORD_REQUIREMENTS.hasLowercase.test(password),
        number: PASSWORD_REQUIREMENTS.hasNumber.test(password),
        specialChar: PASSWORD_REQUIREMENTS.hasSpecialChar.test(password),
        isValid: false
    };
    
    results.isValid = results.length && results.uppercase && results.lowercase && results.number && results.specialChar;
    return results;
}

// Update password strength indicator
function updatePasswordStrengthUI(password) {
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');
    
    if (!password) {
        if (strengthBar) strengthBar.style.width = '0%';
        if (strengthText) strengthText.textContent = '';
        return;
    }
    
    const validation = validatePasswordStrength(password);
    
    // Calculate strength percentage
    let strength = 0;
    if (validation.length) strength += 20;
    if (validation.uppercase) strength += 20;
    if (validation.lowercase) strength += 20;
    if (validation.number) strength += 20;
    if (validation.specialChar) strength += 20;
    
    // Update visual indicators
    if (strengthBar) {
        strengthBar.style.width = strength + '%';
        if (strength < 40) strengthBar.style.background = '#e63757';
        else if (strength < 80) strengthBar.style.background = '#f6c343';
        else strengthBar.style.background = '#00d97e';
    }
    
    if (strengthText) {
        if (strength < 40) strengthText.textContent = 'Weak';
        else if (strength < 80) strengthText.textContent = 'Fair';
        else strengthText.textContent = 'Strong';
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
                const icon = elem.querySelector('i');
                if (icon) icon.className = 'fas fa-check-circle';
            } else {
                elem.classList.remove('met');
                const icon = elem.querySelector('i');
                if (icon) icon.className = 'fas fa-circle';
            }
        }
    });
}

// Validate form
function validateForm(username, password) {
    let isValid = true;
    
    // Clear previous errors
    document.getElementById('usernameError').textContent = '';
    document.getElementById('passwordError').textContent = '';
    document.getElementById('username').classList.remove('error');
    document.getElementById('password').classList.remove('error');
    
    // Validate username
    if (!username || username.trim() === '') {
        document.getElementById('usernameError').textContent = 'Username is required';
        document.getElementById('username').classList.add('error');
        isValid = false;
    } else if (username.length < 3) {
        document.getElementById('usernameError').textContent = 'Username must be at least 3 characters';
        document.getElementById('username').classList.add('error');
        isValid = false;
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        document.getElementById('usernameError').textContent = 'Username can only contain letters, numbers, and underscores';
        document.getElementById('username').classList.add('error');
        isValid = false;
    }
    
    // Validate password strength
    if (!password || password === '') {
        document.getElementById('passwordError').textContent = 'Password is required';
        document.getElementById('password').classList.add('error');
        isValid = false;
    } else {
        const validation = validatePasswordStrength(password);
        if (!validation.isValid) {
            const missing = [];
            if (!validation.length) missing.push('at least 8 characters');
            if (!validation.uppercase) missing.push('one uppercase letter');
            if (!validation.lowercase) missing.push('one lowercase letter');
            if (!validation.number) missing.push('one number');
            if (!validation.specialChar) missing.push('one special character (!@#$%^&* etc)');
            
            document.getElementById('passwordError').textContent = 'Password must include: ' + missing.join(', ');
            document.getElementById('password').classList.add('error');
            isValid = false;
        }
    }
    
    return isValid;
}

// Show alert message
function showAlert(message, type) {
    const alert = document.getElementById('signupAlert') || document.getElementById('alert');
    if (!alert) {
        console.error('Alert element not found:', message);
        return;
    }
    
    alert.textContent = message;
    alert.className = `alert ${type}`;
    alert.style.display = 'block';
    
    setTimeout(() => {
        alert.style.display = 'none';
    }, 5000);
}

// Handle signup form submission
window.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    if (!signupForm) return;
    
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Collect form data
        const store_name = document.getElementById('store_name').value.trim();
        const owner_name = document.getElementById('owner_name').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const address = document.getElementById('address') ? document.getElementById('address').value.trim() : ''; // Optional in HTML?
        const city = document.getElementById('city').value.trim();
        const state = document.getElementById('state').value.trim();
        const pincode = document.getElementById('pincode') ? document.getElementById('pincode').value.trim() : '';
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        if (!validateForm(username, password)) {
            return;
        }
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registering Store...';
        
        try {
            const response = await fetch(`${API_BASE_URL}/store/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    store_name,
                    owner_name,
                    email,
                    phone,
                    address,
                    city,
                    state,
                    pincode,
                    username,
                    password
                }),
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Save store code to localStorage for autofill
                localStorage.setItem('registered_store_code', data.store_code);

                // Show success message permanently
                const alert = document.getElementById('signupAlert') || document.getElementById('alert');
                if (alert) {
                    alert.innerHTML = `
                        <div style="text-align: center; padding: 10px;">
                            <i class="fas fa-check-circle" style="font-size: 40px; color: #2ecc71; margin-bottom: 15px;"></i>
                            <h3 style="color: #2c3e50; margin-bottom: 10px;">Registration Successful!</h3>
                            <p style="margin-bottom: 15px;">Your Store Code is generated below. <strong>You MUST save this code.</strong></p>
                            
                            <div style="display: flex; gap: 10px; margin-bottom: 20px; justify-content: center; align-items: center;">
                                <input type="text" value="${data.store_code}" readonly 
                                    style="font-size: 24px; font-weight: bold; text-align: center; padding: 10px; border: 2px dashed #3498db; border-radius: 5px; width: 200px; background: #f8f9fa; color: #2c3e50; cursor: text;" 
                                    id="generatedStoreCode" onclick="this.select()">
                                
                                <button type="button" class="btn" onclick="navigator.clipboard.writeText('${data.store_code}')" style="padding: 10px 15px; background: #ecf0f1; color: #333; border: 1px solid #ccc;" title="Copy to Clipboard">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                            
                            <a href="login.html?store_code=${encodeURIComponent(data.store_code)}" class="btn btn-primary" style="display:inline-block; width: 100%; text-decoration: none;">
                                Login Now <i class="fas fa-arrow-right"></i>
                            </a>
                        </div>
                    `;
                    alert.className = 'alert success';
                    alert.style.display = 'block';
                    alert.style.backgroundColor = '#fff';
                    alert.style.border = '2px solid #2ecc71';
                    
                    alert.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Set a 10-minute timeout (600,000 ms) as requested
                    setTimeout(() => {
                        alert.style.display = 'none';
                    }, 600000);
                }
                
                // Disable button
                submitBtn.disabled = true;
                submitBtn.textContent = 'Registered';
                
                return;
            } else {
                showAlert(data.message || 'Registration failed', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Register Store';
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Connection error. Please check if the server is running.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Register Store';
        }
    });
    
    // Clear error on input
    const usernameInput = document.getElementById('username');
    if (usernameInput) {
        usernameInput.addEventListener('input', () => {
            usernameInput.classList.remove('error');
            document.getElementById('usernameError').textContent = '';
        });
    }
    
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('input', () => {
            passwordInput.classList.remove('error');
            document.getElementById('passwordError').textContent = '';
            updatePasswordStrengthUI(passwordInput.value);
        });
    }
});




