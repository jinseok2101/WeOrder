import api from './axios';
import { User } from '../types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  nickname: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export const authApi = {
  register: (data: RegisterPayload) =>
    api.post<AuthResponse>('/auth/register', data).then((r) => r.data),
  login: (data: LoginPayload) =>
    api.post<AuthResponse>('/auth/login', data).then((r) => r.data),
  me: () => api.get<User>('/auth/me').then((r) => r.data),
  updatePayment: (data: { tossId?: string | null; kakaoPayLink?: string | null; bankAccount?: string | null }) =>
    api.patch<User>('/auth/me/payment', data).then((r) => r.data),
  updateNotifications: (data: { notifyChat?: boolean; notifyRoomStatus?: boolean; notifySettlement?: boolean }) =>
    api.patch<User>('/auth/me/notifications', data).then((r) => r.data),
  subscribePush: (data: { type: string; endpoint: string; p256dh?: string | null; auth?: string | null }) =>
    api.post('/auth/me/push-subscription', data).then((r) => r.data),
  unsubscribePush: (data: { endpoint: string }) =>
    api.delete('/auth/me/push-subscription', { data }).then((r) => r.data),
  getVapidKey: () =>
    api.get<{ publicKey: string }>('/auth/vapid-key').then((r) => r.data),
  findId: (nickname: string) =>
    api.post<{ email: string }>('/auth/find-id', { nickname }).then((r) => r.data),
  resetPassword: (data: { email: string; nickname: string; newPassword: string }) =>
    api.post<{ message: string }>('/auth/reset-password', data).then((r) => r.data),
  googleLogin: (data: { token: string; email?: string; name?: string }) =>
    api.post<AuthResponse>('/auth/google', data).then((r) => r.data),
  kakaoLogin: (data: { token: string; email?: string; nickname?: string }) =>
    api.post<AuthResponse>('/auth/kakao', data).then((r) => r.data),
};

