import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import { ExternalLink, Copy } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { formatCurrency } from '../../lib/utils';

interface Props {
  host: {
    nickname: string;
    tossId?: string | null;
    kakaoPayLink?: string | null;
    bankAccount?: string | null;
  };
  amount: number;
}

export default function PayLinkButton({ host, amount }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopyAccount = async () => {
    if (host.bankAccount) {
      await Clipboard.setStringAsync(host.bankAccount);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTossOpen = async () => {
    if (host.bankAccount) await Clipboard.setStringAsync(host.bankAccount);
    const tossUrl = 'supertoss://send';
    const supported = await Linking.canOpenURL(tossUrl);
    if (supported) {
      await Linking.openURL(tossUrl);
    } else {
      Alert.alert('토스 앱을 열 수 없습니다.', '기기에 토스 앱이 설치되어 있는지 확인해주세요.');
    }
  };

  const handleKakaoOpen = async () => {
    const url = host.kakaoPayLink!;
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
    else Alert.alert('링크를 열 수 없습니다.');
  };

  return (
    <View className="gap-2">
      <Text className="text-xs text-gray-500 text-center">
        {'방장 닉네임: '}<Text className="font-bold">{host.nickname}</Text>{' · '}{formatCurrency(amount)}{' 송금'}
      </Text>
      {host.bankAccount ? (
        <View className="bg-gray-50 border border-gray-100 p-3 rounded-xl flex-row items-center justify-between">
          <Text className="text-sm font-medium text-gray-700">{host.bankAccount}</Text>
          <TouchableOpacity onPress={handleCopyAccount} className="flex-row items-center gap-1 bg-primary-50 px-2 py-1.5 rounded-lg">
            <Copy size={12} color="#f97316" />
            <Text className="text-xs text-primary-600">{copied ? '복사됨' : '계좌복사'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {(host.bankAccount || host.kakaoPayLink) ? (
        <View className="flex-row gap-2 mt-1">
          {host.bankAccount ? (
            <TouchableOpacity onPress={handleTossOpen} className="flex-1 flex-row items-center justify-center gap-1.5 bg-blue-600 rounded-xl py-3">
              <ExternalLink size={14} color="white" />
              <Text className="text-white text-sm font-bold">토스 열기</Text>
            </TouchableOpacity>
          ) : null}
          {host.kakaoPayLink ? (
            <TouchableOpacity onPress={handleKakaoOpen} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-3" style={{ backgroundColor: '#FEE500' }}>
              <ExternalLink size={14} color="#3C1E1E" />
              <Text className="text-sm font-bold" style={{ color: '#3C1E1E' }}>카카오페이</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
      {!host.kakaoPayLink && !host.bankAccount ? (
        <View className="bg-red-50 py-2.5 rounded-xl border border-red-100">
          <Text className="text-xs text-red-500 text-center">
            {'방장이 아직 송금 정보를 등록하지 않았습니다. 채팅으로 문의해주세요!'}
          </Text>
        </View>
      ) : null}
    </View>
  );
}