import api from './axios';

export const reviewsApi = {
  submitReviews: async (
    roomId: string,
    reviews: {
      revieweeId: string;
      rating: number;
      tags: string[];
      comment?: string;
    }[]
  ) => {
    const res = await api.post(`/rooms/${roomId}/reviews`, { reviews });
    return res.data;
  },

  getReviewStatus: async (roomId: string): Promise<{ hasReviewed: boolean }> => {
    const res = await api.get(`/rooms/${roomId}/reviews/status`);
    return res.data;
  },

  getUserProfile: async (
    userId: string
  ): Promise<{
    user: {
      id: string;
      nickname: string;
      trustScore: number;
      trustStars: number;
      reviewCount: number;
    };
    tags: { tag: string; count: number }[];
    comments: {
      id: string;
      reviewerNickname: string;
      rating: number;
      comment: string;
      createdAt: string;
    }[];
  }> => {
    const res = await api.get(`/users/${userId}/profile`);
    return res.data;
  },
};
