import api from './axios';

export const settlementApi = {
  markPaid: (settlementId: string, userId: string) =>
    api
      .patch(`/settlement/${settlementId}/shares/${userId}/paid`)
      .then((r) => r.data),
  confirm: (settlementId: string, userId: string) =>
    api
      .patch(`/settlement/${settlementId}/shares/${userId}/confirm`)
      .then((r) => r.data),
};
