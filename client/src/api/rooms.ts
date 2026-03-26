import api from './axios';
import { Room, RoomStatus } from '../types';

export interface RoomsQuery {
  lat?: number;
  lng?: number;
  radius?: number;
}

export interface CreateRoomPayload {
  title: string;
  restaurantName: string;
  restaurantUrl?: string;
  maxMembers: number;
  deliveryFee: number;
  minimumOrder: number;
  radiusKm: number;
  latitude: number;
  longitude: number;
  deadline: string;
}

export const roomsApi = {
  list: (params: RoomsQuery) =>
    api.get<Room[]>('/rooms', { params }).then((r) => r.data),
  mine: () => api.get<Room[]>('/rooms/mine').then((r) => r.data),
  create: (data: CreateRoomPayload) =>
    api.post<Room>('/rooms', data).then((r) => r.data),
  update: (id: string, data: Partial<CreateRoomPayload>) =>
    api.patch<Room>(`/rooms/${id}`, data).then((r) => r.data),
  get: (id: string) => api.get<Room>(`/rooms/${id}`).then((r) => r.data),
  join: (id: string) =>
    api.post<{ message: string }>(`/rooms/${id}/join`).then((r) => r.data),
  leave: (id: string) =>
    api.post<{ message: string }>(`/rooms/${id}/leave`).then((r) => r.data),
  updateStatus: (id: string, status: RoomStatus) =>
    api.patch<Room>(`/rooms/${id}/status`, { status }).then((r) => r.data),
  addOrder: (
    roomId: string,
    item: { name: string; price: number; quantity: number; options?: string }
  ) =>
    api.post(`/rooms/${roomId}/orders`, item).then((r) => r.data),
  getChat: (roomId: string, cursor?: string) =>
    api
      .get(`/rooms/${roomId}/chat`, { params: cursor ? { cursor } : {} })
      .then((r) => r.data),
  createSettlement: (roomId: string) =>
    api.post(`/rooms/${roomId}/settlement`).then((r) => r.data),
  getSettlement: (roomId: string) =>
    api.get(`/rooms/${roomId}/settlement`).then((r) => r.data),
};
