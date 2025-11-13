import React, { useState } from 'react';
import './App.css';
import useWebPushNotifications from './useWebPushNotifications';

function App() {
  const [notificationTitle, setNotificationTitle] = useState('Hello!');
  const [notificationBody, setNotificationBody] = useState('This is a test notification');

  const API_URL = 'http://localhost:5000';
  
  const {
    isSubscribed,
    permissionStatus,
    subscriptionCount,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    sendNotification,
    testLocalNotification
  } = useWebPushNotifications(API_URL);

  const handleSubscribe = async () => {
    const success = await subscribe();
    if (success) {
      alert('Successfully subscribed to notifications!');
    } else if (error) {
      alert(error);
    }
  };

  const handleUnsubscribe = async () => {
    const success = await unsubscribe();
    if (success) {
      alert('Successfully unsubscribed from notifications!');
    } else if (error) {
      alert(error);
    }
  };

  const handleSendNotification = async () => {
    const result = await sendNotification(notificationTitle, notificationBody);
    if (result.success) {
      alert(result.message);
    } else {
      alert('Failed to send notification: ' + result.error);
    }
  };

  const handleTestLocalNotification = async () => {
    await testLocalNotification(
      'Test Local Notification',
      'This is a local test - if you see this, service worker can show notifications'
    );
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🔔 Web Push Notifications POC</h1>
        
        <div className="status-section">
          <p>Status: {isSubscribed ? '✅ Subscribed' : '❌ Not Subscribed'}</p>
          <p>Notification Permission: {
            permissionStatus === 'granted' ? '✅ Granted' :
            permissionStatus === 'denied' ? '❌ Denied' :
            '⚠️ Not requested'
          }</p>
          <p>Total Subscribers: {subscriptionCount}</p>
        </div>

        <div className="button-section">
          {!isSubscribed ? (
            <button onClick={handleSubscribe} className="subscribe-btn" disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Enable Notifications'}
            </button>
          ) : (
            <button onClick={handleUnsubscribe} className="unsubscribe-btn" disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Disable Notifications'}
            </button>
          )}
        </div>

        {error && (
          <div className="error-section" style={{color: 'red', padding: '10px', margin: '10px 0'}}>
            ⚠️ {error}
          </div>
        )}

        {isSubscribed && (
          <div className="notification-form">
            <h2>Send Test Notification</h2>
            <input
              type="text"
              placeholder="Notification Title"
              value={notificationTitle}
              onChange={(e) => setNotificationTitle(e.target.value)}
            />
            <textarea
              placeholder="Notification Body"
              value={notificationBody}
              onChange={(e) => setNotificationBody(e.target.value)}
            />
            <button onClick={handleSendNotification} className="send-btn" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Push Notification (via Server)'}
            </button>
            <button onClick={handleTestLocalNotification} className="send-btn" style={{marginTop: '10px'}} disabled={isLoading}>
              Test Local Notification (Direct)
            </button>
          </div>
        )}

        <div className="info-section">
          <h3>How it works:</h3>
          <ol>
            <li>Click "Enable Notifications" to subscribe</li>
            <li>Grant permission when prompted by your browser</li>
            <li>Use the form to send test notifications</li>
            <li>Notifications will appear even if the tab is in the background</li>
          </ol>
          
          <h3>Debugging:</h3>
          <p><strong>IMPORTANT:</strong> Service Worker logs are in a separate console!</p>
          <ol>
            <li>Open DevTools → Application → Service Workers</li>
            <li>Find your service worker and check if it's "activated and running"</li>
            <li>Look for a link/ID under the service worker - click it to open SW console</li>
            <li>The push event logs will appear in the SW console, NOT the main console!</li>
          </ol>
          <p>Test order:</p>
          <ol>
            <li>Click "Test Local Notification" - should work immediately</li>
            <li>Click "Send Push Notification" - check SW console for push event logs</li>
          </ol>
        </div>
      </header>
    </div>
  );
}

export default App;
