import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Home, ClipboardList, PlusCircle } from 'lucide-react-native';

const tabs = [
  { name: 'Home', icon: Home, label: '홈' },
  { name: 'CreateRoom', icon: PlusCircle, label: '방 만들기' },
  { name: 'MyOrders', icon: ClipboardList, label: '내 주문' },
];

export default function BottomNav() {
  const navigation = useNavigation<any>();

  return (
    <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex-row pb-safe">
      {tabs.map(({ name, icon: Icon, label }) => (
        <TouchableOpacity
          key={name}
          onPress={() => navigation.navigate(name as never)}
          className="flex-1 items-center py-3 gap-1"
          activeOpacity={0.7}
        >
          <Icon size={22} color="#9ca3af" />
          <Text className="text-xs text-gray-400 font-medium">{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}