import React from 'react';
import { View, Text } from 'react-native';

export default function MapComponent() {
  return (
    <View className="flex-1 items-center justify-center bg-gray-200">
      <Text className="text-gray-500 font-medium">웹 버전에서는 지도가 지원되지 않습니다.</Text>
      <Text className="text-gray-400 text-xs mt-2">모바일 앱 또는 에뮬레이터를 이용해 주세요.</Text>
    </View>
  );
}
