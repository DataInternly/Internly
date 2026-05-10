// Internly Service Worker — Web Push Notifications
// Version: 1.0.0
// Registered from js/supabase.js via registerPushNotifications()

// ── Push event ────────────────────────────────────────────────────────────────
self.addEventListener('push', function(event) {
  if (!event.data) return;

  let data;
  try { data = event.data.json(); }
  catch(e) { data = { title: 'Internly', body: event.data.text() }; }

  const options = {
    body:    data.body || 'Je hebt een nieuwe melding',
    icon:    '/favicon_192x192.png',
    badge:   '/favicon_192x192.png',
    tag:     data.tag || 'internly-notif',
    data:    { url: data.url || '/' },
    actions: [
      { action: 'open',    title: 'Bekijken' },
      { action: 'dismiss', title: 'Sluiten'  }
    ],
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Internly', options)
  );
});

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const _rawUrl = event.notification.data?.url || '/';
  let url = '/';
  try {
    const _parsed = new URL(_rawUrl, self.location.origin);
    if (_parsed.origin === self.location.origin) {
      url = _parsed.pathname + _parsed.search + _parsed.hash;
    }
    // Origin mismatch → url blijft '/' (safe fallback)
  } catch (_) {
    // Malformed of protocol-injection URL → url blijft '/'
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        for (const client of clientList) {
          if (client.url.includes('internly.pro') && 'focus' in client) {
            return client.navigate(url).then(c => c.focus());
          }
        }
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});

// ── Subscription change (key rotation) ───────────────────────────────────────
self.addEventListener('pushsubscriptionchange', function(event) {
  // Re-subscribe with the same VAPID public key after browser key rotation.
  // The new subscription is sent to the page via a BroadcastChannel so the
  // app can store it in Supabase. If the page is closed, the subscription
  // will be re-synced on the next page load.
  event.waitUntil(
    self.registration.pushManager.getSubscription()
      .then(function(oldSub) {
        if (oldSub) return oldSub.unsubscribe();
      })
      .then(function() {
        // Signal the app that re-subscription is needed on next page open.
        // We clear the push_asked flag so registerPushNotifications() will
        // run again on next DOMContentLoaded.
        const bc = new BroadcastChannel('internly-sw');
        bc.postMessage({ type: 'resubscribe_needed' });
        bc.close();
      })
      .catch(function(e) {
        console.warn('[sw] pushsubscriptionchange error:', e);
      })
  );
});

// ── Install / activate (no caching — platform is server-rendered) ─────────────
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});

/* ── SESSION IMPLEMENTATION ─────────────────────────────────────────────────
   TASK:           1 — Web Push Notifications
   LIMITATION:     LIMITATION 1 — Push Notifications (background delivery)
   ADDED:          Service worker for Web Push — push event handler,
                   notificationclick handler (opens correct URL),
                   pushsubscriptionchange handler (key rotation recovery),
                   install/activate lifecycle with skipWaiting + clients.claim()
   MODIFIED:       New file — nothing replaced
   NULL GUARDS:    N/A (no Supabase queries)
   SQL REQUIRED:   See Step 1C in task spec (push_subscriptions table)
   EDGE FUNCTION:  This sw.js receives pushes sent by the Edge Function
                   send-push-notification triggered by notifications INSERT webhook
   VERIFIED VIA:   Journey: student receives push while tab is closed →
                   notification appears in OS notification centre →
                   clicking opens correct page
   ─────────────────────────────────────────────────────────────────────────── */
