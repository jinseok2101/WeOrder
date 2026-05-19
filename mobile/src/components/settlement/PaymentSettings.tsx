import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CreditCard, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';

export default function PaymentSettings() {
  const { user, setUser } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    tossId: user?.tossId || '',
    kakaoPayLink: user?.kakaoPayLink || '',
    bankAccount: user?.bankAccount || '',
  });
  const [successMsg, setSuccessMsg] = useState('');

  const mutation = useMutation({
    mutationFn: authApi.updatePayment,
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      setSuccessMsg('결제 정보가 저장되었습니다.');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
  });

  return (
    <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
      <TouchableOpacity onPress={() => setIsOpen(!isOpen)} className="flex-row items-center justify-between p-4 bg-gray-50">
        <View className="flex-row items-center gap-2">
          <CreditCard size={18} color="#f97316" />
          <Text className="font-bold text-gray-700 text-sm">{'내 정산/계좌 정보 설정'}</Text>
        </View>
        {isOpen ? <ChevronUp size={18} color="#9ca3af" /> : <ChevronDown size={18} color="#9ca3af" />}
      </TouchableOpacity>
      {isOpen && (
        <View className="p-4 border-t border-gray-100 gap-4">
          <View>
            <Text className="text-xs font-bold text-gray-600 mb-1.5">{'카카오페이 송금 링크'}</Text>
            <TextInput
              value={form.kakaoPayLink}
              onChangeText={(t) => setForm({ ...form, kakaoPayLink: t })}
              placeholder="https://qr.kakaopay.com/..."
              autoCapitalize="none"
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
            />
          </View>
          <View>
            <Text className="text-xs font-bold text-gray-600 mb-1.5">{'일반 계좌번호'}</Text>
            <TextInput
              value={form.bankAccount}
              onChangeText={(t) => setForm({ ...form, bankAccount: t })}
              placeholder="예: 카카오뱅크 3333-12-..."
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
            />
          </View>
          <View className="flex-row items-center justify-between pt-2">
            <View className="flex-row items-center gap-1">
              {successMsg ? (
                <>
                  <CheckCircle2 size={14} color="#059669" />
                  <Text className="text-xs text-emerald-600 font-medium">{successMsg}</Text>
                </>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => mutation.mutate(form)}
              disabled={mutation.isPending}
              className={'bg-primary-500 px-5 py-2 rounded-xl items-center ' + (mutation.isPending ? 'opacity-50' : '')}
            >
              {mutation.isPending
                ? <ActivityIndicator size="small" color="white" />
                : <Text className="text-white font-bold text-sm">{'저장'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}