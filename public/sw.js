const CACHE_NAME = 'disasterguard-v1';
const OFFLINE_URL = '/offline.html';

// Files to cache for offline functionality
const CACHE_URLS = [
  '/',
  '/training',
  '/resources', 
  '/evacuation',
  '/manifest.json',
  // Add disaster guide resources
  '/guides/cyclone-safety.json',
  '/guides/earthquake-response.json',
  '/guides/flood-management.json',
  '/guides/drought-preparedness.json',
  '/guides/landslide-safety.json',
  '/guides/heatwave-protection.json'
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app shell');
        return cache.addAll(CACHE_URLS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip external requests (APIs, etc.)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        if (response) {
          console.log('Serving from cache:', event.request.url);
          return response;
        }

        return fetch(event.request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response for caching
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // If both cache and network fail, show offline page for navigations
            if (event.request.destination === 'document') {
              return caches.match(OFFLINE_URL);
            }
            
            // For other resources, return a basic response
            return new Response('Offline - Resource not available', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Background sync for incident reports when back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-reports') {
    event.waitUntil(syncIncidentReports());
  }
});

// Push notifications for emergency alerts
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: '/placeholder.svg',
      badge: '/placeholder.svg',
      vibrate: [200, 100, 200],
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: 'View Details'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ],
      data: {
        url: data.url || '/',
        severity: data.severity || 'medium'
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Emergency Alert', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// Sync offline incident reports when connection is restored
async function syncIncidentReports() {
  try {
    // Get offline reports from IndexedDB
    const offlineReports = await getOfflineReports();
    
    for (const report of offlineReports) {
      try {
        // Attempt to sync each report
        await fetch('/api/incident-reports', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(report)
        });
        
        // Remove from offline storage after successful sync
        await removeOfflineReport(report.id);
      } catch (error) {
        console.error('Failed to sync report:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Helper functions for offline storage (simplified)
async function getOfflineReports() {
  // This would interface with IndexedDB to get stored offline reports
  return [];
}

async function removeOfflineReport(id) {
  // This would remove the synced report from IndexedDB
  console.log('Removing offline report:', id);
}