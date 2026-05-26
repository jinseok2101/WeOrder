import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, Platform, Alert, Linking, AppState } from 'react-native';
import { Bell, CheckSquare, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import { useMutation } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from '../../lib/push';

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

  const [permissionStatus, setPermissionStatus] = useState<string>('undetermined');
  const [showMobileGuide, setShowMobileGuide] = useState(false);

  const checkPermission = async () => {
    if (Platform.OS === 'web') return;
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status);
      if (status === 'granted') {
        setShowMobileGuide(false);
      }
    } catch (error) {
      console.warn('Failed to get notification permissions:', error);
    }
  };

  useEffect(() => {
    checkPermission();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkPermission();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleRequestMobilePermission = async () => {
    if (Platform.OS === 'web') return;

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      if (existingStatus === 'denied') {
        setShowMobileGuide(true);
        Alert.alert(
          '알림 권한 차단됨',
          '알림 권한이 차단되어 있습니다. 설정 앱으로 이동하여 알림을 허용해주세요.',
          [
            { text: '취소', style: 'cancel' },
            { 
              text: '설정으로 이동', 
              onPress: () => {
                Linking.openSettings();
              } 
            }
          ]
        );
        return;
      }

      const { status } = await Notifications.requestPermissionsAsync();
      setPermissionStatus(status);

      if (status === 'granted') {
        await registerForPushNotificationsAsync();
        setSuccessMsg('기기 알림이 활성화되었습니다.');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setShowMobileGuide(true);
        Alert.alert(
          '알림 권한 차단됨',
          '알림 권한이 차단되어 있습니다. 설정 앱으로 이동하여 알림을 허용해주세요.',
          [
            { text: '취소', style: 'cancel' },
            { 
              text: '설정으로 이동', 
              onPress: () => {
                Linking.openSettings();
              } 
            }
          ]
        );
      }
    } catch (error) {
      console.warn('Error requesting notification permission:', error);
    }
  };

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
          {Platform.OS !== 'web' && permissionStatus !== 'granted' && (
            <View style={permissionStatus === 'denied' ? styles.deniedBanner : styles.warnBanner}>
              <View style={styles.bannerHeader}>
                <View style={styles.bannerTextContainer}>
                  <Text style={permissionStatus === 'denied' ? styles.deniedBannerTitle : styles.warnBannerTitle}>
                    {permissionStatus === 'denied' ? '기기 알림 권한이 차단되었습니다' : '기기 알림이 꺼져있습니다'}
                  </Text>
                  <Text style={permissionStatus === 'denied' ? styles.deniedBannerDesc : styles.warnBannerDesc}>
                    {permissionStatus === 'denied' 
                      ? '푸시 알림을 받으려면 휴대폰 설정에서 알림 권한을 허용해주세요.' 
                      : '푸시 알림을 받으려면 기기 알림 권한을 허용해주세요.'}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleRequestMobilePermission}
                  style={permissionStatus === 'denied' ? styles.deniedButton : styles.warnButton}
                >
                  <Text style={styles.buttonText}>권한 허용</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

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
  warnBanner: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  deniedBanner: {
    backgroundColor: '#fff5f5',
    borderColor: '#fed7d7',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  warnBannerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 2,
  },
  warnBannerDesc: {
    fontSize: 11,
    color: '#b45309',
  },
  deniedBannerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#9b2c2c',
    marginBottom: 2,
  },
  deniedBannerDesc: {
    fontSize: 11,
    color: '#c53030',
  },
  warnButton: {
    backgroundColor: '#d97706',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deniedButton: {
    backgroundColor: '#e53e3e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  guideContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#feb2b2',
  },
  guideTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#9b2c2c',
    marginBottom: 4,
  },
  guideStep: {
    fontSize: 11,
    color: '#c53030',
    lineHeight: 16,
  },
  statusButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusButtonActive: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
