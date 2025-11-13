/* eslint-disable no-restricted-globals */

console.log('Service Worker script loaded');

// Listen for push events
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push event received!', event);
  console.log('[Service Worker] Push data:', event.data ? event.data.text() : 'No data');
  
  let notificationData = {
    title: 'New Notification',
    body: 'You have a new message',
    icon: '/logo192.png'
  };

  if (event.data) {
    try {
      const dataText = event.data.text();
      console.log('[Service Worker] Raw push data:', dataText);
      notificationData = JSON.parse(dataText);
      console.log('[Service Worker] Parsed notification data:', notificationData);
    } catch (e) {
      console.error('[Service Worker] Error parsing notification data:', e);
    }
  }

  console.log('[Service Worker] Showing notification:', notificationData);
  
  // Check if any client is focused
  const promiseChain = self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then(clients => {
    const isAnyClientFocused = clients.some(client => client.focused);
    console.log('[Service Worker] Any client focused?', isAnyClientFocused);
    console.log('[Service Worker] Total clients:', clients.length);
    
    // Always show notification regardless of focus state
    // This ensures notifications work even when page is active
    return self.registration.showNotification(
      notificationData.title,
      {
        body: notificationData.body,
        icon: notificationData.icon,
        badge: '/logo192.png',
        vibrate: [200, 100, 200],
        tag: 'notification-' + Date.now(), // Unique tag to prevent grouping
        requireInteraction: false,
        // Force notification to show even when page is focused
        silent: false
      }
    );
  }).then(() => {
    console.log('[Service Worker] ✅ Notification shown successfully!');
  }).catch((error) => {
    console.error('[Service Worker] ❌ Error showing notification:', error);
    // Try showing notification anyway as fallback
    return self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon
    });
  });

  event.waitUntil(promiseChain);
});

// Listen for notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  // Open the app or focus existing window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // If a window is already open, focus it
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise, open a new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Listen for messages from the app
self.addEventListener('message', function(event) {
  console.log('[Service Worker] Message received:', event.data);
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Service worker installation
self.addEventListener('install', function(event) {
  console.log('[Service Worker] Installing...');
  self.skipWaiting();
});

// Service worker activation
self.addEventListener('activate', function(event) {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    clients.claim().then(() => {
      console.log('[Service Worker] Now controlling all pages');
      return self.clients.matchAll({ type: 'window' });
    }).then(clients => {
      console.log('[Service Worker] Active and controlling', clients.length, 'client(s)');
    })
  );
});
