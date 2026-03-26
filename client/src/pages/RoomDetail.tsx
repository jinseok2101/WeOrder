import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, ExternalLink, ChevronDown } from 'lucide-react';
import { roomsApi } from '../api/rooms';
import { ordersApi } from '../api/orders';
import { useAuthStore } from '../store/authStore';
import { useRoomStore } from '../store/roomStore';
import { useSocket } from '../hooks/useSocket';
import Header from '../components/layout/Header';
import RoomStatusBadge from '../components/room/RoomStatusBadge';
import OrderProgress from '../components/room/OrderProgress';
import MemberOrderList from '../components/order/MemberOrderList';
import SettlementSummary from '../components/settlement/SettlementSummary';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { ChatMessage, Room } from '../types';

type Tab = 'order' | 'chat' | 'settlement';

export default function RoomDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const { messages, setMessages, addMessage, orderTotals, setOrderTotals } = useRoomStore();
  const { sendMessage } = useSocket(id);

  const [tab, setTab] = useState<Tab>('order');
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: room, isLoading } = useQuery({
    queryKey: ['room', id],
    queryFn: () => roomsApi.get(id!),
    enabled: !!id,
  });

  const { data: settlement } = useQuery({
    queryKey: ['settlement', id],
    queryFn: () => roomsApi.getSettlement(id!),
    enabled: !!id && !!room?.settlement,
    retry: false,
  });

  useEffect(() => {
    if (!id) return;
    roomsApi.getChat(id).then((msgs: ChatMessage[]) => setMessages(msgs));
  }, [id, setMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (room) {
      const total = (room.orderItems || []).reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      const rate = room.minimumOrder > 0
        ? Math.min(100, Math.round((total / room.minimumOrder) * 100))
        : 100;
      setOrderTotals({
        totalMenuAmount: total,
        minimumOrder: room.minimumOrder,
        deliveryFee: room.deliveryFee,
        isMinimumMet: total >= room.minimumOrder,
        achievementRate: rate,
      });
    }
  }, [room, setOrderTotals]);

  const joinMutation = useMutation({
    mutationFn: () => roomsApi.join(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['room', id] }),
  });

  const leaveMutation = useMutation({
    mutationFn: () => roomsApi.leave(id!),
    onSuccess: () => navigate('/'),
  });

  const statusMutation = useMutation({
    mutationFn: (status: Room['status']) => roomsApi.updateStatus(id!, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['room', id] }),
  });

  const settleMutation = useMutation({
    mutationFn: () => roomsApi.createSettlement(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room', id] });
      queryClient.invalidateQueries({ queryKey: ['settlement', id] });
      setTab('settlement');
    },
  });

  const addOrderMutation = useMutation({
    mutationFn: (data: { name: string; price: number; quantity: number; options?: string }) =>
      roomsApi.addOrder(id!, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['room', id] }),
  });

  const editOrderMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: { name: string; price: number; quantity: number; options?: string } }) =>
      ordersApi.update(itemId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['room', id] }),
  });

  const deleteOrderMutation = useMutation({
    mutationFn: (itemId: string) => ordersApi.delete(itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['room', id] }),
  });

  if (isLoading || !room) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="로딩 중..." showBack showHome />
        <div className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl h-24 animate-pulse border border-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  const isExpired = room.deadline ? new Date(room.deadline).getTime() < Date.now() : false;
  const isMember = (room.members || []).some((m) => m.userId === user?.id);
  const isHost = room.hostId === user?.id;
  const canJoin = !isMember && room.status === 'OPEN' && (room.members?.length ?? 0) < room.maxMembers && !isExpired;
  const canOrder = isMember && (room.status === 'OPEN' || room.status === 'ORDERING') && !isExpired;
  const totals = orderTotals ?? {
    totalMenuAmount: 0,
    minimumOrder: room.minimumOrder,
    deliveryFee: room.deliveryFee,
    isMinimumMet: false,
    achievementRate: 0,
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !id) return;
    sendMessage(id, chatInput.trim());
    setChatInput('');
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'order', label: '주문' },
    { key: 'chat', label: '채팅' },
    { key: 'settlement', label: '정산' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title={room.restaurantName}
        showBack
        showHome
        right={
          !isMember && canJoin ? (
            <button
              onClick={() => joinMutation.mutate()}
              disabled={joinMutation.isPending}
              className="bg-primary-500 text-white px-4 py-1.5 rounded-full text-sm font-bold hover:bg-primary-600 transition-colors"
            >
              참여하기
            </button>
          ) : isMember && !isHost ? (
            <button
              onClick={() => {
                if (confirm('방에서 나가시겠습니까?')) leaveMutation.mutate();
              }}
              className="text-sm text-gray-400 hover:text-gray-600 px-2 py-1"
            >
              나가기
            </button>
          ) : null
        }
      />

      <div className="px-4 pt-4 space-y-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <RoomStatusBadge status={room.status} deadline={room.deadline} />
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Users size={12} />
                  {room.members?.length ?? 0}/{room.maxMembers}명
                </span>
              </div>
              <h2 className="font-bold text-gray-900 mt-1">{room.title}</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                방장: {room.host.nickname} · 마감 {formatDate(room.deadline)}
              </p>
            </div>
            {room.restaurantUrl && (
              <a
                href={room.restaurantUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 flex items-center gap-1 text-xs text-primary-600 bg-primary-50 px-2.5 py-1.5 rounded-lg font-medium hover:bg-primary-100 transition-colors"
              >
                <ExternalLink size={12} />
                메뉴 보기
              </a>
            )}
          </div>

          <OrderProgress current={totals.totalMenuAmount} minimum={totals.minimumOrder} />

          <div className="flex gap-2 text-xs text-gray-500">
            <span>배달비 {formatCurrency(room.deliveryFee)}</span>
            <span>·</span>
            <span>
              1인당 약 {formatCurrency(Math.ceil(room.deliveryFee / (room.members?.length || 1)))}
            </span>
          </div>
        </div>

        {isHost && room.status === 'OPEN' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center justify-between">
            <span className="text-sm text-amber-800 font-medium">주문을 시작할 준비가 됐나요?</span>
            <button
              onClick={() => statusMutation.mutate('ORDERING')}
              className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-full font-bold hover:bg-amber-600 transition-colors"
            >
              주문 시작
            </button>
          </div>
        )}

        {isHost && room.status === 'ORDERING' && !room.settlement && (
          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-violet-800 font-semibold">정산을 생성할까요?</p>
              <p className="text-xs text-violet-600 mt-0.5">
                {totals.isMinimumMet ? '최소금액 달성! 주문 가능합니다.' : '아직 최소금액 미달성'}
              </p>
            </div>
            <button
              onClick={() => settleMutation.mutate()}
              disabled={settleMutation.isPending}
              className="flex-shrink-0 text-xs bg-violet-500 text-white px-3 py-1.5 rounded-full font-bold hover:bg-violet-600 transition-colors disabled:opacity-60"
            >
              {settleMutation.isPending ? '...' : '정산 생성'}
            </button>
          </div>
        )}
      </div>

      <div className="sticky top-14 z-30 bg-white border-b border-gray-100 px-4 mt-3">
        <div className="flex">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex-1 py-3 text-sm font-semibold border-b-2 transition-colors',
                tab === t.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              )}
            >
              {t.label}
              {t.key === 'chat' && messages.length > 0 && (
                <span className="ml-1 text-xs text-gray-400">({messages.length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 pb-24">
        {tab === 'order' && (
          <MemberOrderList
            orderItems={room.orderItems || []}
            currentUserId={user!.id}
            roomId={id!}
            canAdd={canOrder}
            onAdd={(data) => addOrderMutation.mutateAsync(data)}
            onEdit={(itemId, data) => editOrderMutation.mutateAsync({ itemId, data })}
            onDelete={(itemId) => deleteOrderMutation.mutateAsync(itemId)}
          />
        )}

        {tab === 'chat' && (
          <div className="flex flex-col" style={{ height: 'calc(100vh - 320px)' }}>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {messages.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-8">
                  아직 메시지가 없습니다.
                </p>
              )}
              {messages.map((msg) => {
                if (msg.type === 'SYSTEM') {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <span className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">
                        {msg.content}
                      </span>
                    </div>
                  );
                }
                const isMe = msg.userId === user?.id || msg.user?.id === user?.id;
                return (
                  <div key={msg.id} className={cn('flex gap-2', isMe && 'flex-row-reverse')}>
                    {!isMe && (
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 text-primary-700 text-xs font-bold">
                        {msg.user?.nickname?.[0] ?? '?'}
                      </div>
                    )}
                    <div className={cn('max-w-[70%]', isMe && 'items-end flex flex-col')}>
                      {!isMe && (
                        <p className="text-xs text-gray-500 mb-1 ml-1">{msg.user?.nickname}</p>
                      )}
                      <div
                        className={cn(
                          'px-3 py-2 rounded-2xl text-sm',
                          isMe
                            ? 'bg-primary-500 text-white rounded-tr-sm'
                            : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
                        )}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {isMember && (
              <form onSubmit={handleSendChat} className="flex gap-2 mt-3 pb-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="메시지 입력..."
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="bg-primary-500 text-white px-4 rounded-xl text-sm font-bold hover:bg-primary-600 disabled:opacity-40 transition-colors"
                >
                  전송
                </button>
              </form>
            )}
          </div>
        )}

        {tab === 'settlement' && (
          <div>
            {room.settlement || settlement ? (
              <SettlementSummary
                settlement={settlement || room.settlement!}
                currentUserId={user!.id}
                hostId={room.hostId}
                hostNickname={room.host.nickname}
                roomId={id!}
              />
            ) : (
              <div className="text-center py-12">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <ChevronDown size={24} className="text-gray-300" />
                </div>
                <p className="font-semibold text-gray-600">아직 정산이 시작되지 않았어요</p>
                <p className="text-sm text-gray-400 mt-1">
                  {isHost ? '주문 탭에서 정산을 생성해주세요.' : '방장이 정산을 생성하면 여기에 표시됩니다.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
