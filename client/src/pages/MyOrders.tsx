import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Clock, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { roomsApi } from '../api/rooms';
import { Room } from '../types';
import { useAuthStore } from '../store/authStore';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import RoomStatusBadge from '../components/room/RoomStatusBadge';
import { cn, formatCurrency, formatDate } from '../lib/utils';

function SettlementIndicator({ room, userId }: { room: Room; userId: string }) {
  if (!room.settlement) return null;

  const myShare = room.settlement.shares.find((s) => s.userId === userId);
  if (!myShare) return null;

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

  const active = rooms.filter((r) => ['OPEN', 'ORDERING', 'ORDERED'].includes(r.status));
  const past = rooms.filter((r) => ['SETTLED', 'CANCELLED'].includes(r.status));

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="내 주문" showLogout />

      <div className="px-4 pt-4 space-y-6">
        <section>
          <h2 className="font-bold text-gray-700 text-sm mb-3">
            진행 중 {active.length > 0 && <span className="text-primary-500">({active.length})</span>}
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-2xl h-24 animate-pulse border border-gray-100" />
              ))}
            </div>
          ) : active.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
              <p className="text-sm text-gray-400">진행 중인 주문이 없어요</p>
            </div>
          ) : (
            <div className="space-y-3">
              {active.map((room) => (
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

        {past.length > 0 && (
          <section>
            <h2 className="font-bold text-gray-700 text-sm mb-3">이전 주문</h2>
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
