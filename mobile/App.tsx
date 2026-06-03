import "./global.css";
import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { View, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { registerRootComponent } from 'expo';
import * as Notifications from 'expo-notifications';

import { useAuthStore } from './src/store/authStore';
import { connectSocket } from './src/socket/socket';
import { authApi } from './src/api/auth';
import { registerForPushNotificationsAsync } from './src/lib/push';

import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import CreateRoomScreen from './src/screens/CreateRoomScreen';
import RoomDetailScreen from './src/screens/RoomDetailScreen';
import MyOrdersScreen from './src/screens/MyOrdersScreen';
import NotificationScreen from './src/screens/NotificationScreen';

const Stack = createNativeStackNavigator();
const queryClient = new QueryClient();

export type RootStackParamList = {
  Auth: undefined;
  Home: undefined;
  CreateRoom: undefined;
  RoomEdit: { id: string } | undefined;
  RoomDetail: { id: string; tab?: 'order' | 'chat' | 'settlement' };
  MyOrders: undefined;
  Notifications: undefined;
};

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthScreen} />
      ) : (
        <Stack.Group>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="CreateRoom" component={CreateRoomScreen} />
          <Stack.Screen name="RoomEdit" component={CreateRoomScreen} />
          <Stack.Screen name="RoomDetail" component={RoomDetailScreen} />
          <Stack.Screen name="MyOrders" component={MyOrdersScreen} />
          <Stack.Screen name="Notifications" component={NotificationScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  console.log('App component rendering... Platform:', Platform.OS);
  useEffect(() => {
    const { token, isAuthenticated, setUser } = useAuthStore.getState();
    if (isAuthenticated && token) {
      connectSocket(token);
      
      // 앱 구동 시 최신 프로필 정보(정산/계좌 정보 등)를 서버로부터 동기화
      authApi.me()
        .then((user) => {
          setUser(user);
          // 알림 수신 동의 및 푸시 토큰 등록 시도
          registerForPushNotificationsAsync();
        })
        .catch((err) => console.warn('프로필 동기화 실패:', err));
    }

    // OS 상태바 푸시 알림 클릭 리스너 등록
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data && data.roomId) {
        const roomId = data.roomId as string;
        const type = data.type as string | undefined;

        const navigateToRoom = () => {
          if (navigationRef.isReady()) {
            navigationRef.navigate('RoomDetail', {
              id: roomId,
              tab: type === 'chat' ? 'chat' : type === 'settlement' ? 'settlement' : 'order'
            });
            return true;
          }
          return false;
        };

        // 네비게이터가 로드될 때까지 500ms 간격으로 자동 재시도
        if (!navigateToRoom()) {
          let attempts = 0;
          const interval = setInterval(() => {
            attempts++;
            if (navigateToRoom() || attempts > 10) {
              clearInterval(interval);
            }
          }, 500);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer ref={navigationRef}>
          <RootNavigator />
          <StatusBar style="auto" />
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

registerRootComponent(App);



