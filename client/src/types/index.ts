export type RoomStatus = 'OPEN' | 'ORDERING' | 'ORDERED' | 'SETTLED' | 'CANCELLED';
export type ShareStatus = 'PENDING' | 'REQUESTED' | 'PAID' | 'CONFIRMED';
export type SettlementStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
export type MessageType = 'USER' | 'SYSTEM';

export interface User {
  id: string;
  email: string;
  nickname: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface RoomMember {
  id: string;
  roomId: string;
  userId: string;
  user: { id: string; nickname: string };
  joinedAt: string;
}

export interface OrderItem {
  id: string;
  roomId: string;
  userId: string;
  user: { id: string; nickname: string };
  name: string;
  price: number;
  quantity: number;
  options?: string | null;
  createdAt: string;
}

export interface SettlementShare {
  id: string;
  settlementId: string;
  userId: string;
  user: { id: string; nickname: string };
  menuAmount: number;
  deliverySplit: number;
  totalAmount: number;
  status: ShareStatus;
  paidAt?: string | null;
}

export interface Settlement {
  id: string;
  roomId: string;
  totalAmount: number;
  deliveryFee: number;
  status: SettlementStatus;
  createdAt: string;
  shares: SettlementShare[];
}

export interface Room {
  id: string;
  title: string;
  restaurantName: string;
  restaurantUrl?: string | null;
  status: RoomStatus;
  hostId: string;
  host: { id: string; nickname: string };
  maxMembers: number;
  deliveryFee: number;
  minimumOrder: number;
  radiusKm: number;
  latitude: number;
  longitude: number;
  deadline: string;
  createdAt: string;
  members?: RoomMember[];
  orderItems?: OrderItem[];
  settlement?: Settlement | null;
  memberCount?: number;
  distance?: number | null;
  totalMenuAmount?: number;
  achievementRate?: number;
  isMinimumMet?: boolean;
}

export interface ChatMessage {
  id: string;
  roomId?: string;
  userId?: string | null;
  user?: { id: string; nickname: string } | null;
  content: string;
  type: MessageType;
  createdAt: string;
}

export interface OrderTotals {
  totalMenuAmount: number;
  minimumOrder: number;
  deliveryFee: number;
  isMinimumMet: boolean;
  achievementRate: number;
}
