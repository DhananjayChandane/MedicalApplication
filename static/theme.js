// Theme Management System
const THEME_KEY = 'medicalStoreTheme';

// Initialize theme on page load
function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
    applyTheme(savedTheme);
    
    // Ensure theme is applied immediately
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
            applyTheme(savedTheme);
        });
    }
}

function toggleTheme() {
    const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    
    // Update all theme-dependent elements
    updateThemeDependentElements();
}

function applyTheme(theme) {
    const themeIcon = document.getElementById('themeIcon');
    
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        if (themeIcon) {
            themeIcon.className = 'fas fa-sun';
        }
    } else {
        document.body.classList.remove('dark-mode');
        if (themeIcon) {
            themeIcon.className = 'fas fa-moon';
        }
    }
}

// Update theme-dependent elements
function updateThemeDependentElements() {
    // Update any theme-dependent elements here
    // For example, charts, modals, etc.
    
    // Refresh any theme-dependent components
    if (typeof refreshThemeDependentComponents === 'function') {
        refreshThemeDependentComponents();
    }
}

// Password toggle functionality
function togglePassword(fieldId = 'password') {
    const passwordField = document.getElementById(fieldId);
    const icon = document.getElementById(fieldId + 'Icon');
    
    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        if (icon) icon.className = 'fas fa-eye-slash';
    } else {
        passwordField.type = 'password';
        if (icon) icon.className = 'fas fa-eye';
    }
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initTheme, toggleTheme, applyTheme, togglePassword };
}
