const express = require('express');
const cors = require('cors');
const webpush = require('web-push');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Store subscriptions (in production, use a database)
const subscriptions = [];

// Generate VAPID keys if not present
// Run: node -e "console.log(require('web-push').generateVAPIDKeys())"
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || ''
};

if (vapidKeys.publicKey && vapidKeys.privateKey) {
  webpush.setVapidDetails(
    'mailto:your-email@example.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
}

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Push Notification Server Running' });
});

// Get VAPID public key
app.get('/api/vapid-public-key', (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

// Subscribe endpoint
app.post('/api/subscribe', (req, res) => {
  const subscription = req.body;
  
  if (!subscriptions.find(sub => sub.endpoint === subscription.endpoint)) {
    subscriptions.push(subscription);
  }
  
  res.status(201).json({ message: 'Subscription added successfully' });
});

// Send notification endpoint
app.post('/api/send-notification', async (req, res) => {
  const { title, body, icon } = req.body;

  console.log('Sending notification to', subscriptions.length, 'subscribers');
  console.log('Notification details:', { title, body, icon });
  
  const payload = JSON.stringify({
    title: title || 'Test Notification',
    body: body || 'This is a test notification',
    icon: icon || '/logo192.png'
  });

  const promises = subscriptions.map(subscription => {
    console.log('Sending notification to:', subscription.endpoint);
    return webpush.sendNotification(subscription, payload)
      .then(response => {
        console.log('Notification sent successfully:', response.statusCode);
      })
      .catch(error => {
        console.error('Error sending notification:', error.statusCode, error.body);
      });
  });

  try {
    await Promise.all(promises);
    res.json({ message: `Notification sent to ${subscriptions.length} subscribers` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send notifications' });
  }
});

// Get subscriptions count
app.get('/api/subscriptions/count', (req, res) => {
  res.json({ count: subscriptions.length });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('\nTo generate VAPID keys, run:');
  console.log('node -e "console.log(require(\'web-push\').generateVAPIDKeys())"');
});
