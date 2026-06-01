import api from './axios';
import { InAppNotification } from '../types';

export const notificationsApi = {
  list: () => api.get<InAppNotification[]>('/notifications').then((r) => r.data),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`).then((r) => r.data),
  markAllAsRead: () => api.put('/notifications/read-all').then((r) => r.data),
  delete: (id: string) => api.delete(`/notifications/${id}`).then((r) => r.data),
};
