import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
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

    if (!form.email || !form.password) return setError('아이디와 비밀번호를 입력해주세요.');
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
    <View className="flex-1 bg-gray-100 items-center justify-center p-4">
      <View className="w-full max-w-sm items-center mb-6">
        <Image 
          source={require('../../assets/icon.png')} 
          className="w-16 h-16 rounded-[20px] mb-3 shadow-lg"
          resizeMode="cover"
        />
        <Text className="text-2xl font-extrabold text-gray-900 tracking-tight">WeOrder</Text>
      </View>

      <View className="w-full max-w-sm bg-white rounded-[32px] p-8 shadow-xl">
        <View className="items-center mb-6">
          <Text className="text-xl font-bold text-gray-900">
            {mode === 'login' ? '로그인' : '회원가입'}
          </Text>
        </View>

        <View className="space-y-4 gap-4">
          <View>
            <Text className="text-xs font-bold text-gray-700 mb-1.5">아이디</Text>
            <TextInput
              value={form.email}
              onChangeText={(text) => setForm((f) => ({ ...f, email: text }))}
              autoCapitalize="none"
              className="w-full bg-gray-100 rounded-2xl px-5 py-3.5 text-sm"
            />
          </View>

          {mode === 'register' && (
            <View>
              <Text className="text-xs font-bold text-gray-700 mb-1.5">닉네임</Text>
              <TextInput
                value={form.nickname}
                onChangeText={(text) => setForm((f) => ({ ...f, nickname: text }))}
                maxLength={20}
                className="w-full bg-gray-100 rounded-2xl px-5 py-3.5 text-sm"
              />
            </View>
          )}

          <View>
            <Text className="text-xs font-bold text-gray-700 mb-1.5">비밀번호</Text>
            <View className="relative justify-center">
              <TextInput
                secureTextEntry={!showPw}
                value={form.password}
                onChangeText={(text) => setForm((f) => ({ ...f, password: text }))}
                className="w-full bg-gray-100 rounded-2xl px-5 py-3.5 text-sm pr-12"
              />
              <TouchableOpacity
                onPress={() => setShowPw((v) => !v)}
                className="absolute right-4"
              >
                {showPw ? <EyeOff size={17} color="#9ca3af" /> : <Eye size={17} color="#9ca3af" />}
              </TouchableOpacity>
            </View>
          </View>

          {error ? (
            <View className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
              <Text className="text-xs text-red-600">{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            className={`w-full bg-primary-500 rounded-2xl py-4 mt-2 items-center justify-center ${
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

        <View className="flex-row items-center my-6">
          <View className="flex-1 h-[1px] bg-gray-200" />
          <Text className="px-4 text-[10px] font-bold text-gray-400">또는</Text>
          <View className="flex-1 h-[1px] bg-gray-200" />
        </View>

        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => alert('카카오 로그인은 준비 중입니다.')}
            className="flex-1 flex-row bg-[#FEE500] rounded-2xl py-3 items-center justify-center gap-2"
          >
            <Svg viewBox="0 0 24 24" width="16" height="16">
              <Path d="M12 3c-4.97 0-9 3.18-9 7.1 0 2.5 1.62 4.7 4.1 5.92-.17.6-.62 2.22-.7 2.56-.12.48.17.47.36.35.15-.1 2.37-1.6 3.32-2.24.62.1 1.26.17 1.92.17 4.97 0 9-3.18 9-7.1S16.97 3 12 3z" fill="#191919" />
            </Svg>
            <Text className="text-[#191919] text-xs font-bold">카카오 로그인</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => alert('Google 로그인은 준비 중입니다.')}
            className="flex-1 flex-row bg-gray-100 rounded-2xl py-3 items-center justify-center gap-2"
          >
            <Svg viewBox="0 0 24 24" width="14" height="14">
              <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </Svg>
            <Text className="text-gray-700 text-xs font-bold">Google 로그인</Text>
          </TouchableOpacity>
        </View>

        <View className="align-center mt-8 gap-2">
          <TouchableOpacity
            onPress={() => alert('비밀번호 재설정 기능은 준비 중입니다.')}
            className="items-center"
          >
            <Text className="text-xs text-gray-500">
              비밀번호를 잊으셨나요? <Text className="font-bold text-primary-500">재설정</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
            }}
            className="items-center"
          >
            {mode === 'login' ? (
              <Text className="text-xs text-gray-500">
                계정이 없으신가요? <Text className="font-bold text-primary-500">회원가입</Text>
              </Text>
            ) : (
              <Text className="text-xs text-gray-500">
                이미 계정이 있으신가요? <Text className="font-bold text-primary-500">로그인</Text>
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}