import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Users, Clock, MapPin, ChevronRight } from 'lucide-react-native';
import { Room } from '../../types';
import { formatCurrency, formatRelativeTime } from '../../lib/utils';
import RoomStatusBadge from './RoomStatusBadge';

interface Props {
  room: Room;
}

export default function RoomCard({ room }: Props) {
  const navigation = useNavigation<any>();
  const rate = room.achievementRate ?? 0;
  const isMet = room.isMinimumMet ?? false;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => navigation.navigate('RoomDetail', { id: room.id })}
      className="w-full bg-white rounded-2xl border border-gray-100 p-4 mb-3"
    >
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1">
          <View className="flex-row items-center flex-wrap mb-1 gap-1">
            <RoomStatusBadge status={room.status} deadline={room.deadline} />
            {room.distance !== null && room.distance !== undefined && (
              <Text className="text-xs text-gray-400">
                {room.distance < 1 ? (Math.round(room.distance * 1000) + 'm') : (room.distance.toFixed(1) + 'km')}
              </Text>
            )}
            <View className="flex-row items-center bg-gray-100 rounded px-1.5 py-0.5">
              <MapPin size={10} color="#4b5563" />
              <Text className="text-xs text-gray-600 ml-1" numberOfLines={1}>
                {room.pickupLocation || '장소 미지정'}
              </Text>
            </View>
          </View>
          <Text className="font-bold text-gray-900 text-base" numberOfLines={1}>{room.restaurantName}</Text>
          <Text className="text-sm text-gray-500 mt-0.5" numberOfLines={1}>{room.title}</Text>
        </View>
        <ChevronRight size={18} color="#d1d5db" />
      </View>
      <View className="mt-3 gap-2">
        <View className="h-1.5 bg-gray-100 rounded-full overflow-hidden w-full">
          <View className={'h-full rounded-full ' + (isMet ? 'bg-emerald-500' : 'bg-primary-500')} style={{ width: (Math.min(rate, 100) + '%') as any }} />
        </View>
        <View className="flex-row items-center justify-between">
          <Text className={'text-xs font-medium ' + (isMet ? 'text-emerald-600' : 'text-gray-500')}>
            {isMet ? '최소금액 달성' : ('최소 ' + formatCurrency(room.minimumOrder))}
          </Text>
          <Text className="text-xs text-gray-500">{rate}%</Text>
        </View>
        <View className="flex-row items-center justify-between mt-1">
          <View className="flex-row items-center gap-3">
            <View className="flex-row items-center gap-1">
              <Users size={13} color="#6b7280" />
              <Text className="text-xs text-gray-500">{room.memberCount ?? 0}명</Text>
            </View>
            <Text className="text-xs text-gray-500">배달비 {formatCurrency(room.deliveryFee / (room.memberCount || 1))}씩</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Clock size={12} color="#9ca3af" />
            <Text className="text-xs text-gray-400">{formatRelativeTime(room.deadline)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}