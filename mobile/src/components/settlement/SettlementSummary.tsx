import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Settlement, ShareStatus } from '../../types';
import { formatCurrency } from '../../lib/utils';
import PayLinkButton from './PayLinkButton';
import { settlementApi } from '../../api/settlement';

interface Props {
  settlement: Settlement;
  currentUserId: string;
  host: { id: string; nickname: string; tossId?: string | null; kakaoPayLink?: string | null; bankAccount?: string | null; };
  roomId: string;
}
const STATUS_CONFIG = {
  PENDING: { label: '대기 중', textClass: 'text-gray-400' },
  REQUESTED: { label: '납부 요청', textClass: 'text-amber-500' },
  PAID: { label: '납부 완료', textClass: 'text-blue-500' },
  CONFIRMED: { label: '확인 완료', textClass: 'text-emerald-600' },
};
function ShareStatusIcon({ status }: { status: string }) {
  if (status === 'PENDING') return <Clock size={14} color="#9ca3af" />;
  if (status === 'REQUESTED') return <AlertCircle size={14} color="#f59e0b" />;
  if (status === 'PAID') return <CheckCircle2 size={14} color="#3b82f6" />;
  return <CheckCircle2 size={14} color="#059669" />;
}
export default function SettlementSummary({ settlement, currentUserId, host, roomId }: Props) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<string | null>(null);
  const isHost = currentUserId === host.id;
  const handleMarkPaid = async (userId: string) => {
    setLoading('paid-' + userId);
    try {
      await settlementApi.markPaid(settlement.id, userId);
      queryClient.invalidateQueries({ queryKey: ['settlement', roomId] });
      queryClient.invalidateQueries({ queryKey: ['room', roomId] });
    } finally { setLoading(null); }
  };
  const handleConfirm = async (userId: string) => {
    setLoading('confirm-' + userId);
    try {
      await settlementApi.confirm(settlement.id, userId);
      queryClient.invalidateQueries({ queryKey: ['settlement', roomId] });
      queryClient.invalidateQueries({ queryKey: ['room', roomId] });
    } finally { setLoading(null); }
  };
  return (
    <View className="gap-4 pb-10">
      <View className="bg-primary-50 rounded-2xl p-5 gap-2">
        <View className="flex-row justify-between">
          <Text className="text-sm text-gray-600">음식 합계</Text>
          <Text className="text-sm font-medium">{formatCurrency(settlement.totalAmount - settlement.deliveryFee)}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-sm text-gray-600">배달비</Text>
          <Text className="text-sm font-medium">{formatCurrency(settlement.deliveryFee)}</Text>
        </View>
        <View className="border-t border-primary-200 pt-3 flex-row justify-between items-center">
          <Text className="font-bold text-gray-900">종 결제금액</Text>
          <Text className="font-bold text-primary-600 text-lg">{formatCurrency(settlement.totalAmount)}</Text>
        </View>
      </View>
      <View className="gap-3">
        {settlement.shares.map((share: any) => {
          const statusConf = STATUS_CONFIG[share.status as ShareStatus] || STATUS_CONFIG.PENDING;
          const isMine = share.userId === currentUserId;
          const canPay = isMine && (share.status === 'REQUESTED' || share.status === 'PENDING') && !isHost;
          const canConfirm = isHost && share.status === 'PAID' && share.userId !== host.id;
          const isPaidLoading = loading === 'paid-' + share.userId;
          const isConfirmLoading = loading === 'confirm-' + share.userId;
          return (
            <View key={share.id} className={'bg-white rounded-2xl border p-4 ' + (isMine ? 'border-primary-200' : 'border-gray-100')}>
              <View className="flex-row items-center justify-between mb-2">
                <View>
                  <View className="flex-row items-center">
                    <Text className="font-semibold text-sm text-gray-900">{share.user.nickname}</Text>
                    {isMine && <Text className="text-primary-600 text-sm ml-1">(나)</Text>}
                    {share.userId === host.id && <Text className="text-gray-400 text-sm ml-1">(방장)</Text>}
                  </View>
                  <Text className="text-xs text-gray-400 mt-0.5">메뉴 {formatCurrency(share.menuAmount)} + 배달비 {formatCurrency(share.deliverySplit)}</Text>
                </View>
                <View className="items-end">
                  <Text className="font-bold text-gray-900">{formatCurrency(share.totalAmount)}</Text>
                  {share.userId !== host.id && (
                    <View className="flex-row items-center gap-1 mt-0.5">
                      <ShareStatusIcon status={share.status} />
                      <Text className={'text-xs ' + statusConf.textClass}>{statusConf.label}</Text>
                    </View>
                  )}
                </View>
              </View>
              {canPay && (
                <View className="mt-2 gap-2">
                  <PayLinkButton host={host} amount={share.totalAmount} />
                  <TouchableOpacity onPress={() => handleMarkPaid(share.userId)} disabled={isPaidLoading} className={'w-full bg-primary-500 rounded-xl py-3 items-center ' + (isPaidLoading ? 'opacity-60' : '')}>
                    {isPaidLoading ? <ActivityIndicator size="small" color="white" /> : <Text className="text-white text-sm font-bold">송금했어요</Text>}
                  </TouchableOpacity>
                </View>
              )}
              {canConfirm && (
                <TouchableOpacity onPress={() => handleConfirm(share.userId)} disabled={isConfirmLoading} className={'mt-2 w-full border border-emerald-500 rounded-xl py-3 items-center ' + (isConfirmLoading ? 'opacity-60' : '')}>
                  {isConfirmLoading ? <ActivityIndicator size="small" color="#059669" /> : <Text className="text-emerald-600 text-sm font-bold">입금 확인</Text>}
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
      {settlement.status === 'COMPLETED' && (
        <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 items-center">
          <CheckCircle2 size={32} color="#10b981" />
          <Text className="font-bold text-emerald-700 text-base mt-2">정산 완료!</Text>
          <Text className="text-sm text-emerald-600 mt-1">모든 정산이 확인되었습니다.</Text>
        </View>
      )}
    </View>
  );
}