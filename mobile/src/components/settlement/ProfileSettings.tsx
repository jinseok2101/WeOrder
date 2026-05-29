import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { User, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';

export default function ProfileSettings() {
  const { user, setUser } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const mutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      setSuccessMsg('내 정보가 성공적으로 수정되었습니다.');
      setErrorMsg('');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || '프로필 수정 중 오류가 발생했습니다.';
      setErrorMsg(msg);
      setSuccessMsg('');
    },
  });

  const handleSubmit = () => {
    setErrorMsg('');
    setSuccessMsg('');

    const trimmed = nickname.trim();
    if (!trimmed) {
      return setErrorMsg('닉네임은 공백일 수 없습니다.');
    }

    mutation.mutate({ nickname: trimmed });
  };

  return (
    <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
      <TouchableOpacity onPress={() => setIsOpen(!isOpen)} className="flex-row items-center justify-between p-4 bg-gray-50">
        <View className="flex-row items-center gap-2">
          <User size={18} color="#f97316" />
          <Text className="font-bold text-gray-700 text-sm">{'내 정보 관리'}</Text>
        </View>
        {isOpen ? <ChevronUp size={18} color="#9ca3af" /> : <ChevronDown size={18} color="#9ca3af" />}
      </TouchableOpacity>
      {isOpen && (
        <View className="p-4 border-t border-gray-100 gap-4">
          <View>
            <Text className="text-xs font-bold text-gray-600 mb-1.5">{'이메일 계정 (수정 불가)'}</Text>
            <TextInput
              value={user?.email || ''}
              editable={false}
              className="bg-gray-100 border-0 rounded-xl px-3 py-2.5 text-sm text-gray-400 font-semibold"
            />
          </View>
          <View>
            <Text className="text-xs font-bold text-gray-600 mb-1.5">{'닉네임'}</Text>
            <TextInput
              value={nickname}
              onChangeText={(t) => {
                setNickname(t);
                setErrorMsg('');
              }}
              maxLength={15}
              placeholder="변경할 닉네임을 입력해 주세요"
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
            />
            {errorMsg ? (
              <Text className="text-[11px] text-red-600 font-semibold mt-1 ml-0.5">
                ❌ {errorMsg}
              </Text>
            ) : null}
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
              onPress={handleSubmit}
              disabled={mutation.isPending || !nickname.trim()}
              className={'bg-primary-500 px-5 py-2 rounded-xl items-center ' + (mutation.isPending || !nickname.trim() ? 'opacity-50' : '')}
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
