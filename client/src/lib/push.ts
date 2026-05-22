import { authApi } from '../api/auth';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications are not supported in this browser.');
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Push notification permission denied.');
      return;
    }

    // 1. Get VAPID Public Key from server
    const { publicKey } = await authApi.getVapidKey();
    if (!publicKey) {
      console.warn('VAPID public key not returned by server.');
      return;
    }
    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    // 2. Get active Service Worker Registration
    const registration = await navigator.serviceWorker.ready;

    // 3. Subscribe with PushManager
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });

    // 4. Extract keys and auth
    const subJSON = subscription.toJSON();
    const endpoint = subJSON.endpoint;
    const p256dh = subJSON.keys?.p256dh;
    const auth = subJSON.keys?.auth;

    if (endpoint) {
      // 5. Send to backend
      await authApi.subscribePush({
        type: 'WEB',
        endpoint,
        p256dh,
        auth
      });
      console.log('🔔 PWA Web Push Notification subscribed successfully!');
    }
  } catch (error) {
    console.error('❌ Failed to subscribe to PWA Web Push:', error);
  }
}
