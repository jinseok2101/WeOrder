import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, Platform } from 'react-native';
import { Bell, CheckSquare, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import { useMutation } from '@tanstack/react-query';

export default function NotificationSettings() {
  const { user, setUser } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [settings, setSettings] = useState({
    notifyChat: user?.notifyChat ?? true,
    notifyRoomStatus: user?.notifyRoomStatus ?? true,
    notifySettlement: user?.notifySettlement ?? true,
  });

  const mutation = useMutation({
    mutationFn: authApi.updateNotifications,
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      setSuccessMsg('알림 설정이 변경되었습니다.');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
  });

  const handleToggle = (key: keyof typeof settings) => {
    const nextValue = !settings[key];
    const updatedSettings = { ...settings, [key]: nextValue };
    setSettings(updatedSettings);
    mutation.mutate(updatedSettings);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setIsOpen(!isOpen)}
        style={styles.header}
      >
        <View style={styles.headerTitleContainer}>
          <Bell size={18} color="#10b981" />
          <Text style={styles.headerText}>알림 수신 설정</Text>
        </View>
        {isOpen ? (
          <ChevronUp size={18} color="#9ca3af" />
        ) : (
          <ChevronDown size={18} color="#9ca3af" />
        )}
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.content}>
          {/* 채팅 알림 */}
          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>실시간 채팅 알림</Text>
              <Text style={styles.settingDesc}>참여 중인 배달방의 대화 메시지를 받습니다.</Text>
            </View>
            <Switch
              value={settings.notifyChat}
              onValueChange={() => handleToggle('notifyChat')}
              trackColor={{ false: '#e5e7eb', true: '#10b981' }}
              thumbColor="#ffffff"
            />
          </View>

          {/* 방 상태 변경 알림 */}
          <View style={[styles.settingItem, styles.borderTop]}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>배달방 상태 변경 알림</Text>
              <Text style={styles.settingDesc}>배달 주문 시작, 메뉴 모집 마감 소식을 받습니다.</Text>
            </View>
            <Switch
              value={settings.notifyRoomStatus}
              onValueChange={() => handleToggle('notifyRoomStatus')}
              trackColor={{ false: '#e5e7eb', true: '#10b981' }}
              thumbColor="#ffffff"
            />
          </View>

          {/* 정산 알림 */}
          <View style={[styles.settingItem, styles.borderTop]}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>정산 및 입금 확인 알림</Text>
              <Text style={styles.settingDesc}>정산 요청과 내 입금 확인 통계를 수신합니다.</Text>
            </View>
            <Switch
              value={settings.notifySettlement}
              onValueChange={() => handleToggle('notifySettlement')}
              trackColor={{ false: '#e5e7eb', true: '#10b981' }}
              thumbColor="#ffffff"
            />
          </View>

          {/* 저장 확인 메시지 */}
          {successMsg ? (
            <View style={styles.successContainer}>
              <CheckSquare size={14} color="#059669" />
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    overflow: 'hidden',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
  },
  content: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: '#f9fafb',
    marginTop: 8,
    paddingTop: 16,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 11,
    color: '#9ca3af',
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 12,
  },
  successText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#059669',
  },
});
