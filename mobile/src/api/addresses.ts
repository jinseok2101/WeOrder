import api from './axios';

export interface UserAddress {
  id: string;
  userId: string;
  label: string;
  roadAddress: string;
  jibunAddress?: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateAddressPayload {
  label: string;
  roadAddress: string;
  jibunAddress?: string;
  latitude: number;
  longitude: number;
}

export const addressesApi = {
  list: () => api.get<UserAddress[]>('/addresses').then((r) => r.data),
  add: (data: CreateAddressPayload) =>
    api.post<UserAddress>('/addresses', data).then((r) => r.data),
  activate: (id: string) =>
    api.patch(`/addresses/${id}/activate`).then((r) => r.data),
  delete: (id: string) =>
    api.delete(`/addresses/${id}`).then((r) => r.data),
};
