import React, { useEffect } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react-native';
import { notificationsApi } from '../../api/notifications';
import { getSocket } from '../../socket/socket';

export default function NotificationBell() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewNotification = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [queryClient]);

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Notifications')}
      className="p-2 rounded-full relative"
      activeOpacity={0.7}
    >
      <Bell size={18} color="#6b7280" />
      
      {/* Red Dot Unread Badge */}
      {unreadCount > 0 && (
        <View 
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#ef4444',
            borderWidth: 1,
            borderColor: '#ffffff',
          }}
        />
      )}
    </TouchableOpacity>
  );
}
