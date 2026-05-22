import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';

export default function AuthScreen() {
  const setAuth = useAuthStore((s) => s.setAuth);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ email: '', nickname: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');

    if (!form.email || !form.password) return setError('이메일과 비밀번호를 입력해주세요.');
    if (mode === 'register' && !form.nickname.trim()) return setError('닉네임을 입력해주세요.');

    setLoading(true);
    try {
      const res =
        mode === 'login'
          ? await authApi.login({ email: form.email, password: form.password })
          : await authApi.register({
              email: form.email,
              password: form.password,
              nickname: form.nickname.trim(),
            });

      setAuth(res.user, res.token);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        '오류가 발생했습니다. 다시 시도해주세요.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-orange-50 items-center justify-center p-4">
      <View className="w-full max-w-sm">
        <View className="items-center mb-8">
          <Image 
            source={require('../../assets/icon.png')} 
            className="w-16 h-16 rounded-2xl mb-3"
            resizeMode="cover"
          />
          <Text className="text-2xl font-extrabold text-gray-900">WeOrder</Text>
          <Text className="text-sm text-gray-500 mt-1">같이 시키면 더 맛있어요</Text>
        </View>

        <View className="bg-white rounded-3xl p-6">
          <View className="flex-row bg-gray-100 rounded-2xl p-1 mb-6">
            {(['login', 'register'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2 rounded-xl items-center justify-center ${
                  mode === m ? 'bg-white' : ''
                }`}
              >
                <Text className={`text-sm font-semibold ${
                  mode === m ? 'text-primary-600' : 'text-gray-500'
                }`}>
                  {m === 'login' ? '로그인' : '회원가입'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View className="space-y-3 gap-3">
            <TextInput
              value={form.email}
              onChangeText={(text) => setForm((f) => ({ ...f, email: text }))}
              placeholder="이메일"
              keyboardType="email-address"
              autoCapitalize="none"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-primary-500"
            />

            {mode === 'register' && (
              <TextInput
                value={form.nickname}
                onChangeText={(text) => setForm((f) => ({ ...f, nickname: text }))}
                placeholder="닉네임"
                maxLength={20}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-primary-500"
              />
            )}

            <View className="relative justify-center">
              <TextInput
                secureTextEntry={!showPw}
                value={form.password}
                onChangeText={(text) => setForm((f) => ({ ...f, password: text }))}
                placeholder="비밀번호"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-primary-500 pr-11"
              />
              <TouchableOpacity
                onPress={() => setShowPw((v) => !v)}
                className="absolute right-3"
              >
                {showPw ? <EyeOff size={17} color="#9ca3af" /> : <Eye size={17} color="#9ca3af" />}
              </TouchableOpacity>
            </View>

            {error ? (
              <View className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <Text className="text-sm text-red-600">{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              className={`w-full bg-primary-500 rounded-xl py-3.5 mt-1 items-center justify-center ${
                loading ? 'opacity-60' : ''
              }`}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-sm">
                  {mode === 'login' ? '로그인' : '회원가입'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}