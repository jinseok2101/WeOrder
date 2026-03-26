import { RoomStatus } from '../../types';
import { cn } from '../../lib/utils';

const STATUS_CONFIG: Record<RoomStatus, { label: string; className: string }> = {
  OPEN: { label: '모집 중', className: 'bg-emerald-100 text-emerald-700' },
  ORDERING: { label: '주문 중', className: 'bg-blue-100 text-blue-700' },
  ORDERED: { label: '주문 완료', className: 'bg-violet-100 text-violet-700' },
  SETTLED: { label: '정산 완료', className: 'bg-gray-100 text-gray-600' },
  CANCELLED: { label: '취소됨', className: 'bg-red-100 text-red-600' },
};

interface Props {
  status: RoomStatus;
  deadline?: string | Date; // 마감 시간 추가
  className?: string;
}

export default function RoomStatusBadge({ status, deadline, className }: Props) {
  let config = STATUS_CONFIG[status];

  // 마감 시간이 지났는지 체크 (OPEN이나 ORDERING 상태일 때만)
  if ((status === 'OPEN' || status === 'ORDERING') && deadline) {
    const isExpired = new Date(deadline).getTime() < Date.now();
    if (isExpired) {
      config = { label: '마감됨', className: 'bg-gray-100 text-gray-500 line-through opacity-70' };
    }
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
