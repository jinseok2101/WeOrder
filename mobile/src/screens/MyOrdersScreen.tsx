import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Clock, ChevronRight, CheckCircle2, AlertCircle, Star } from 'lucide-react-native';
import UserProfileModal from '../components/room/UserProfileModal';

import { roomsApi } from '../api/rooms';
import { Room } from '../types';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import RoomStatusBadge from '../components/room/RoomStatusBadge';
import PaymentSettings from '../components/settlement/PaymentSettings';
import NotificationSettings from '../components/settlement/NotificationSettings';
import ProfileSettings from '../components/settlement/ProfileSettings';
import { formatCurrency, formatDate } from '../lib/utils';

function SettlementIndicator({ room, userId }: { room: Room; userId: string }) {
  if (!room.settlement) return null;

  const myShare = room.settlement.shares.find((s) => s.userId === userId);
  const isHost = room.hostId === userId;
  if (!myShare || isHost) return null;

  if (myShare.status === 'CONFIRMED') {
    return (
      <View className="flex-row items-center gap-1">
        <CheckCircle2 size={12} color="#059669" />
        <Text className="text-xs text-emerald-600">정산 완료</Text>
      </View>
    );
  }
  if (myShare.status === 'PAID') {
    return (
      <View className="flex-row items-center gap-1">
        <Clock size={12} color="#3b82f6" />
        <Text className="text-xs text-blue-500">확인 중</Text>
      </View>
    );
  }
  return (
    <View className="flex-row items-center gap-1">
      <AlertCircle size={12} color="#f59e0b" />
      <Text className="text-xs text-amber-500">{formatCurrency(myShare.totalAmount)} 송금 필요</Text>
    </View>
  );
}

export default function MyOrdersScreen() {
  const navigation = useNavigation<any>();
  const { user, setUser } = useAuthStore();
  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);

  React.useEffect(() => {
    authApi.me()
      .then((latestUser) => {
        setUser(latestUser);
      })
      .catch((err) => console.warn('Failed to sync user profile in mobile screen:', err));
  }, []);


  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms', 'mine'],
    queryFn: roomsApi.mine,
  });

  const now = Date.now();
  const active = rooms.filter((r) => {
    const isExpired = new Date(r.deadline).getTime() < now;
    return ['OPEN', 'ORDERING', 'ORDERED'].includes(r.status) && !isExpired;
  });
  const past = rooms.filter((r) => {
    const isExpired = new Date(r.deadline).getTime() < now;
    return ['SETTLED', 'CANCELLED'].includes(r.status) || isExpired;
  });

  return (
    <View className="flex-1 bg-gray-50 pb-24">
      <Header title="내 주문" showLogout showHome />

      <ScrollView className="px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* 나의 신뢰도 프로필 보기 카드 */}
        <TouchableOpacity
          onPress={() => setIsProfileModalOpen(true)}
          activeOpacity={0.8}
          className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 flex-row items-center justify-between mb-6 shadow-sm"
        >
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Star size={20} color="#d97706" fill="#d97706" />
            </View>
            <View>
              <Text className="text-[10px] font-extrabold text-amber-800 tracking-wider">나의 신뢰 등급</Text>
              <View className="flex-row items-center gap-1.5 mt-0.5">
                <Text className="text-base font-extrabold text-gray-900">
                  {((user?.trustScore ?? 10) / 2).toFixed(1)}
                </Text>
                <Text className="text-[11px] text-gray-400 font-bold">/ 5.0</Text>
                <Text className="text-xs text-gray-400 font-semibold ml-1">
                  ({user?.reviewCount ?? 0}회 평가)
                </Text>
              </View>
            </View>
          </View>
          <View className="flex-row items-center gap-1">
            <Text className="text-xs text-amber-900 font-bold">내 프로필 보기</Text>
            <ChevronRight size={16} color="#d97706" />
          </View>
        </TouchableOpacity>

        <ProfileSettings />
        <PaymentSettings />
        <NotificationSettings />
        
        <View className="mb-6">
          <Text className="font-bold text-gray-700 text-sm mb-3">
            진행 중 {active.length > 0 && <Text className="text-primary-500">({active.length})</Text>}
          </Text>

          {isLoading ? (
            <ActivityIndicator size="large" color="#f97316" />
          ) : active.length === 0 ? (
            <View className="bg-white rounded-2xl border border-gray-100 p-6 items-center">
              <Text className="text-sm text-gray-400">진행 중인 주문이 없어요</Text>
            </View>
          ) : (
            <View className="gap-3">
              {active.map((room) => (
                <TouchableOpacity
                  key={room.id}
                  onPress={() => navigation.navigate('RoomDetail', { id: room.id })}
                  activeOpacity={0.7}
                  className="w-full bg-white rounded-2xl border border-gray-100 p-4"
                >
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2 mb-1">
                        <RoomStatusBadge status={room.status} deadline={room.deadline} />
                      </View>
                      <Text className="font-bold text-gray-900" numberOfLines={1}>{room.restaurantName}</Text>
                      <Text className="text-sm text-gray-500 mt-0.5" numberOfLines={1}>{room.title}</Text>
                    </View>
                    <ChevronRight size={18} color="#d1d5db" />
                  </View>
                  <View className="mt-2 flex-row items-center justify-between">
                    <SettlementIndicator room={room} userId={user!.id} />
                    <View className="flex-row items-center gap-1 ml-auto">
                      <Clock size={11} color="#9ca3af" />
                      <Text className="text-xs text-gray-400">{formatDate(room.deadline)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {past.length > 0 && (
          <View>
            <Text className="font-bold text-gray-700 text-sm mb-3">마감됨</Text>
            <View className="gap-3">
              {past.map((room) => (
                <TouchableOpacity
                  key={room.id}
                  onPress={() => navigation.navigate('RoomDetail', { id: room.id })}
                  activeOpacity={0.7}
                  className="w-full bg-white rounded-2xl border border-gray-100 p-4 opacity-70"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2 mb-1">
                        <RoomStatusBadge status={room.status} deadline={room.deadline} />
                      </View>
                      <Text className="font-semibold text-gray-800" numberOfLines={1}>{room.restaurantName}</Text>
                      <Text className="text-xs text-gray-400 mt-0.5">{formatDate(room.deadline)}</Text>
                    </View>
                    <View className="items-end pl-2">
                      {room.settlement && (
                        <Text className="text-sm font-bold text-gray-700">
                          {formatCurrency(
                            room.settlement.shares.find((s) => s.userId === user!.id)?.totalAmount ?? 0
                          )}
                        </Text>
                      )}
                      <ChevronRight size={16} color="#d1d5db" />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <BottomNav />
      {user && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          userId={user.id}
        />
      )}
    </View>
  );
}