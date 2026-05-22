import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Image, Alert, Modal } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';

interface MockAccount {
  name: string;
  email: string;
  avatar: string;
}

export default function AuthScreen() {
  const setAuth = useAuthStore((s) => s.setAuth);

  const [mode, setMode] = useState<'login' | 'register' | 'find'>('login');
  const [findTab, setFindTab] = useState<'id' | 'password'>('id');
  const [form, setForm] = useState({ email: '', nickname: '', password: '' });
  const [findForm, setFindForm] = useState({ nickname: '', email: '', newPassword: '' });
  const [foundId, setFoundId] = useState<string | null>(null);

  const [showPw, setShowPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [googleModalVisible, setGoogleModalVisible] = useState(false);
  const [googleAccounts, setGoogleAccounts] = useState<MockAccount[]>([]);
  const [googleTab, setGoogleTab] = useState<'picker' | 'custom'>('custom');
  const [googleCustomForm, setGoogleCustomForm] = useState({ name: '', email: '' });
  const [googleError, setGoogleError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const loadGoogleAccounts = async () => {
      try {
        const stored = await AsyncStorage.getItem('weorder_google_accounts');
        if (stored) {
          const parsed = JSON.parse(stored);
          setGoogleAccounts(parsed);
          if (parsed.length > 0) {
            setGoogleTab('picker');
          } else {
            setGoogleTab('custom');
          }
        } else {
          setGoogleAccounts([]);
          setGoogleTab('custom');
        }
      } catch (e) {
        setGoogleAccounts([]);
        setGoogleTab('custom');
      }
    };
    loadGoogleAccounts();
  }, []);

  const handleGoogleLogin = async (email: string, name: string) => {
    setGoogleError('');
    setGoogleLoading(true);
    try {
      const token = `mock_google_token_${Date.now()}_${email.replace(/[@.]/g, '')}`;
      const res = await authApi.googleLogin({ token, email, name });
      
      // Save account to AsyncStorage
      const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=100`;
      const updatedAccounts = [
        { name, email, avatar },
        ...googleAccounts.filter((acc) => acc.email !== email)
      ].slice(0, 5);
      
      await AsyncStorage.setItem('weorder_google_accounts', JSON.stringify(updatedAccounts));
      setGoogleAccounts(updatedAccounts);

      setAuth(res.user, res.token);
      setGoogleModalVisible(false);
      setGoogleCustomForm({ name: '', email: '' });
      setGoogleTab('picker');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Google 로그인에 실패했습니다. 다시 시도해주세요.';
      setGoogleError(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleCustomSubmit = () => {
    setGoogleError('');
    if (!googleCustomForm.name.trim() || !googleCustomForm.email.trim()) {
      return setGoogleError('이름과 이메일을 모두 입력해주세요.');
    }
    if (!googleCustomForm.email.includes('@')) {
      return setGoogleError('유효한 이메일 형식이 아닙니다.');
    }
    handleGoogleLogin(googleCustomForm.email.trim(), googleCustomForm.name.trim());
  };

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

  const handleFindId = async () => {
    setError('');
    setFoundId(null);

    if (!findForm.nickname.trim()) {
      return setError('닉네임을 입력해주세요.');
    }

    setLoading(true);
    try {
      const res = await authApi.findId(findForm.nickname.trim());
      setFoundId(res.email);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        '해당 닉네임으로 등록된 회원을 찾을 수 없습니다.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');

    if (!findForm.email || !findForm.nickname.trim() || !findForm.newPassword) {
      return setError('모든 필드를 입력해주세요.');
    }

    setLoading(true);
    try {
      await authApi.resetPassword({
        email: findForm.email,
        nickname: findForm.nickname.trim(),
        newPassword: findForm.newPassword,
      });
      Alert.alert(
        '비밀번호 재설정 완료',
        '비밀번호가 성공적으로 재설정되었습니다. 로그인 화면으로 이동합니다.'
      );
      setMode('login');
      setForm((f) => ({ ...f, email: findForm.email }));
      setFindForm({ nickname: '', email: '', newPassword: '' });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        '비밀번호 재설정에 실패했습니다. 정보를 다시 확인해주세요.';
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
        {mode !== 'find' ? (
          <>
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
                onPress={() => setGoogleModalVisible(true)}
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
                onPress={() => {
                  setMode('find');
                  setError('');
                  setFoundId(null);
                  setFindForm({ nickname: '', email: '', newPassword: '' });
                }}
                className="items-center"
              >
                <Text className="text-xs text-gray-500 text-center">
                  아이디 또는 비밀번호를 잊으셨나요? <Text className="font-bold text-primary-500">찾기 / 재설정</Text>
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
                  <Text className="text-xs text-gray-500 text-center">
                    계정이 없으신가요? <Text className="font-bold text-primary-500">회원가입</Text>
                  </Text>
                ) : (
                  <Text className="text-xs text-gray-500 text-center">
                    이미 계정이 있으신가요? <Text className="font-bold text-primary-500">로그인</Text>
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View className="flex-row border-b border-gray-100 mb-6">
              <TouchableOpacity
                onPress={() => {
                  setFindTab('id');
                  setError('');
                  setFoundId(null);
                }}
                className={`flex-1 pb-3 items-center border-b-2 ${
                  findTab === 'id' ? 'border-primary-500' : 'border-transparent'
                }`}
              >
                <Text className={`text-sm font-bold ${findTab === 'id' ? 'text-primary-500' : 'text-gray-400'}`}>
                  아이디 찾기
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setFindTab('password');
                  setError('');
                  setFoundId(null);
                }}
                className={`flex-1 pb-3 items-center border-b-2 ${
                  findTab === 'password' ? 'border-primary-500' : 'border-transparent'
                }`}
              >
                <Text className={`text-sm font-bold ${findTab === 'password' ? 'text-primary-500' : 'text-gray-400'}`}>
                  비밀번호 재설정
                </Text>
              </TouchableOpacity>
            </View>

            {findTab === 'id' ? (
              <View className="space-y-4 gap-4">
                <View>
                  <Text className="text-xs font-bold text-gray-700 mb-1.5">가입된 닉네임</Text>
                  <TextInput
                    value={findForm.nickname}
                    onChangeText={(text) => setFindForm((f) => ({ ...f, nickname: text }))}
                    className="w-full bg-gray-100 rounded-2xl px-5 py-3.5 text-sm"
                    autoCapitalize="none"
                  />
                </View>

                {foundId && (
                  <View className="bg-green-50 border border-green-100 rounded-2xl p-4 items-center my-2">
                    <Text className="text-[10px] text-green-700 font-semibold mb-1">찾으신 아이디는 다음과 같습니다</Text>
                    <Text className="text-sm font-extrabold text-green-900 tracking-wider bg-white w-full text-center rounded-lg py-2 border border-green-200">
                      {foundId}
                    </Text>
                  </View>
                )}

                {error ? (
                  <View className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                    <Text className="text-xs text-red-600">{error}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  onPress={handleFindId}
                  disabled={loading}
                  className={`w-full bg-primary-500 rounded-2xl py-4 mt-2 items-center justify-center ${
                    loading ? 'opacity-60' : ''
                  }`}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-bold text-sm">아이디 찾기</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View className="space-y-4 gap-4">
                <View>
                  <Text className="text-xs font-bold text-gray-700 mb-1.5">아이디</Text>
                  <TextInput
                    value={findForm.email}
                    onChangeText={(text) => setFindForm((f) => ({ ...f, email: text }))}
                    className="w-full bg-gray-100 rounded-2xl px-5 py-3.5 text-sm"
                    autoCapitalize="none"
                  />
                </View>

                <View>
                  <Text className="text-xs font-bold text-gray-700 mb-1.5">닉네임</Text>
                  <TextInput
                    value={findForm.nickname}
                    onChangeText={(text) => setFindForm((f) => ({ ...f, nickname: text }))}
                    className="w-full bg-gray-100 rounded-2xl px-5 py-3.5 text-sm"
                    autoCapitalize="none"
                  />
                </View>

                <View>
                  <Text className="text-xs font-bold text-gray-700 mb-1.5">새 비밀번호</Text>
                  <View className="relative justify-center">
                    <TextInput
                      secureTextEntry={!showNewPw}
                      value={findForm.newPassword}
                      onChangeText={(text) => setFindForm((f) => ({ ...f, newPassword: text }))}
                      className="w-full bg-gray-100 rounded-2xl px-5 py-3.5 text-sm pr-12"
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPw((v) => !v)}
                      className="absolute right-4"
                    >
                      {showNewPw ? <EyeOff size={17} color="#9ca3af" /> : <Eye size={17} color="#9ca3af" />}
                    </TouchableOpacity>
                  </View>
                </View>

                {error ? (
                  <View className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                    <Text className="text-xs text-red-600">{error}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  onPress={handleResetPassword}
                  disabled={loading}
                  className={`w-full bg-primary-500 rounded-2xl py-4 mt-2 items-center justify-center ${
                    loading ? 'opacity-60' : ''
                  }`}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-bold text-sm">비밀번호 재설정</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <View className="align-center mt-6">
              <TouchableOpacity
                onPress={() => {
                  setMode('login');
                  setError('');
                  setFoundId(null);
                }}
                className="items-center"
              >
                <Text className="text-xs text-primary-500 font-bold">
                  로그인 화면으로 돌아가기
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <Modal
        visible={googleModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (!googleLoading) setGoogleModalVisible(false);
        }}
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl flex-col justify-between min-h-[480px]">
            <View>
              {/* Google Logo */}
              <View className="flex-row justify-center items-center mb-6">
                <Svg viewBox="0 0 24 24" width="20" height="20" className="mr-2">
                  <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                  <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </Svg>
                <Text className="font-extrabold text-gray-700 text-base tracking-tight">Google</Text>
              </View>

              {/* Heading */}
              <View className="items-center mb-6">
                <Text className="text-xl font-bold text-gray-900 mb-1">계정 선택</Text>
                <Text className="text-xs text-gray-500 text-center">
                  <Text className="font-bold text-gray-800">WeOrder</Text>(으)로 이동
                </Text>
              </View>

              {/* Error Message */}
              {googleError ? (
                <View className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 mb-4">
                  <Text className="text-xs text-red-600 text-center">{googleError}</Text>
                </View>
              ) : null}

              {googleLoading ? (
                <View className="py-8 justify-center items-center">
                  <ActivityIndicator size="large" color="#4285F4" />
                  <Text className="text-xs text-gray-500 mt-3 font-semibold">로그인 처리 중...</Text>
                </View>
              ) : googleTab === 'picker' ? (
                <View className="gap-2">
                  {googleAccounts.map((account) => (
                    <TouchableOpacity
                      key={account.email}
                      onPress={() => handleGoogleLogin(account.email, account.name)}
                      className="w-full flex-row items-center px-4 py-3 bg-gray-50 active:bg-gray-100 rounded-2xl border border-gray-100"
                    >
                      <Image
                        source={{ uri: account.avatar }}
                        className="w-9 h-9 rounded-full mr-3"
                      />
                      <View className="flex-1">
                        <Text className="text-xs font-extrabold text-gray-800">{account.name}</Text>
                        <Text className="text-[10px] text-gray-500">{account.email}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity
                    onPress={() => {
                      setGoogleTab('custom');
                      setGoogleError('');
                    }}
                    className="w-full flex-row items-center px-4 py-4 bg-gray-50 active:bg-gray-100 rounded-2xl border border-gray-100"
                  >
                    <View className="w-9 h-9 rounded-full bg-gray-200 items-center justify-center mr-3">
                      <Svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#6b7280" strokeWidth="2">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M18 21a6 6 0 0 0-12 0" />
                      </Svg>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-bold text-gray-700">다른 계정 사용</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="gap-4">
                  <View>
                    <Text className="text-xs font-bold text-gray-700 mb-1.5">이름</Text>
                    <TextInput
                      value={googleCustomForm.name}
                      onChangeText={(text) => setGoogleCustomForm((f) => ({ ...f, name: text }))}
                      className="w-full bg-gray-100 rounded-2xl px-5 py-3.5 text-sm text-gray-900"
                      autoCapitalize="none"
                      placeholder="이름 입력"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>

                  <View>
                    <Text className="text-xs font-bold text-gray-700 mb-1.5">이메일 주소</Text>
                    <TextInput
                      value={googleCustomForm.email}
                      onChangeText={(text) => setGoogleCustomForm((f) => ({ ...f, email: text }))}
                      className="w-full bg-gray-100 rounded-2xl px-5 py-3.5 text-sm text-gray-900"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      placeholder="example@gmail.com"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>

                  <View className={`flex-row ${googleAccounts.length > 0 ? 'justify-between' : 'justify-end'} items-center mt-2`}>
                    {googleAccounts.length > 0 && (
                      <TouchableOpacity
                        onPress={() => {
                          setGoogleTab('picker');
                          setGoogleError('');
                        }}
                      >
                        <Text className="text-xs text-blue-600 font-bold">계정 선택으로 이동</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      onPress={handleGoogleCustomSubmit}
                      className="bg-blue-600 rounded-xl px-5 py-2.5"
                    >
                      <Text className="text-white font-bold text-xs">다음</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

            </View>

            {/* Cancel/Close Footer */}
            {!googleLoading && (
              <TouchableOpacity
                onPress={() => setGoogleModalVisible(false)}
                className="mt-6 border-t border-gray-100 pt-4 items-center"
              >
                <Text className="text-xs text-gray-400 font-bold">닫기</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}