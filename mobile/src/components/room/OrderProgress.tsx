import React from 'react';
import { View, Text } from 'react-native';
import { formatCurrency } from '../../lib/utils';

interface Props {
  current: number;
  minimum: number;
}

export default function OrderProgress({ current, minimum }: Props) {
  const rate = minimum > 0 ? Math.min(100, Math.round((current / minimum) * 100)) : 100;
  const isMet = current >= minimum;

  return (
    <View className="space-y-1 gap-1">
      <View className="flex-row justify-between items-center">
        <Text className={`text-xs font-medium ${isMet ? 'text-emerald-600' : 'text-gray-500'}`}>
          {isMet ? '최소금액 달성!' : `최소주문 ${formatCurrency(minimum)}`}
        </Text>
        <Text className={`text-xs font-bold ${isMet ? 'text-emerald-600' : 'text-primary-600'}`}>
          {rate}%
        </Text>
      </View>
      <View className="h-2 bg-gray-100 rounded-full overflow-hidden w-full">
        <View
          className={`h-full rounded-full ${isMet ? 'bg-emerald-500' : 'bg-primary-500'}`}
          style={{ width: `${rate}%` }}
        />
      </View>
      <Text className="text-xs text-gray-400 mt-1">
        현재 {formatCurrency(current)} 주문됨
        {!isMet && ` · ${formatCurrency(minimum - current)} 더 필요`}
      </Text>
    </View>
  );
}