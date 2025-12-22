// Service Worker untuk Push Notification
const NOTIFICATION_INTERVAL = 2 * 60 * 60 * 1000; // 2 jam dalam milidetik
const NOTIFICATION_TAG = 'scheduled-notification';

// Event saat service worker diinstall
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    self.skipWaiting();
});

// Event saat service worker aktif
self.addEventListener('activate', (event) => {
    console.log('Service Worker activated');
    event.waitUntil(clients.claim());
});

// Fungsi untuk mengirim notifikasi
async function sendNotification() {
    const options = {
        body: 'Ini adalah notifikasi otomatis setiap 2 jam. Klik untuk membuka aplikasi.',
        icon: 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png',
        vibrate: [200, 100, 200],
        tag: NOTIFICATION_TAG,
        requireInteraction: false,
        data: {
            timestamp: Date.now(),
            url: self.location.origin
        },
        actions: [
            {
                action: 'open',
                title: 'Buka Aplikasi'
            },
            {
                action: 'close',
                title: 'Tutup'
            }
        ]
    };

    try {
        await self.registration.showNotification('🔔 Notifikasi Terjadwal', options);
        
        // Broadcast ke semua clients
        const allClients = await clients.matchAll();
        allClients.forEach(client => {
            client.postMessage({
                type: 'notification-sent',
                timestamp: Date.now()
            });
        });

        console.log('Notification sent at', new Date().toLocaleString());
    } catch (error) {
        console.error('Error showing notification:', error);
    }
}

// Handle message dari main thread
self.addEventListener('message', (event) => {
    console.log('SW received message:', event.data);
    
    if (event.data.type === 'start-notifications') {
        sendNotification(); // Kirim notifikasi pertama
    } else if (event.data.type === 'test-notification') {
        sendNotification();
    } else if (event.data.type === 'stop-notifications') {
        // Clear semua notifikasi yang ada
        self.registration.getNotifications().then(notifications => {
            notifications.forEach(notification => notification.close());
        });
    }
});

// Handle klik pada notifikasi
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'close') {
        return;
    }
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Cek apakah ada window yang sudah terbuka
                for (let client of clientList) {
                    if ('focus' in client) {
                        return client.focus();
                    }
                }
                // Buka window baru jika tidak ada
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
    );
});

// Handle notifikasi ditutup
self.addEventListener('notificationclose', (event) => {
    console.log('Notification closed:', event.notification.tag);
});
