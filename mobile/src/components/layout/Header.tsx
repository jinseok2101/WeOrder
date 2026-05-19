import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, LogOut, Home as HomeIcon } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  showHome?: boolean;
  showLogout?: boolean;
  right?: React.ReactNode;
}

export default function Header({ title, showBack = false, showHome = false, showLogout = false, right }: HeaderProps) {
  const navigation = useNavigation<any>();
  const logout = useAuthStore((s) => s.logout);

  return (
    <View className="bg-white border-b border-gray-100 px-4 h-14 flex-row items-center justify-between" style={{ paddingTop: 40, height: 90 }}>
      <View className="flex-row items-center gap-2 flex-1">
        {showBack && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="p-2 -ml-2 rounded-full"
          >
            <ArrowLeft size={20} color="#374151" />
          </TouchableOpacity>
        )}
        <Text className="font-bold text-gray-900 text-lg" numberOfLines={1}>{title}</Text>
      </View>
      <View className="flex-row items-center gap-1">
        {showHome && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Home')}
            className="p-2 rounded-full"
          >
            <HomeIcon size={18} color="#6b7280" />
          </TouchableOpacity>
        )}
        {right}
        {showLogout && (
          <TouchableOpacity
            onPress={() => {
              logout();
            }}
            className="p-2 rounded-full"
          >
            <LogOut size={20} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
