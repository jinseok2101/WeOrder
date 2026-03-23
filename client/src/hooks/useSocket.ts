import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectSocket } from '../socket/socket';
import { useAuthStore } from '../store/authStore';
import { useRoomStore } from '../store/roomStore';
import { ChatMessage, OrderItem, OrderTotals, Room, Settlement } from '../types';

export function useSocket(roomId?: string) {
  const token = useAuthStore((s) => s.token);
  const { addMessage, setOrderTotals } = useRoomStore();
  const queryClient = useQueryClient();
  const joinedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);

    const onConnect = () => {
      if (roomId && joinedRef.current !== roomId) {
        socket.emit('room:join', roomId);
        joinedRef.current = roomId;
      }
    };

    if (socket.connected) {
      onConnect();
    }
    socket.on('connect', onConnect);

    const onRoomUpdated = (room: Room) => {
      queryClient.setQueryData(['room', roomId], room);
    };

    const onMemberJoined = () => {
      queryClient.invalidateQueries({ queryKey: ['room', roomId] });
    };

    const onMemberLeft = () => {
      queryClient.invalidateQueries({ queryKey: ['room', roomId] });
    };

    const onChatMessage = (msg: ChatMessage) => {
      addMessage(msg);
    };

    const onItemAdded = ({ item, totals }: { item: OrderItem; totals: OrderTotals }) => {
      queryClient.setQueryData(['room', roomId], (old: Room | undefined) => {
        if (!old) return old;
        const exists = (old.orderItems || []).some((i) => i.id === item.id);
        if (exists) return old;
        return { ...old, orderItems: [...(old.orderItems || []), item] };
      });
      setOrderTotals(totals);
    };

    const onItemUpdated = ({ item, totals }: { item: OrderItem; totals: OrderTotals }) => {
      queryClient.setQueryData(['room', roomId], (old: Room | undefined) => {
        if (!old) return old;
        return {
          ...old,
          orderItems: (old.orderItems || []).map((i) => (i.id === item.id ? item : i)),
        };
      });
      setOrderTotals(totals);
    };

    const onItemDeleted = ({ itemId, totals }: { itemId: string; totals: OrderTotals }) => {
      queryClient.setQueryData(['room', roomId], (old: Room | undefined) => {
        if (!old) return old;
        return {
          ...old,
          orderItems: (old.orderItems || []).filter((i) => i.id !== itemId),
        };
      });
      setOrderTotals(totals);
    };

    const onSettlementCreated = (settlement: Settlement) => {
      queryClient.setQueryData(['room', roomId], (old: Room | undefined) => {
        if (!old) return old;
        return { ...old, settlement, status: 'ORDERED' as const };
      });
      queryClient.setQueryData(['settlement', roomId], settlement);
    };

    const onSettlementUpdated = (settlement: Settlement) => {
      queryClient.setQueryData(['settlement', roomId], settlement);
    };

    socket.on('room:updated', onRoomUpdated);
    socket.on('room:member_joined', onMemberJoined);
    socket.on('room:member_left', onMemberLeft);
    socket.on('chat:message', onChatMessage);
    socket.on('order:item_added', onItemAdded);
    socket.on('order:item_updated', onItemUpdated);
    socket.on('order:item_deleted', onItemDeleted);
    socket.on('settlement:created', onSettlementCreated);
    socket.on('settlement:updated', onSettlementUpdated);

    return () => {
      if (roomId && joinedRef.current === roomId) {
        socket.emit('room:leave', roomId);
        joinedRef.current = null;
      }
      socket.off('connect', onConnect);
      socket.off('room:updated', onRoomUpdated);
      socket.off('room:member_joined', onMemberJoined);
      socket.off('room:member_left', onMemberLeft);
      socket.off('chat:message', onChatMessage);
      socket.off('order:item_added', onItemAdded);
      socket.off('order:item_updated', onItemUpdated);
      socket.off('order:item_deleted', onItemDeleted);
      socket.off('settlement:created', onSettlementCreated);
      socket.off('settlement:updated', onSettlementUpdated);
    };
  }, [token, roomId, addMessage, setOrderTotals, queryClient]);

  const sendMessage = (roomId: string, content: string) => {
    if (!token) return;
    const socket = connectSocket(token);
    socket.emit('chat:send', { roomId, content });
  };

  return { sendMessage };
}
