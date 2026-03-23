import { create } from 'zustand';
import { ChatMessage, OrderTotals, Room } from '../types';

interface RoomState {
  currentRoom: Room | null;
  messages: ChatMessage[];
  orderTotals: OrderTotals | null;
  setCurrentRoom: (room: Room) => void;
  updateCurrentRoom: (partial: Partial<Room>) => void;
  addMessage: (msg: ChatMessage) => void;
  setMessages: (msgs: ChatMessage[]) => void;
  setOrderTotals: (totals: OrderTotals) => void;
  clearRoom: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  currentRoom: null,
  messages: [],
  orderTotals: null,
  setCurrentRoom: (room) => set({ currentRoom: room }),
  updateCurrentRoom: (partial) =>
    set((state) => ({
      currentRoom: state.currentRoom
        ? { ...state.currentRoom, ...partial }
        : null,
    })),
  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),
  setMessages: (msgs) => set({ messages: msgs }),
  setOrderTotals: (totals) => set({ orderTotals: totals }),
  clearRoom: () => set({ currentRoom: null, messages: [], orderTotals: null }),
}));
