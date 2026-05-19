import api from './axios';

export interface UpdateOrderPayload {
  name?: string;
  price?: number;
  quantity?: number;
  options?: string;
}

export const ordersApi = {
  update: (id: string, data: UpdateOrderPayload) =>
    api.put(`/orders/${id}`, data).then((r) => r.data),
  delete: (id: string) =>
    api.delete(`/orders/${id}`).then((r) => r.data),
};
