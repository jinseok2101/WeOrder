import { type ReactNode, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { connectSocket } from './socket/socket';
import { authApi } from './api/auth';
import { registerPushNotifications } from './lib/push';
import Auth from './pages/Auth';
import Home from './pages/Home';
import CreateRoom from './pages/CreateRoom';
import RoomDetail from './pages/RoomDetail';
import MyOrders from './pages/MyOrders';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

export default function App() {
  const { isAuthenticated, token, setUser } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && token) {
      connectSocket(token);
      
      // 앱 실행 시 최신 프로필 정보(계좌 등) 동기화
      authApi.me()
        .then((user) => {
          setUser(user);
          // 알림 권한 획득 및 PWA 푸시 구독 시도 (차단되지 않은 경우 항상 최초 요청)
          if ('Notification' in window && Notification.permission !== 'denied') {
            registerPushNotifications();
          }
        })
        .catch((err) => console.warn('프로필 동기화 실패:', err));
    }
  }, [isAuthenticated, token, setUser]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rooms/create"
          element={
            <ProtectedRoute>
              <CreateRoom />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rooms/:id/edit"
          element={
            <ProtectedRoute>
              <CreateRoom />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rooms/:id"
          element={
            <ProtectedRoute>
              <RoomDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-orders"
          element={
            <ProtectedRoute>
              <MyOrders />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
