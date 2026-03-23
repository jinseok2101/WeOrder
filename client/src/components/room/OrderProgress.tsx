import { cn, formatCurrency } from '../../lib/utils';

interface Props {
  current: number;
  minimum: number;
  className?: string;
}

export default function OrderProgress({ current, minimum, className }: Props) {
  const rate = minimum > 0 ? Math.min(100, Math.round((current / minimum) * 100)) : 100;
  const isMet = current >= minimum;

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex justify-between items-center text-xs">
        <span className={cn('font-medium', isMet ? 'text-emerald-600' : 'text-gray-500')}>
          {isMet ? '최소금액 달성!' : `최소주문 ${formatCurrency(minimum)}`}
        </span>
        <span className={cn('font-bold', isMet ? 'text-emerald-600' : 'text-primary-600')}>
          {rate}%
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isMet ? 'bg-emerald-500' : 'bg-primary-500'
          )}
          style={{ width: `${rate}%` }}
        />
      </div>
      <p className="text-xs text-gray-400">
        현재 {formatCurrency(current)} 주문됨
        {!isMet && ` · ${formatCurrency(minimum - current)} 더 필요`}
      </p>
    </div>
  );
}
