// Keyboard Shortcuts System
const shortcuts = {
    'Alt+T': () => toggleTheme(),
    'Alt+L': () => focusLogin(),
    'Alt+D': () => showTab('dashboard'),
    'Alt+P': () => showTab('payments'),
    'Alt+M': () => showTab('medicines'),
    'Alt+U': () => showTab('patients'),
    'Alt+S': () => focusSearch(),
    'Alt+N': () => focusNewRecord(),
    'Escape': () => closeAllModals(),
    'F1': () => showKeyboardShortcuts()
};

// Initialize keyboard shortcuts
document.addEventListener('keydown', function(e) {
    const key = [];
    
    if (e.altKey) key.push('Alt');
    if (e.ctrlKey) key.push('Ctrl');
    if (e.shiftKey) key.push('Shift');
    
    if (e.key === 'Escape') {
        key.push('Escape');
    } else if (e.key === 'F1') {
        key.push('F1');
        e.preventDefault();
    } else if (e.altKey || e.ctrlKey) {
        key.push(e.key.toUpperCase());
    }
    
    const shortcut = key.join('+');
    
    if (shortcuts[shortcut]) {
        e.preventDefault();
        shortcuts[shortcut]();
    }
});

function focusLogin() {
    const usernameField = document.getElementById('username');
    if (usernameField) usernameField.focus();
}

function focusSearch() {
    const searchField = document.getElementById('searchPayment') || 
                       document.getElementById('searchMedicine') || 
                       document.getElementById('searchPatient');
    if (searchField) searchField.focus();
}

function focusNewRecord() {
    const firstInput = document.querySelector('form input:not([type="hidden"])');
    if (firstInput) firstInput.focus();
}

function closeAllModals() {
    const modals = document.querySelectorAll('.modal.show');
    modals.forEach(modal => modal.classList.remove('show'));
    
    // Also close shortcuts modal
    const shortcutsModal = document.getElementById('shortcutsModal');
    if (shortcutsModal) shortcutsModal.classList.remove('show');
    
    const editModal = document.getElementById('editModal');
    if (editModal) editModal.classList.remove('show');
}

function showKeyboardShortcuts() {
    const modal = document.getElementById('shortcutsModal');
    if (modal) {
        modal.classList.add('show');
    } else {
        // Create modal if it doesn't exist
        const modalHTML = `
            <div id="shortcutsModal" class="modal show">
                <div class="modal-content">
                    <span class="close" onclick="closeShortcutsModal()">&times;</span>
                    <h2><i class="fas fa-keyboard"></i> Keyboard Shortcuts</h2>
                    <div class="shortcuts-grid">
                        <div class="shortcut-item">
                            <kbd>Alt</kbd> + <kbd>T</kbd>
                            <span>Toggle Dark Mode</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>Alt</kbd> + <kbd>L</kbd>
                            <span>Focus Login/Search</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>Alt</kbd> + <kbd>D</kbd>
                            <span>Dashboard Tab</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>Alt</kbd> + <kbd>P</kbd>
                            <span>Payments Tab</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>Alt</kbd> + <kbd>M</kbd>
                            <span>Medicines Tab</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>Alt</kbd> + <kbd>U</kbd>
                            <span>Patients Tab</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>Alt</kbd> + <kbd>S</kbd>
                            <span>Focus Search</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>Alt</kbd> + <kbd>N</kbd>
                            <span>New Record</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>Esc</kbd>
                            <span>Close Modals</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>F1</kbd>
                            <span>Show Shortcuts</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
}

function closeShortcutsModal() {
    const modal = document.getElementById('shortcutsModal');
    if (modal) modal.classList.remove('show');
}

function showSystemInfo() {
    const info = `
System Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Application: Medical Store Pro v2.0
Browser: ${navigator.userAgent}
Platform: ${navigator.platform}
Language: ${navigator.language}
Online: ${navigator.onLine ? 'Yes' : 'No'}
Cookie Enabled: ${navigator.cookieEnabled ? 'Yes' : 'No'}
Screen: ${screen.width}x${screen.height}
Color Depth: ${screen.colorDepth}-bit
Time Zone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}

Features Enabled:
✓ Dark Mode
✓ Offline Support
✓ Real-time Sync
✓ Voice Commands
✓ Keyboard Shortcuts
✓ Two-Factor Auth
✓ Data Encryption
    `;
    
    alert(info);
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        showKeyboardShortcuts, 
        closeShortcutsModal, 
        showSystemInfo,
        closeAllModals
    };
}
