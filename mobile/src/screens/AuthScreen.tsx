import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Image, Alert, Modal } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { WebView } from 'react-native-webview';
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
  const [googleCustomForm, setGoogleCustomForm] = useState({ email: '', password: '' });
  const [googleError, setGoogleError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const [kakaoKeyModalVisible, setKakaoKeyModalVisible] = useState(false);
  const [kakaoRestKey, setKakaoRestKey] = useState('');
  const [kakaoRedirectUri, setKakaoRedirectUri] = useState('https://localhost/auth/kakao/callback');
  const [kakaoWebViewModalVisible, setKakaoWebViewModalVisible] = useState(false);
  const [kakaoCustomKeyInput, setKakaoCustomKeyInput] = useState('');
  const [kakaoCustomRedirectUriInput, setKakaoCustomRedirectUriInput] = useState('https://localhost/auth/kakao/callback');

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

  useEffect(() => {
    const loadKakaoKey = async () => {
      try {
        const envKey = process.env.EXPO_PUBLIC_KAKAO_REST_KEY || '';
        const envUri = process.env.EXPO_PUBLIC_KAKAO_REDIRECT_URI || '';

        if (envKey) {
          setKakaoRestKey(envKey);
          setKakaoCustomKeyInput(envKey);
        } else {
          const storedKey = await AsyncStorage.getItem('weorder_kakao_rest_key');
          if (storedKey) {
            setKakaoRestKey(storedKey);
            setKakaoCustomKeyInput(storedKey);
          }
        }

        if (envUri) {
          setKakaoRedirectUri(envUri);
          setKakaoCustomRedirectUriInput(envUri);
        } else {
          const storedUri = await AsyncStorage.getItem('weorder_kakao_redirect_uri');
          if (storedUri) {
            setKakaoRedirectUri(storedUri);
            setKakaoCustomRedirectUriInput(storedUri);
          }
        }
      } catch (e) {
        console.error('Failed to load Kakao REST key', e);
      }
    };
    loadKakaoKey();
  }, []);

  const handleKakaoLoginStart = () => {
    setError('');
    if (!kakaoRestKey) {
      setKakaoKeyModalVisible(true);
    } else {
      setKakaoWebViewModalVisible(true);
    }
  };

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
      setGoogleCustomForm({ email: '', password: '' });
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
    if (!googleCustomForm.email.trim() || !googleCustomForm.password.trim()) {
      return setGoogleError('이메일 주소와 비밀번호를 모두 입력해주세요.');
    }
    if (!googleCustomForm.email.includes('@')) {
      return setGoogleError('유효한 이메일 형식이 아닙니다.');
    }
    const derivedName = googleCustomForm.email.trim().split('@')[0];
    handleGoogleLogin(googleCustomForm.email.trim(), derivedName);
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
                onPress={handleKakaoLoginStart}
                className="flex-1 flex-row bg-[#FEE500] rounded-2xl py-3 items-center justify-center gap-2"
              >
                <Svg viewBox="0 0 24 24" width="16" height="16">
                  <Path d="M12 3c-4.97 0-9 3.18-9 7.1 0 2.5 1.62 4.7 4.1 5.92-.17.6-.62 2.22-.7 2.56-.12.48.17.47.36.35.15-.1 2.37-1.6 3.32-2.24.62.1 1.26.17 1.92.17 4.97 0 9-3.18 9-7.1S16.97 3 12 3z" fill="#191919" />
                </Svg>
                <Text className="text-[#191919] text-xs font-bold">카카오 로그인</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setGoogleModalVisible(true)}
                className="flex-1 flex-row bg-white border border-[#DADCE0] rounded-2xl py-3 items-center justify-center gap-2 active:bg-gray-50"
              >
                <Svg viewBox="0 0 24 24" width="14" height="14">
                  <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                  <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </Svg>
                <Text className="text-[#3C4043] text-xs font-semibold">Google 로그인</Text>
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
                      <Svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#6b7280" strokeWidth={2}>
                        <Circle cx={12} cy={8} r={4} />
                        <Path d="M18 21a6 6 0 0 0-12 0" />
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

                  <View>
                    <Text className="text-xs font-bold text-gray-700 mb-1.5">비밀번호</Text>
                    <TextInput
                      value={googleCustomForm.password}
                      onChangeText={(text) => setGoogleCustomForm((f) => ({ ...f, password: text }))}
                      className="w-full bg-gray-100 rounded-2xl px-5 py-3.5 text-sm text-gray-900"
                      autoCapitalize="none"
                      secureTextEntry={true}
                      placeholder="비밀번호 입력"
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

      {/* 1. Kakao Key Input Modal */}
      <Modal
        visible={kakaoKeyModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setKakaoKeyModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl">
            <View className="items-center mb-6">
              <Text className="text-xl font-bold text-gray-900 mb-2">카카오 로그인 설정</Text>
              <Text className="text-xs text-gray-500 text-center">
                카카오 REST API 키와 Redirect URI가 필요합니다. 발급받으신 정보들을 입력해 주세요.
              </Text>
            </View>

            <View className="gap-4">
              <View>
                <Text className="text-xs font-bold text-gray-700 mb-1.5">REST API 키</Text>
                <TextInput
                  value={kakaoCustomKeyInput}
                  onChangeText={setKakaoCustomKeyInput}
                  className="w-full bg-gray-100 rounded-2xl px-5 py-3.5 text-sm text-gray-900"
                  autoCapitalize="none"
                  placeholder="카카오 REST API 키 입력"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View>
                <Text className="text-xs font-bold text-gray-700 mb-1.5">Redirect URI</Text>
                <TextInput
                  value={kakaoCustomRedirectUriInput}
                  onChangeText={setKakaoCustomRedirectUriInput}
                  className="w-full bg-gray-100 rounded-2xl px-5 py-3.5 text-sm text-gray-900"
                  autoCapitalize="none"
                  placeholder="예: https://weorder-client.vercel.app/auth/kakao/callback"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View className="flex-row justify-between items-center mt-2">
                <TouchableOpacity
                  onPress={() => setKakaoKeyModalVisible(false)}
                  className="px-4 py-2.5"
                >
                  <Text className="text-xs text-gray-400 font-bold">취소</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={async () => {
                    const trimmedKey = kakaoCustomKeyInput.trim();
                    const trimmedUri = kakaoCustomRedirectUriInput.trim();
                    if (!trimmedKey) {
                      Alert.alert('오류', 'REST API 키를 입력해 주세요.');
                      return;
                    }
                    if (!trimmedUri) {
                      Alert.alert('오류', 'Redirect URI를 입력해 주세요.');
                      return;
                    }
                    try {
                      await AsyncStorage.setItem('weorder_kakao_rest_key', trimmedKey);
                      await AsyncStorage.setItem('weorder_kakao_redirect_uri', trimmedUri);
                      setKakaoRestKey(trimmedKey);
                      setKakaoRedirectUri(trimmedUri);
                      setKakaoKeyModalVisible(false);
                      setKakaoWebViewModalVisible(true);
                    } catch (e) {
                      Alert.alert('오류', '설정 저장에 실패했습니다.');
                    }
                  }}
                  className="bg-primary-500 rounded-xl px-5 py-2.5"
                >
                  <Text className="text-white font-bold text-xs">확인</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. Kakao WebView Modal */}
      <Modal
        visible={kakaoWebViewModalVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setKakaoWebViewModalVisible(false)}
      >
        <View className="flex-1 bg-white">
          {/* WebView Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100 mt-12">
            <TouchableOpacity onPress={() => setKakaoWebViewModalVisible(false)}>
              <Text className="text-gray-500 text-sm font-bold">닫기</Text>
            </TouchableOpacity>
            <Text className="text-sm font-bold text-gray-900">카카오 계정으로 로그인</Text>
            <View className="w-8" /> {/* Spacer to keep the title mathematically centered */}
          </View>

          {/* WebView Body */}
          {kakaoWebViewModalVisible && (
            <WebView
              source={{
                uri: `https://kauth.kakao.com/oauth/authorize?client_id=${kakaoRestKey}&redirect_uri=${kakaoRedirectUri}&response_type=code`,
              }}
              onNavigationStateChange={async (newNavState) => {
                const { url } = newNavState;
                if (!url) return;

                if (url.startsWith(kakaoRedirectUri)) {
                  const matches = url.match(/[?&]code=([^&#]+)/);
                  if (matches && matches[1]) {
                    const authCode = matches[1];
                    setKakaoWebViewModalVisible(false);
                    setLoading(true);
                    setError('');
                    try {
                      const response = await fetch('https://kauth.kakao.com/oauth/token', {
                        method: 'POST',
                        headers: {
                          'Content-type': 'application/x-www-form-urlencoded;charset=utf-8',
                        },
                        body: `grant_type=authorization_code&client_id=${kakaoRestKey}&redirect_uri=${kakaoRedirectUri}&code=${authCode}`,
                      });

                      const data = await response.json();
                      const accessToken = data.access_token;
                      
                      if (accessToken) {
                        const res = await authApi.kakaoLogin({ token: accessToken });
                        setAuth(res.user, res.token);
                      } else {
                        setError('카카오 토큰 발급에 실패했습니다.');
                      }
                    } catch (err: any) {
                      setError(err?.response?.data?.message || '카카오 로그인 중 오류가 발생했습니다.');
                    } finally {
                      setLoading(false);
                    }
                  } else {
                    const errMatches = url.match(/[?&]error=([^&#]+)/);
                    if (errMatches) {
                      setKakaoWebViewModalVisible(false);
                      setError(`카카오 로그인 실패: ${errMatches[1]}`);
                    }
                  }
                }
              }}
              style={{ flex: 1 }}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}