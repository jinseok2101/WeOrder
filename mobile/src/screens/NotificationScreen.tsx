import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BellRing, MessageSquare, CreditCard, X, Trash2, CheckCheck } from 'lucide-react-native';
import { notificationsApi } from '../api/notifications';
import Header from '../components/layout/Header';
import { InAppNotification } from '../types';

export default function NotificationScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
  });

  const readMutation = useMutation({
    mutationFn: notificationsApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const readAllMutation = useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: notificationsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.refetchQueries({ queryKey: ['notifications'] });
    setRefreshing(false);
  };

  const handleNotificationClick = (n: InAppNotification) => {
    if (!n.isRead) {
      readMutation.mutate(n.id);
    }
    if (n.targetId) {
      navigation.navigate('RoomDetail', { id: n.targetId });
    }
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays === 1) return '어제';
    return `${diffDays}일 전`;
  };

  return (
    <View className="flex-1 bg-gray-50 pb-6">
      <Header
        title="알림 보관함"
        showBack
        right={
          notifications.some((n) => !n.isRead) ? (
            <TouchableOpacity
              onPress={() => readAllMutation.mutate()}
              className="px-2 py-1 flex-row items-center gap-0.5"
              activeOpacity={0.7}
            >
              <CheckCheck size={14} color="#ea580c" />
              <Text className="text-[11px] text-primary-600 font-extrabold">모두 읽음</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4 pt-4"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#f97316']} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {notifications.length === 0 ? (
            <View className="flex-1 items-center justify-center py-24 px-6 text-center">
              <View className="w-16 h-16 rounded-full bg-white border border-gray-100 flex items-center justify-center mb-4 shadow-sm">
                <BellRing size={26} color="#d1d5db" />
              </View>
              <Text className="text-sm font-bold text-gray-700">새로운 소식이 없어요</Text>
              <Text className="text-xs text-gray-400 mt-2 text-center leading-relaxed">
                배달 도착 예정 알림이나 이웃의 정산 입금 요청이 도착하면 여기에 소중히 모아드릴게요
              </Text>
            </View>
          ) : (
            <View className="gap-2.5">
              {notifications.map((n) => {
                const isUnread = !n.isRead;
                
                // Color, icon and borders based on type
                let Icon = BellRing;
                let iconBg = 'bg-primary-50';
                let iconColor = '#f97316';
                let cardBorder = isUnread ? 'border-primary-100' : 'border-gray-100';
                let cardBg = isUnread ? 'bg-orange-50/10' : 'bg-white';

                if (n.type === 'CHAT') {
                  Icon = MessageSquare;
                  iconBg = 'bg-amber-50';
                  iconColor = '#d97706';
                  cardBorder = isUnread ? 'border-amber-100' : 'border-gray-100';
                  cardBg = isUnread ? 'bg-amber-50/10' : 'bg-white';
                } else if (n.type === 'SETTLEMENT') {
                  Icon = CreditCard;
                  iconBg = 'bg-emerald-50';
                  iconColor = '#059669';
                  cardBorder = isUnread ? 'border-emerald-100' : 'border-gray-100';
                  cardBg = isUnread ? 'bg-emerald-50/10' : 'bg-white';
                }

                return (
                  <TouchableOpacity
                    key={n.id}
                    onPress={() => handleNotificationClick(n)}
                    activeOpacity={0.8}
                    className={`p-4 rounded-2xl border flex-row gap-3 shadow-xs relative ${cardBg} ${cardBorder}`}
                  >
                    {/* Circle Icon Badge */}
                    <View className={`w-9 h-9 rounded-full ${iconBg} flex items-center justify-center shrink-0`}>
                      <Icon size={16} color={iconColor} />
                    </View>

                    {/* Content text */}
                    <View className="flex-1 pr-6">
                      <Text className={`text-xs text-gray-800 leading-relaxed ${isUnread ? 'font-bold' : 'font-medium'}`}>
                        {n.body}
                      </Text>
                      <Text className="text-[10px] text-gray-400 font-semibold mt-1.5">
                        {formatRelativeTime(n.createdAt)}
                      </Text>
                    </View>

                    {/* Actions and unread dot */}
                    <View className="absolute right-4 top-1/2 -translate-y-1/2 flex-row items-center gap-2">
                      {isUnread && (
                        <View className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      )}
                      <TouchableOpacity
                        onPress={() => deleteMutation.mutate(n.id)}
                        className="p-1.5 rounded-full bg-gray-50 hover:bg-red-50"
                        activeOpacity={0.7}
                      >
                        <Trash2 size={12} color="#9ca3af" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
