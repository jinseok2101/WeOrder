import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Settlement, ShareStatus } from '../../types';
import { cn, formatCurrency } from '../../lib/utils';
import PayLinkButton from './PayLinkButton';
import { settlementApi } from '../../api/settlement';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

interface Props {
  settlement: Settlement;
  currentUserId: string;
  hostId: string;
  hostNickname: string;
  roomId: string;
}

const STATUS_CONFIG: Record<ShareStatus, { icon: React.ReactNode; label: string; className: string }> = {
  PENDING: {
    icon: <Clock size={14} />,
    label: '대기 중',
    className: 'text-gray-400',
  },
  REQUESTED: {
    icon: <AlertCircle size={14} />,
    label: '납부 요청',
    className: 'text-amber-500',
  },
  PAID: {
    icon: <CheckCircle2 size={14} />,
    label: '납부 완료',
    className: 'text-blue-500',
  },
  CONFIRMED: {
    icon: <CheckCircle2 size={14} />,
    label: '확인 완료',
    className: 'text-emerald-600',
  },
};

export default function SettlementSummary({
  settlement,
  currentUserId,
  hostId,
  hostNickname,
  roomId,
}: Props) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<string | null>(null);

  const myShare = settlement.shares.find((s) => s.userId === currentUserId);
  const isHost = currentUserId === hostId;

  const handleMarkPaid = async (userId: string) => {
    setLoading(`paid-${userId}`);
    try {
      await settlementApi.markPaid(settlement.id, userId);
      queryClient.invalidateQueries({ queryKey: ['settlement', roomId] });
      queryClient.invalidateQueries({ queryKey: ['room', roomId] });
    } finally {
      setLoading(null);
    }
  };

  const handleConfirm = async (userId: string) => {
    setLoading(`confirm-${userId}`);
    try {
      await settlementApi.confirm(settlement.id, userId);
      queryClient.invalidateQueries({ queryKey: ['settlement', roomId] });
      queryClient.invalidateQueries({ queryKey: ['room', roomId] });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-primary-50 rounded-2xl p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">음식 합계</span>
          <span className="font-medium">{formatCurrency(settlement.totalAmount - settlement.deliveryFee)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">배달비</span>
          <span className="font-medium">{formatCurrency(settlement.deliveryFee)}</span>
        </div>
        <div className="border-t border-primary-200 pt-2 flex justify-between">
          <span className="font-bold text-gray-900">총 결제금액</span>
          <span className="font-bold text-primary-600 text-lg">{formatCurrency(settlement.totalAmount)}</span>
        </div>
      </div>

      <div className="space-y-3">
        {settlement.shares.map((share) => {
          const statusConf = STATUS_CONFIG[share.status];
          const isMine = share.userId === currentUserId;
          const canPay = isMine && (share.status === 'REQUESTED' || share.status === 'PENDING') && !isHost;
          const canConfirm = isHost && share.status === 'PAID' && share.userId !== hostId;

          return (
            <div
              key={share.id}
              className={cn(
                'bg-white rounded-2xl border p-4 space-y-3',
                isMine ? 'border-primary-200 bg-primary-50/30' : 'border-gray-100'
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-gray-900">
                    {share.user.nickname}
                    {isMine && <span className="text-primary-600 ml-1">(나)</span>}
                    {share.userId === hostId && <span className="text-gray-400 ml-1">(방장)</span>}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    <span>메뉴 {formatCurrency(share.menuAmount)}</span>
                    <span>+</span>
                    <span>배달비 {formatCurrency(share.deliverySplit)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatCurrency(share.totalAmount)}</p>
                  <div className={cn('flex items-center gap-1 text-xs justify-end mt-0.5', statusConf.className)}>
                    {statusConf.icon}
                    <span>{statusConf.label}</span>
                  </div>
                </div>
              </div>

              {canPay && (
                <div className="space-y-2">
                  <PayLinkButton
                    nickname={hostNickname}
                    amount={share.totalAmount}
                  />
                  <button
                    onClick={() => handleMarkPaid(share.userId)}
                    disabled={loading === `paid-${share.userId}`}
                    className="w-full bg-primary-500 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-primary-600 transition-colors disabled:opacity-60"
                  >
                    {loading === `paid-${share.userId}` ? '처리 중...' : '송금했어요'}
                  </button>
                </div>
              )}

              {canConfirm && (
                <button
                  onClick={() => handleConfirm(share.userId)}
                  disabled={loading === `confirm-${share.userId}`}
                  className="w-full border border-emerald-500 text-emerald-600 rounded-xl py-2.5 text-sm font-bold hover:bg-emerald-50 transition-colors disabled:opacity-60"
                >
                  {loading === `confirm-${share.userId}` ? '처리 중...' : '입금 확인'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {settlement.status === 'COMPLETED' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
          <CheckCircle2 size={28} className="text-emerald-500 mx-auto mb-2" />
          <p className="font-bold text-emerald-700">정산 완료!</p>
          <p className="text-sm text-emerald-600 mt-0.5">모든 정산이 확인되었습니다.</p>
        </div>
      )}
    </div>
  );
}
