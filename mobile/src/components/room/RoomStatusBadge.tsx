import React from 'react';
import { Text, View } from 'react-native';
import { RoomStatus } from '../../types';

const STATUS_CONFIG = {
  OPEN: { label: '모집 중', bgClass: 'bg-emerald-100', textClass: 'text-emerald-700' },
  ORDERING: { label: '주문 중', bgClass: 'bg-blue-100', textClass: 'text-blue-700' },
  ORDERED: { label: '주문 완료', bgClass: 'bg-violet-100', textClass: 'text-violet-700' },
  SETTLED: { label: '정산 완료', bgClass: 'bg-gray-100', textClass: 'text-gray-600' },
  CANCELLED: { label: '취소됨', bgClass: 'bg-red-100', textClass: 'text-red-600' },
};

interface Props {
  status: RoomStatus;
  deadline?: string | Date;
}

export default function RoomStatusBadge({ status, deadline }: Props) {
  let config = STATUS_CONFIG[status];

  if ((status === 'OPEN' || status === 'ORDERING') && deadline) {
    const isExpired = new Date(deadline).getTime() < Date.now();
    if (isExpired) {
      config = { label: '마감됨', bgClass: 'bg-gray-100 opacity-70', textClass: 'text-gray-500 line-through' };
    }
  }

  return (
    <View className={`px-2 py-0.5 rounded-full ${config.bgClass}`}>
      <Text className={`text-xs font-semibold ${config.textClass}`}>
        {config.label}
      </Text>
    </View>
  );
}