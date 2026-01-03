// PWA Installation & Setup
class MobileApp {
    constructor() {
        this.deferredPrompt = null;
        this.isInstalled = false;
        this.isOnline = navigator.onLine;
        this.init();
    }

    async init() {
        // Register Service Worker
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('./service-worker.js', {
                    scope: '/'
                });
                console.log('[PWA] Service Worker registered successfully:', registration);
                
                // Check for updates periodically
                setInterval(() => registration.update(), 60000);
                
                // Handle controller change (app updated)
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    this.showUpdatePrompt();
                });
            } catch (error) {
                console.log('[PWA] Service Worker registration failed:', error);
            }
        }

        // Setup install event listeners
        this.setupInstallPrompt();
        
        // Setup online/offline listeners
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Setup notification permissions
        this.requestNotificationPermission();
        
        // Setup periodic background sync
        this.setupBackgroundSync();
        
        // Check if app is installed
        this.checkIfInstalled();
        
        // Add mobile UI enhancements
        this.enhanceMobileUI();
    }

    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent the mini-infobar from appearing
            e.preventDefault();
            // Stash the event for later use
            this.deferredPrompt = e;
            console.log('[PWA] Install prompt ready');
            
            // Show install button
            const installBtn = document.getElementById('installAppBtn');
            if (installBtn) {
                installBtn.style.display = 'flex';
            }
        });

        window.addEventListener('appinstalled', () => {
            console.log('[PWA] App installed successfully');
            this.isInstalled = true;
            const installBtn = document.getElementById('installAppBtn');
            if (installBtn) {
                installBtn.style.display = 'none';
            }
            this.showToast('Medical Store Pro installed! 🎉', 'success');
        });
    }

    async installApp() {
        if (!this.deferredPrompt) {
            return;
        }

        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        console.log(`[PWA] User response to install prompt: ${outcome}`);
        this.deferredPrompt = null;
    }

    handleOnline() {
        this.isOnline = true;
        console.log('[PWA] App is online');
        this.updateOnlineStatus();
        this.syncPendingData();
        this.showToast('Back online! 🌐', 'success');
    }

    handleOffline() {
        this.isOnline = false;
        console.log('[PWA] App is offline');
        this.updateOnlineStatus();
        this.showToast('You are offline. Changes will sync when online. 📵', 'warning');
    }

    updateOnlineStatus() {
        const statusIndicator = document.getElementById('onlineStatus');
        if (statusIndicator) {
            statusIndicator.innerHTML = this.isOnline 
                ? '<i class="fas fa-wifi"></i> Online' 
                : '<i class="fas fa-wifi-slash"></i> Offline';
            statusIndicator.className = this.isOnline ? 'online' : 'offline';
        }
    }

    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('[PWA] Notification permission granted');
            }
        }
    }

    async setupBackgroundSync() {
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            try {
                const registration = await navigator.serviceWorker.ready;
                await registration.sync.register('sync-payments');
                console.log('[PWA] Background sync registered');
            } catch (error) {
                console.log('[PWA] Background sync setup failed:', error);
            }
        }
    }

    checkIfInstalled() {
        if (window.matchMedia('(display-mode: standalone)').matches) {
            this.isInstalled = true;
            console.log('[PWA] App is running in standalone mode');
        }
    }

    enhanceMobileUI() {
        // Prevent zoom on input focus (mobile specific)
        document.addEventListener('touchmove', (e) => {
            if (e.scale !== 1) {
                e.preventDefault();
            }
        }, { passive: false });

        // Add safe area support for notch devices
        const metaViewport = document.querySelector('meta[name="viewport"]');
        if (metaViewport) {
            metaViewport.setAttribute('content', 
                'width=device-width, initial-scale=1, viewport-fit=cover');
        }

        // Optimize for touch devices
        document.documentElement.style.touchAction = 'manipulation';

        // Add viewport-height custom property for mobile devices
        const updateVH = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        updateVH();
        window.addEventListener('resize', updateVH);
    }

    showUpdatePrompt() {
        const message = 'A new version of Medical Store Pro is available!';
        const actionText = 'Update';
        
        if (confirm(`${message}\n\nReload to update?`)) {
            window.location.reload();
        }
    }

    async syncPendingData() {
        // Sync pending payments, medicines, etc.
        if ('indexedDB' in window) {
            try {
                console.log('[PWA] Syncing pending data...');
                // Sync logic here
            } catch (error) {
                console.log('[PWA] Sync error:', error);
            }
        }
    }

    showToast(message, type = 'info') {
        // Use existing toast function if available
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // Share API support
    async shareData(title, text, url) {
        if ('share' in navigator) {
            try {
                await navigator.share({
                    title,
                    text,
                    url
                });
            } catch (error) {
                console.log('[PWA] Share failed:', error);
            }
        }
    }

    // Request screen wake lock (keep screen on)
    async requestWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                const wakeLock = await navigator.wakeLock.request('screen');
                console.log('[PWA] Wake lock acquired');
                return wakeLock;
            }
        } catch (error) {
            console.log('[PWA] Wake lock request failed:', error);
        }
    }

    // Get device info
    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            isOnline: this.isOnline,
            isInstalled: this.isInstalled,
            language: navigator.language,
            hardwareConcurrency: navigator.hardwareConcurrency,
            deviceMemory: navigator.deviceMemory,
            maxTouchPoints: navigator.maxTouchPoints
        };
    }

    // Camera access for QR code scanning
    async startQRCodeScanner() {
        if ('mediaDevices' in navigator) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });
                return stream;
            } catch (error) {
                console.log('[PWA] Camera access denied:', error);
                this.showToast('Camera access denied', 'error');
            }
        }
    }
}

// Initialize PWA when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.mobileApp = new MobileApp();
    });
} else {
    window.mobileApp = new MobileApp();
}
