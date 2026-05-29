import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Clock, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { roomsApi } from '../api/rooms';
import { Room } from '../types';
import { useAuthStore } from '../store/authStore';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import RoomStatusBadge from '../components/room/RoomStatusBadge';
import PaymentSettings from '../components/settlement/PaymentSettings';
import ProfileSettings from '../components/settlement/ProfileSettings';
import NotificationSettings from '../components/settlement/NotificationSettings';
import { cn, formatCurrency, formatDate } from '../lib/utils';

function SettlementIndicator({ room, userId }: { room: Room; userId: string }) {
  if (!room.settlement) return null;

  const myShare = room.settlement.shares.find((s) => s.userId === userId);
  const isHost = room.hostId === userId;
  if (!myShare || isHost) return null;

  if (myShare.status === 'CONFIRMED') {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-600">
        <CheckCircle2 size={12} />
        정산 완료
      </span>
    );
  }
  if (myShare.status === 'PAID') {
    return (
      <span className="flex items-center gap-1 text-xs text-blue-500">
        <Clock size={12} />
        확인 대기
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-amber-500">
      <AlertCircle size={12} />
      {formatCurrency(myShare.totalAmount)} 납부 필요
    </span>
  );
}

export default function MyOrders() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms', 'mine'],
    queryFn: roomsApi.mine,
  });

  const now = Date.now();
  const ongoing = rooms.filter((r) => {
    const isExpired = new Date(r.deadline).getTime() < now;
    return ['OPEN', 'ORDERING'].includes(r.status) && !isExpired;
  });
  const delivering = rooms.filter((r) => {
    const hasReviewed = r.reviews && r.reviews.length > 0;
    return r.status === 'ORDERED' || (r.status === 'SETTLED' && !hasReviewed);
  });
  const past = rooms.filter((r) => {
    const isExpired = new Date(r.deadline).getTime() < now;
    const hasReviewed = r.reviews && r.reviews.length > 0;
    return (
      r.status === 'CANCELLED' ||
      (r.status === 'SETTLED' && hasReviewed) ||
      ((r.status === 'OPEN' || r.status === 'ORDERING') && isExpired)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="내 주문" showLogout showHome />

      <div className="px-4 pt-4 space-y-6">
        <ProfileSettings />
        <PaymentSettings />
        <NotificationSettings />
        
        <section>
          <h2 className="font-bold text-gray-700 text-sm mb-3">
            진행 중 {ongoing.length > 0 && <span className="text-primary-500">({ongoing.length})</span>}
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-2xl h-24 animate-pulse border border-gray-100" />
              ))}
            </div>
          ) : ongoing.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
              <p className="text-sm text-gray-400">진행 중인 주문이 없어요</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ongoing.map((room) => (
                <button
                  key={room.id}
                  onClick={() => navigate(`/rooms/${room.id}`)}
                  className="w-full text-left bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm hover:border-primary-200 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <RoomStatusBadge status={room.status} deadline={room.deadline} />
                      </div>
                      <p className="font-bold text-gray-900 truncate">{room.restaurantName}</p>
                      <p className="text-sm text-gray-500 truncate">{room.title}</p>
                    </div>
                    <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                    <SettlementIndicator room={room} userId={user!.id} />
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {formatDate(room.deadline)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-bold text-gray-700 text-sm mb-3">
            배달 및 정산 중 {delivering.length > 0 && <span className="text-amber-500 font-extrabold">({delivering.length})</span>}
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {[1].map((i) => (
                <div key={i} className="bg-white rounded-2xl h-24 animate-pulse border border-gray-100" />
              ))}
            </div>
          ) : delivering.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
              <p className="text-sm text-gray-400">배달 또는 정산 진행 중인 주문이 없어요</p>
            </div>
          ) : (
            <div className="space-y-3">
              {delivering.map((room) => (
                <button
                  key={room.id}
                  onClick={() => navigate(`/rooms/${room.id}`)}
                  className="w-full text-left bg-white rounded-2xl border border-amber-100 p-4 hover:shadow-sm hover:border-amber-200 transition-all relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-orange-500" />
                  <div className="flex items-start justify-between gap-2 pl-1">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <RoomStatusBadge status={room.status} deadline={room.deadline} />
                        {room.status === 'SETTLED' && (
                          <span className="bg-amber-50 text-[10px] font-bold text-amber-700 px-1.5 py-0.5 rounded border border-amber-100 animate-pulse">
                            평가 대기
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-gray-900 truncate">{room.restaurantName}</p>
                      <p className="text-sm text-gray-500 truncate">{room.title}</p>
                    </div>
                    <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-400 pl-1">
                    <SettlementIndicator room={room} userId={user!.id} />
                    {room.status === 'SETTLED' ? (
                      <span className="text-[11px] font-medium text-amber-600">
                        음식 수령 & 평가 시 마감됨으로 이동
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {formatDate(room.deadline)}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {past.length > 0 && (
          <section>
            <h2 className="font-bold text-gray-700 text-sm mb-3">마감됨</h2>
            <div className="space-y-3">
              {past.map((room) => (
                <button
                  key={room.id}
                  onClick={() => navigate(`/rooms/${room.id}`)}
                  className="w-full text-left bg-white rounded-2xl border border-gray-100 p-4 opacity-70 hover:opacity-100 transition-opacity"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <RoomStatusBadge status={room.status} deadline={room.deadline} />
                      </div>
                      <p className="font-semibold text-gray-800 truncate">{room.restaurantName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(room.deadline)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {room.settlement && (
                        <p className="text-sm font-bold text-gray-700">
                          {formatCurrency(
                            room.settlement.shares.find((s) => s.userId === user!.id)?.totalAmount ?? 0
                          )}
                        </p>
                      )}
                      <ChevronRight size={16} className={cn('text-gray-300 ml-auto')} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
