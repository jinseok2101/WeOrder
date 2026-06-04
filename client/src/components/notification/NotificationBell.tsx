import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { notificationsApi } from '../../api/notifications';
import { connectSocket } from '../../socket/socket';
import { useAuthStore } from '../../store/authStore';
import NotificationDrawer from './NotificationDrawer';

export default function NotificationBell() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    refetchOnWindowFocus: true,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    if (!token) return;
    const socket = connectSocket(token);

    const handleNewNotification = () => {
      // Invalidate query to trigger automatic real-time refetch
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [token, queryClient]);

  return (
    <>
      <button
        onClick={() => setIsDrawerOpen(true)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
        title="알림 보관함"
      >
        <Bell size={18} className="text-gray-500 hover:text-gray-700 transition-colors" />
        
        {/* Unread Indicator - Red Dot */}
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse" />
        )}
      </button>

      <NotificationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        notifications={notifications}
      />
    </>
  );
}
