// Service Worker untuk Push Notification
const INTERVAL = 2 * 60 * 60 * 1000; // 2 jam
let intervalId = null;

self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activated');
    event.waitUntil(clients.claim());
});

async function showNotification(isTest = false) {
    const title = isTest ? '🧪 Test Notifikasi' : '🔔 Notifikasi Terjadwal';
    const body = isTest ? 'Test notifikasi berhasil!' : 'Notifikasi otomatis setiap 2 jam. Tetap produktif! 💪';
    
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
        }
    };

    try {
        await self.registration.showNotification(title, options);
        
        // Broadcast ke clients
        const allClients = await clients.matchAll();
        allClients.forEach(client => {
            client.postMessage({
                type: 'notification-sent',
                isTest: isTest,
                timestamp: Date.now()
            });
        });
        
        console.log('[SW] Notification sent:', new Date().toLocaleString());
    } catch (error) {
        console.error('[SW] Error showing notification:', error);
    }
}

function startSchedule() {
    if (intervalId) clearInterval(intervalId);
    
    // Kirim notifikasi pertama
    showNotification(false);
    
    // Schedule notifikasi berikutnya
    intervalId = setInterval(() => {
        showNotification(false);
    }, INTERVAL);
    
    console.log('[SW] Schedule started');
}

function stopSchedule() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    
    // Close semua notifikasi yang ada
    self.registration.getNotifications().then(notifications => {
        notifications.forEach(notification => notification.close());
    });
    
    console.log('[SW] Schedule stopped');
}

self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data.type);
    
    if (event.data.type === 'start') {
        startSchedule();
    } else if (event.data.type === 'test') {
        showNotification(true);
    } else if (event.data.type === 'stop') {
        stopSchedule();
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
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
