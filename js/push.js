// js/push.js
// Web Push helpers — load AFTER the Supabase CDN, BEFORE the page inline script.
// Does NOT declare a Supabase client. Safe to load on any Pattern-B page.
//
// Exposes three globals:
//   VAPID_PUBLIC_KEY          — base64url VAPID public key
//   urlBase64ToUint8Array()   — converts VAPID key for PushManager.subscribe()
//   registerPushNotifications(dbClient, userId)
//       — fire-and-forget push registration, always safe to call, never throws

const VAPID_PUBLIC_KEY = 'BFf-cKMpdJYQu8zSEQ3yg3F50kl8wmnYtQM0tDxM6fBOixY6kBC1LfZx_8jzMe6oKkkWXd0GVfQ7DLCuMwcf1EY';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output  = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

async function registerPushNotifications(dbClient, userId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[push] Not supported in this browser');
    return false;
  }
  if (!userId) return false;
  if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY.startsWith('REPLACE_')) {
    console.warn('[push] VAPID_PUBLIC_KEY not configured — push skipped');
    return false;
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    if (Notification.permission === 'denied') return false;

    if (Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return false;
    }

    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    const subJson = subscription.toJSON();
    await dbClient.from('push_subscriptions').upsert({
      user_id:  userId,
      endpoint: subJson.endpoint,
      p256dh:   subJson.keys.p256dh,
      auth_key: subJson.keys.auth
    }, { onConflict: 'endpoint' });

    try {
      const bc = new BroadcastChannel('internly-sw');
      bc.onmessage = function(e) {
        if (e.data?.type === 'resubscribe_needed') {
          localStorage.removeItem('internly_push_asked');
        }
      };
    } catch(_) { /* BroadcastChannel not available — ignore */ }

    return true;

  } catch(e) {
    console.warn('[push] Registration failed (non-blocking):', e);
    return false;
  }
}
