import webpush from 'web-push';
import { prisma } from '../prisma';
import { getIo } from '../io';

let vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
};

if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  console.warn('⚠️ VAPID keys not configured in .env. Generating temporary VAPID keys for development...');
  const generated = webpush.generateVAPIDKeys();
  vapidKeys = {
    publicKey: generated.publicKey,
    privateKey: generated.privateKey
  };
}

webpush.setVapidDetails(
  'mailto:support@weorder.com',
  vapidKeys.publicKey!,
  vapidKeys.privateKey!
);

export const getVapidPublicKey = () => vapidKeys.publicKey;

export const notificationService = {
  sendPushNotification: async (
    userIds: string[],
    payload: { title: string; body: string; data?: any },
    category: 'chat' | 'roomStatus' | 'settlement'
  ) => {
    try {
      // 0. Save in-app notification records to the database for all target users
      const notificationsData = userIds.map((uId) => ({
        userId: uId,
        title: payload.title,
        body: payload.body,
        type: category === 'chat' ? 'CHAT' : category === 'roomStatus' ? 'ROOM_STATUS' : 'SETTLEMENT',
        targetId: payload.data?.roomId || null,
      }));

      if (notificationsData.length > 0) {
        await prisma.notification.createMany({
          data: notificationsData
        }).catch((err) => {
          console.error('❌ Failed to save in-app notifications to DB:', err);
        });

        // Broadcast real-time WebSocket signals to online users
        try {
          const io = getIo();
          userIds.forEach((uId) => {
            io.to(`user:${uId}`).emit('notification:new');
          });
        } catch (ioErr) {
          // Socket.io is not initialized in off-line scripts or migrations
        }
      }

      // 1. Get all active subscriptions for the target users, including user settings
      const subscriptions = await prisma.pushSubscription.findMany({
        where: {
          userId: { in: userIds }
        },
        include: {
          user: true
        }
      });

      if (subscriptions.length === 0) return;

      // 2. Loop through and deliver notifications
      const webNotifications: Promise<any>[] = [];
      const appSubscriptions: typeof subscriptions = [];

      for (const sub of subscriptions) {
        // Filter based on user preferences
        if (category === 'chat' && !sub.user.notifyChat) continue;
        if (category === 'roomStatus' && !sub.user.notifyRoomStatus) continue;
        if (category === 'settlement' && !sub.user.notifySettlement) continue;

        if (sub.type === 'WEB') {
          // Prepare Web Push payload
          const pushPayload = JSON.stringify({
            title: payload.title,
            body: payload.body,
            data: payload.data,
            icon: '/icons/icon-192.png',
            badge: '/favicon.svg'
          });

          const webSub = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh || '',
              auth: sub.auth || ''
            }
          };

          // Send and catch obsolete subscription errors (410 Gone / 404 Not Found)
          const p = webpush.sendNotification(webSub, pushPayload)
            .catch(async (err) => {
              if (err.statusCode === 410 || err.statusCode === 404) {
                console.log(`🧹 Deleting expired PWA subscription: ${sub.id}`);
                await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
              } else {
                console.error(`❌ Web Push error for subscription ${sub.id}:`, err);
              }
            });
          webNotifications.push(p);
        } else if (sub.type === 'APP') {
          appSubscriptions.push(sub);
        }
      }

      // 3. Dispatch Web notifications in parallel
      await Promise.all(webNotifications);

      // 4. Batch dispatch Expo Native app notifications
      if (appSubscriptions.length > 0) {
        const expoMessages = appSubscriptions.map((sub) => ({
          to: sub.endpoint, // Expo push token
          title: payload.title,
          body: payload.body,
          data: payload.data,
          sound: 'default'
        }));

        // Send to Expo Push API using native fetch
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(expoMessages)
        }).then(async (res) => {
          if (!res.ok) {
            const errorBody = await res.text();
            console.error('❌ Expo Push API error:', errorBody);
          }
        }).catch((err: any) => {
          console.error('❌ Expo Push API network error:', err);
        });
      }
    } catch (error) {
      console.error('❌ Error sending push notifications:', error);
    }
  }
};
