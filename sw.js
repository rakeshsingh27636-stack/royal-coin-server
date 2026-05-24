self.addEventListener('install', (e) => {
    console.log('[Royal Casino] Service Worker Installed - App is ready for Home Screen!');
});

self.addEventListener('fetch', (e) => {
    // Basic fetch event to pass PWA requirements
});