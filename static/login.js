const API_BASE_URL = 'https://medicalapplication-3p64.onrender.com/api';


// Validate form
function validateForm(store_code, username, password) {
    let isValid = true;
    
    // Clear previous errors
    const storeCodeError = document.getElementById('storeCodeError');
    const usernameError = document.getElementById('usernameError');
    const passwordError = document.getElementById('passwordError');
    
    if (storeCodeError) storeCodeError.textContent = '';
    if (usernameError) usernameError.textContent = '';
    if (passwordError) passwordError.textContent = '';
    
    document.getElementById('store_code')?.classList.remove('error');
    document.getElementById('username')?.classList.remove('error');
    document.getElementById('password')?.classList.remove('error');
    
    // Validate store code
    if (!store_code || store_code.trim() === '') {
        if (storeCodeError) {
            storeCodeError.textContent = 'Store Code is required';
            document.getElementById('store_code')?.classList.add('error');
        }
        isValid = false;
    }
    
    // Validate username
    if (!username || username.trim() === '') {
        if (usernameError) {
            usernameError.textContent = 'Username is required';
            document.getElementById('username')?.classList.add('error');
        }
        isValid = false;
    } else if (username.length < 3) {
        if (usernameError) {
            usernameError.textContent = 'Username must be at least 3 characters';
            document.getElementById('username')?.classList.add('error');
        }
        isValid = false;
    }
    
    // Validate password
    if (!password || password.trim() === '') {
        if (passwordError) {
            passwordError.textContent = 'Password is required';
            document.getElementById('password')?.classList.add('error');
        }
        isValid = false;
    } else if (password.length < 6) {
        if (passwordError) {
            passwordError.textContent = 'Password must be at least 6 characters';
            document.getElementById('password')?.classList.add('error');
        }
        isValid = false;
    }
    
    return isValid;
}

// Show alert message
function showAlert(message, type) {
    const alert = document.getElementById('alert');
    alert.textContent = message;
    alert.className = `alert ${type}`;
    alert.style.display = 'block';
    
    // 10 minutes timeout (600,000 ms)
    setTimeout(() => {
        alert.style.display = 'none';
    }, 600000);
}

// Handle login form submission
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const store_code = document.getElementById('store_code').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!validateForm(store_code, username, password)) {
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ store_code, username, password }),
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Store user info in localStorage
            localStorage.setItem('user', JSON.stringify(data.user));
            showAlert('Login successful! Redirecting...', 'success');
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            showAlert(data.message || 'Login failed', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Login';
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Connection error. Please check if the server is running.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
    }
});

// Clear error on input
document.getElementById('store_code')?.addEventListener('input', () => {
    document.getElementById('store_code')?.classList.remove('error');
    const errorEl = document.getElementById('storeCodeError');
    if (errorEl) errorEl.textContent = '';
});

document.getElementById('username').addEventListener('input', () => {
    document.getElementById('username').classList.remove('error');
    document.getElementById('usernameError').textContent = '';
});

document.getElementById('password').addEventListener('input', () => {
    document.getElementById('password').classList.remove('error');
    document.getElementById('passwordError').textContent = '';
});

// Check for store code in URL from signup redirection
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const storeCode = urlParams.get('store_code');
    
    if (storeCode) {
        const storeCodeInput = document.getElementById('store_code');
        if (storeCodeInput) {
            storeCodeInput.value = storeCode;
            // Visual feedback
            storeCodeInput.style.backgroundColor = 'rgba(0, 217, 126, 0.1)';
            storeCodeInput.style.borderColor = '#00d97e';
            
            // Focus on username since store code is filled
            const usernameInput = document.getElementById('username');
            if (usernameInput) {
                setTimeout(() => usernameInput.focus(), 100);
            }
        }
    }
});



