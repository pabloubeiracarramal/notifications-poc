# Web Push Notifications POC

A proof of concept for implementing web push notifications using React (frontend) and Node.js with Express (backend).

## Project Structure

```
notifications-poc/
├── backend/          # Node.js Express server
│   ├── index.js     # Main server file
│   ├── package.json
│   └── .env.example
└── frontend/         # React application
    ├── src/
    │   ├── App.js   # Main React component
    │   └── App.css  # Styling
    ├── public/
    │   └── service-worker.js  # Service worker for push notifications
    └── package.json
```

## Setup Instructions

### 1. Generate VAPID Keys

VAPID keys are required for push notifications. Generate them by running:

```bash
cd backend
node -e "console.log(require('web-push').generateVAPIDKeys())"
```

### 2. Configure Backend

1. Copy `.env.example` to `.env`:
   ```bash
   cd backend
   copy .env.example .env
   ```

2. Add your generated VAPID keys to `.env`:
   ```
   PORT=5000
   VAPID_PUBLIC_KEY=your_generated_public_key
   VAPID_PRIVATE_KEY=your_generated_private_key
   ```

### 3. Start Backend Server

```bash
cd backend
npm run dev
```

The server will start on http://localhost:5000

### 4. Start Frontend Application

```bash
cd frontend
npm start
```

The React app will start on http://localhost:3000

## How to Use

1. Open http://localhost:3000 in your browser
2. Click "Enable Notifications" button
3. Grant notification permissions when prompted
4. Once subscribed, you can:
   - Send test notifications using the form
   - See the total number of subscribers
   - Receive notifications even when the tab is in the background

## Features

- ✅ Subscribe/Unsubscribe to push notifications
- ✅ Send custom notifications with title and body
- ✅ Service Worker for handling push events
- ✅ VAPID authentication
- ✅ Track subscription count
- ✅ CORS enabled for development

## API Endpoints

### Backend (http://localhost:5000)

- `GET /` - Health check
- `GET /api/vapid-public-key` - Get VAPID public key
- `POST /api/subscribe` - Subscribe to notifications
- `POST /api/send-notification` - Send notification to all subscribers
- `GET /api/subscriptions/count` - Get total subscriber count

## Technologies Used

### Frontend
- React
- Service Workers API
- Push API
- Notifications API

### Backend
- Node.js
- Express
- web-push (for sending push notifications)
- CORS
- dotenv

## Browser Compatibility

Push notifications are supported in:
- Chrome/Edge (Desktop & Android)
- Firefox (Desktop & Android)
- Safari (Desktop & iOS 16.4+)
- Opera

## Notes

- Subscriptions are stored in memory on the backend (for production, use a database)
- HTTPS is required for push notifications (except for localhost)
- Service Worker must be served from the same origin as the web app

## Troubleshooting

If notifications aren't working:
1. Make sure both backend and frontend are running
2. Check that VAPID keys are properly configured in `.env`
3. Ensure notification permissions are granted in browser
4. Check browser console for errors
5. Verify the service worker is registered (DevTools > Application > Service Workers)
