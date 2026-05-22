import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { authApi } from '../api/auth';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') {
    return null;
  }

  let token: string | null = null;

  try {
    // 1. 알림 권한 확인 및 요청
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('🔔 푸시 알림 수신 권한이 거부되었습니다.');
      return null;
    }

    // 2. Expo 푸시 토큰 가져오기 (Expo EAS 프로젝트가 연결되어 있으면 자동으로 토큰 발급)
    const tokenData = await Notifications.getExpoPushTokenAsync();
    token = tokenData.data;
    console.log('🔔 Expo Push Token:', token);

    // 3. 백엔드 서버에 토큰 등록
    if (token) {
      await authApi.subscribePush({
        type: 'APP',
        endpoint: token,
      });
      console.log('🔔 모바일 앱 푸시 토큰이 서버에 정상적으로 등록되었습니다!');
    }
  } catch (error) {
    console.warn('⚠️ Expo 푸시 토큰 획득에 실패했습니다. (에뮬레이터 환경일 수 있습니다):', error);
  }

  // 안드로이드 채널 설정
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}
