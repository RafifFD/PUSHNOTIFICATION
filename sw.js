
// ⏰ UBAH INTERVAL DISINI JUGA (harus sama dengan yang di HTML):
// const NOTIFICATION_INTERVAL = 2 * 60 * 60 * 1000; // 2 jam (production)
const NOTIFICATION_INTERVAL = 30 * 1000; // 30 detik (testing) ⚡
const CACHE_NAME = 'notif-pwa-v2'; // Increment version untuk force update
let intervalId = null;
let nextNotificationTime = null;

self.addEventListener('install', (event) => {
    console.log('[SW] Installing... Version with 30 second interval');
    self.skipWaiting(); // Force activate immediately
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activated - 30 second interval active');
    event.waitUntil(
        clients.claim().then(() => {
            console.log('[SW] All clients claimed');
        })
    );
});

async function showNotification(isTest = false) {
    const title = isTest ? '🧪 Test Notifikasi' : '🔔 Notifikasi Terjadwal';
    const body = isTest 
        ? 'Test notifikasi PWA berhasil!' 
        : 'Reminder otomatis setiap 30 detik (testing mode)';
    
    const options = {
        body: body,
        icon: 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png',
        vibrate: [200, 100, 200, 100, 200],
        tag: isTest ? 'test-notification' : 'scheduled-notification',
        requireInteraction: false,
        data: {
            url: self.location.origin,
            time: Date.now()
        },
        actions: [
            { action: 'open', title: 'Buka App' },
            { action: 'close', title: 'Tutup' }
        ]
    };

    try {
        await self.registration.showNotification(title, options);
        
        const allClients = await clients.matchAll({ includeUncontrolled: true });
        allClients.forEach(client => {
            client.postMessage({
                type: 'notification-sent',
                isTest: isTest,
                timestamp: Date.now()
            });
        });
        
        console.log('[SW] Notification sent:', new Date().toLocaleString());
    } catch (error) {
        console.error('[SW] Notification error:', error);
    }
}

function startSchedule() {
    console.log('[SW] Starting notification schedule with 30 SECOND interval...');
    
    if (intervalId) {
        clearInterval(intervalId);
        console.log('[SW] Cleared previous interval');
    }
    
    // Kirim notifikasi pertama LANGSUNG
    console.log('[SW] Sending first notification NOW');
    showNotification(false);
    nextNotificationTime = Date.now() + NOTIFICATION_INTERVAL;
    
    // Schedule interval berikutnya
    intervalId = setInterval(() => {
        console.log('[SW] Interval triggered - sending notification');
        showNotification(false);
        nextNotificationTime = Date.now() + NOTIFICATION_INTERVAL;
    }, NOTIFICATION_INTERVAL);
    
    console.log('[SW] Schedule started. Next notification in 30 seconds');
    console.log('[SW] Interval ID:', intervalId);
}

function stopSchedule() {
    console.log('[SW] Stopping schedule...');
    
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    
    nextNotificationTime = null;
    
    self.registration.getNotifications().then(notifications => {
        notifications.forEach(notification => notification.close());
    });
}

self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);
    
    if (event.data.type === 'start') {
        startSchedule();
    } else if (event.data.type === 'stop') {
        stopSchedule();
    } else if (event.data.type === 'test') {
        showNotification(true);
    } else if (event.data.type === 'get-status') {
        event.ports[0].postMessage({
            isRunning: intervalId !== null,
            nextNotificationTime: nextNotificationTime
        });
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'close') {
        return;
    }
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                for (let client of clientList) {
                    if ('focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
    );
});

self.addEventListener('notificationclose', (event) => {
    console.log('[SW] Notification closed');
});

// Keep alive - periodic sync
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync triggered');
    if (event.tag === 'notification-sync') {
        event.waitUntil(showNotification(false));
    }
});
