// Firebase Cloud Messaging Service Worker
// Handles background notifications when app is not in focus

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in service worker
firebase.initializeApp({
  apiKey: "AIzaSyDowMTLQTSbyIU4OsdVPGhNhbSF1ncnyKE",
  authDomain: "tutorly-4c9a8.firebaseapp.com",
  projectId: "tutorly-4c9a8",
  storageBucket: "tutorly-4c9a8.firebasestorage.app",
  messagingSenderId: "591266753222",
  appId: "1:591266753222:web:2134a7b293876e3ace85c7"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: payload.notification?.icon || '/icons/notification-icon.png',
    badge: '/icons/badge-icon.png',
    tag: payload.data?.type || 'default',
    data: payload.data,
    requireInteraction: payload.data?.priority === 'high',
    actions: [],
  };

  // Add action buttons based on notification type
  if (payload.data?.type === 'batch_assignment' || payload.data?.type === 'assignment_new') {
    notificationOptions.actions = [
      { action: 'view', title: 'View Details', icon: '/icons/view-icon.png' },
      { action: 'dismiss', title: 'Dismiss', icon: '/icons/dismiss-icon.png' },
    ];
  }

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click:', event);
  
  event.notification.close();

  const clickAction = event.notification.data?.clickAction || '/delivery';
  
  // Handle action buttons
  if (event.action === 'dismiss') {
    return;
  }

  // Open/focus app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(clickAction) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(clickAction);
      }
    })
  );
});

// Handle push event (fallback)
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push event:', event);
});
