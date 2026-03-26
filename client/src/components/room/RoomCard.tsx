import { useNavigate } from 'react-router-dom';
import { Users, Clock, MapPin, ChevronRight } from 'lucide-react';
import { Room } from '../../types';
import { cn, formatCurrency, formatRelativeTime } from '../../lib/utils';
import RoomStatusBadge from './RoomStatusBadge';

interface Props {
  room: Room;
}

export default function RoomCard({ room }: Props) {
  const navigate = useNavigate();
  const rate = room.achievementRate ?? 0;
  const isMet = room.isMinimumMet ?? false;

  return (
    <button
      onClick={() => navigate(`/rooms/${room.id}`)}
      className="w-full text-left bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-primary-200 transition-all active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <RoomStatusBadge status={room.status} deadline={room.deadline} />
            {room.distance !== null && room.distance !== undefined && (
              <span className="inline-flex items-center gap-0.5 text-xs text-gray-400">
                <MapPin size={11} />
                {room.distance < 1
                  ? `${Math.round(room.distance * 1000)}m`
                  : `${room.distance.toFixed(1)}km`}
              </span>
            )}
          </div>
          <h3 className="font-bold text-gray-900 text-base truncate">{room.restaurantName}</h3>
          <p className="text-sm text-gray-500 truncate mt-0.5">{room.title}</p>
        </div>
        <ChevronRight size={18} className="text-gray-300 flex-shrink-0 mt-1" />
      </div>

      <div className="mt-3 space-y-2">
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              isMet ? 'bg-emerald-500' : 'bg-primary-500'
            )}
            style={{ width: `${rate}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className={cn('font-medium', isMet && 'text-emerald-600')}>
            {isMet ? '최소금액 달성' : `최소 ${formatCurrency(room.minimumOrder)}`}
          </span>
          <span>{rate}%</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Users size={13} />
              {room.memberCount ?? 0}/{room.maxMembers}명
            </span>
            <span>배달비 {formatCurrency(room.deliveryFee / (room.memberCount || 1))}씩</span>
          </div>
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Clock size={12} />
            {formatRelativeTime(room.deadline)}
          </span>
        </div>
      </div>
    </button>
  );
}
