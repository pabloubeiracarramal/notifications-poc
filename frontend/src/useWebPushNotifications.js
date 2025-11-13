import { useState, useEffect } from 'react';

const useWebPushNotifications = (apiUrl = 'http://localhost:5000') => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [publicKey, setPublicKey] = useState('');
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const [subscriptionCount, setSubscriptionCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch subscription count from backend
  const fetchSubscriptionCount = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/subscriptions/count`);
      const data = await response.json();
      setSubscriptionCount(data.count);
    } catch (err) {
      console.error('Error fetching subscription count:', err);
    }
  };

  // Convert VAPID key from base64 to Uint8Array
  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Initialize service worker and fetch initial data
  useEffect(() => {
    const initializeServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          // Register service worker with cache-busting
          const registration = await navigator.serviceWorker.register(
            '/service-worker.js?v=' + Date.now()
          );
          
          console.log('Service Worker registered successfully:', registration);
          console.log('Service Worker scope:', registration.scope);
          console.log('Service Worker active:', registration.active);
          
          // Check if service worker is controlling the page
          if (navigator.serviceWorker.controller) {
            console.log('✅ Service Worker is controlling the page - ready to receive push notifications!');
          } else {
            console.log('⚠️ Service Worker is NOT controlling the page yet');
            console.log('Reloading page to activate service worker...');
            
            // Wait for the service worker to become active and then reload
            if (registration.installing) {
              registration.installing.addEventListener('statechange', function(e) {
                if (e.target.state === 'activated') {
                  console.log('Service Worker activated, reloading page...');
                  window.location.reload();
                }
              });
            } else if (registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            } else if (registration.active && !navigator.serviceWorker.controller) {
              window.location.reload();
            }
          }
        } catch (err) {
          console.error('Service Worker registration failed:', err);
          setError('Failed to register service worker');
        }

        // Listen for service worker controller changes
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('✅ Service Worker controller changed - now in control!');
        });
      }
    };

    const initialize = async () => {
      // Initialize service worker
      await initializeServiceWorker();

      // Fetch VAPID public key
      try {
        const response = await fetch(`${apiUrl}/api/vapid-public-key`);
        const data = await response.json();
        setPublicKey(data.publicKey);
      } catch (err) {
        console.error('Error fetching public key:', err);
        setError('Failed to fetch VAPID public key');
      }

      // Check if already subscribed
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const sub = await registration.pushManager.getSubscription();
          setIsSubscribed(sub !== null);
          setSubscription(sub);
          if (sub) {
            console.log('Existing push subscription found:', sub.endpoint);
          }
        } catch (err) {
          console.error('Error checking subscription:', err);
        }
      }

      // Check notification permission
      if ('Notification' in window) {
        setPermissionStatus(Notification.permission);
        console.log('Notification permission status:', Notification.permission);
      }

      // Fetch subscription count
      await fetchSubscriptionCount();
    };

    initialize();
  }, [apiUrl]);

  // Subscribe to push notifications
  const subscribe = async () => {
    if (!publicKey) {
      setError('VAPID public key not available. Make sure the backend is running.');
      return false;
    }

    if (!('serviceWorker' in navigator && 'PushManager' in window)) {
      setError('Push notifications are not supported in your browser');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First, explicitly check and request notification permission
      console.log('Current notification permission:', Notification.permission);
      
      if (Notification.permission === 'denied') {
        setError('Notification permission was denied. Please enable notifications in your browser settings.');
        setIsLoading(false);
        return false;
      }
      
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        console.log('Permission request result:', permission);
        
        if (permission !== 'granted') {
          setError('Notification permission was not granted.');
          setIsLoading(false);
          return false;
        }
      }

      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready;
      console.log('Service Worker is ready, subscribing...');

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      console.log('Push subscription created:', sub);

      // Send subscription to backend
      const response = await fetch(`${apiUrl}/api/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sub)
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription to backend');
      }

      setSubscription(sub);
      setIsSubscribed(true);
      setPermissionStatus(Notification.permission);
      await fetchSubscriptionCount();
      
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Error subscribing:', err);
      setError('Failed to subscribe: ' + err.message);
      setIsLoading(false);
      return false;
    }
  };

  // Unsubscribe from push notifications
  const unsubscribe = async () => {
    if (!subscription) {
      setError('No active subscription found');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      await subscription.unsubscribe();
      setIsSubscribed(false);
      setSubscription(null);
      await fetchSubscriptionCount();
      
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Error unsubscribing:', err);
      setError('Failed to unsubscribe: ' + err.message);
      setIsLoading(false);
      return false;
    }
  };

  // Send a push notification via backend
  const sendNotification = async (title, body, icon = '/logo192.png') => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Sending notification request to backend...');
      console.log('Current subscription:', subscription);
      
      const response = await fetch(`${apiUrl}/api/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, body, icon })
      });

      const data = await response.json();
      console.log('Backend response:', data);
      
      setIsLoading(false);
      return { success: true, message: data.message };
    } catch (err) {
      console.error('Error sending notification:', err);
      setError('Failed to send notification: ' + err.message);
      setIsLoading(false);
      return { success: false, error: err.message };
    }
  };

  // Test local notification (bypasses backend)
  const testLocalNotification = async (title = 'Test Local Notification', body = 'This is a local test') => {
    if (!('serviceWorker' in navigator)) {
      setError('Service Worker not supported');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      console.log('Testing local notification...');
      
      await registration.showNotification(title, {
        body: body,
        icon: '/logo192.png',
        tag: 'test-notification-' + Date.now()
      });
      
      return true;
    } catch (err) {
      console.error('Error showing local notification:', err);
      setError('Failed to show local notification: ' + err.message);
      return false;
    }
  };

  return {
    // State
    isSubscribed,
    subscription,
    permissionStatus,
    subscriptionCount,
    isLoading,
    error,
    
    // Actions
    subscribe,
    unsubscribe,
    sendNotification,
    testLocalNotification,
    fetchSubscriptionCount
  };
};

export default useWebPushNotifications;
