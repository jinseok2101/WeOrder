import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { cn } from '../lib/utils';

declare global {
  interface Window {
    google: any;
    Kakao: any;
  }
}

export default function Auth() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [mode, setMode] = useState<'login' | 'register' | 'find'>('login');
  const [findTab, setFindTab] = useState<'id' | 'password'>('id');
  
  const [form, setForm] = useState({ email: '', nickname: '', password: '' });
  const [findForm, setFindForm] = useState({ nickname: '', email: '', newPassword: '' });
  const [foundId, setFoundId] = useState<string | null>(null);

  const [showPw, setShowPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '';
  const kakaoKey = (import.meta.env.VITE_KAKAO_JS_KEY as string) || '';

  // Dynamic GSI Loader & Render Hook on the main page
  useEffect(() => {
    if (!clientId) return;

    let isMounted = true;

    const initGsi = () => {
      if (!window.google?.accounts?.id) return;
      
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: any) => {
            if (!isMounted) return;
            if (response.credential) {
              setLoading(true);
              try {
                const res = await authApi.googleLogin({ token: response.credential });
                setAuth(res.user, res.token);
                navigate('/');
              } catch (err: any) {
                const msg = err?.response?.data?.message || '구글 로그인 중 오류가 발생했습니다.';
                setError(msg);
              } finally {
                setLoading(false);
              }
            }
          },
          auto_select: false
        });

        // Try mounting the button
        const container = document.getElementById('realGoogleButtonAuth');
        if (container) {
          window.google.accounts.id.renderButton(container, {
            theme: 'outline',
            size: 'large',
            width: 320, // fits perfectly inside the max-w-sm login card
          });
        }
      } catch (err) {
        console.error('GSI Auth Page Init Error:', err);
      }
    };

    if (window.google?.accounts?.id) {
      initGsi();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGsi;
      document.head.appendChild(script);
    }

    return () => {
      isMounted = false;
    };
  }, [clientId]);

  // Dynamic Kakao SDK Loader & Init Hook
  useEffect(() => {
    if (!kakaoKey) return;

    let isMounted = true;

    const initKakao = () => {
      if (!window.Kakao) return;
      try {
        if (!window.Kakao.isInitialized()) {
          window.Kakao.init(kakaoKey);
        }
      } catch (err) {
        console.error('Kakao Init Auth Page Error:', err);
      }
    };

    if (window.Kakao) {
      initKakao();
    } else {
      const script = document.createElement('script');
      script.src = 'https://developers.kakao.com/sdk/js/kakao.min.js';
      script.async = true;
      script.onload = initKakao;
      document.head.appendChild(script);
    }

    return () => {
      isMounted = false;
    };
  }, [kakaoKey]);

  if (isAuthenticated) {
    navigate('/');
    return null;
  }

  const handleCapsLock = (e: React.KeyboardEvent) => {
    setIsCapsLockOn(e.getModifierState('CapsLock'));
  };

  const handleKakaoLogin = () => {
    setError('');

    if (!kakaoKey) {
      console.warn('Kakao JS Key가 설정되지 않았습니다.');
      return setError('카카오 로그인을 사용할 수 없습니다. 시스템 설정을 확인해 주세요.');
    }

    if (!window.Kakao) {
      return setError('카카오 SDK가 준비 중입니다. 잠시 후 다시 시도해 주세요.');
    }

    try {
      window.Kakao.Auth.login({
        success: async (authObj: any) => {
          setLoading(true);
          try {
            const res = await authApi.kakaoLogin({ token: authObj.access_token });
            setAuth(res.user, res.token);
            navigate('/');
          } catch (err: any) {
            const msg = err?.response?.data?.message || '카카오 로그인 연동 중 오류가 발생했습니다.';
            setError(msg);
          } finally {
            setLoading(false);
          }
        },
        fail: (err: any) => {
          console.error('Kakao login failed:', err);
          setError('카카오 로그인 인증에 실패했습니다.');
        }
      });
    } catch (e) {
      console.error('Kakao Auth trigger error:', e);
      setError('카카오 로그인을 실행하는 중에 오류가 발생했습니다.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      navigate('/');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        '오류가 발생했습니다. 다시 시도해주세요.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFindId = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFoundId(null);

    if (!findForm.nickname.trim()) {
      return setError('닉네임을 입력해주세요.');
    }

    setLoading(true);
    try {
      const res = await authApi.findId(findForm.nickname.trim());
      setFoundId(res.email);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        '해당 닉네임으로 등록된 회원을 찾을 수 없습니다.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
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
      alert('비밀번호가 성공적으로 재설정되었습니다. 로그인 화면으로 이동합니다.');
      setMode('login');
      setForm((f) => ({ ...f, email: findForm.email }));
      setFindForm({ nickname: '', email: '', newPassword: '' });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        '비밀번호 재설정에 실패했습니다. 정보를 다시 확인해주세요.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm text-center mb-6">
        <img 
          src="/icons/icon-512.png" 
          alt="WeOrder Logo" 
          className="w-16 h-16 rounded-[20px] mx-auto mb-3 shadow-lg shadow-orange-100" 
        />
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">WeOrder</h1>
      </div>

      <div className="w-full max-w-sm bg-white rounded-[32px] shadow-xl p-8">
        {mode !== 'find' ? (
          <>
            <div className="text-center mb-6">
              <h2 className="text-xl font-extrabold text-gray-900">
                {mode === 'login' ? '로그인' : '회원가입'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">아이디</label>
                <input
                  type="text"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full bg-gray-100 border-0 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">닉네임</label>
                  <input
                    type="text"
                    value={form.nickname}
                    onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
                    maxLength={20}
                    className="w-full bg-gray-100 border-0 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">비밀번호</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    onKeyDown={handleCapsLock}
                    onKeyUp={handleCapsLock}
                    className="w-full bg-gray-100 border-0 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {isCapsLockOn && (
                  <div className="text-[10px] text-amber-600 font-bold mt-1.5 ml-1">
                    ⚠️ Caps Lock이 켜져 있습니다.
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-xs text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'w-full bg-primary-500 text-white rounded-2xl py-4 font-bold text-sm mt-2 hover:bg-primary-600 transition-colors shadow-lg shadow-primary-100',
                  loading && 'opacity-60 cursor-not-allowed'
                )}
              >
                {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
              </button>
            </form>

            <div className="flex items-center my-6">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="px-4 text-[10px] font-bold text-gray-400 tracking-wider">또는</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            <div className="space-y-3">
              {kakaoKey && (
                <button
                  type="button"
                  onClick={handleKakaoLogin}
                  className="w-full flex items-center justify-center space-x-2 bg-[#FEE500] hover:bg-[#FCE000] text-[#191919] rounded-2xl py-3.5 text-xs font-bold transition-colors"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="#191919" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 3c-4.97 0-9 3.18-9 7.1 0 2.5 1.62 4.7 4.1 5.92-.17.6-.62 2.22-.7 2.56-.12.48.17.47.36.35.15-.1 2.37-1.6 3.32-2.24.62.1 1.26.17 1.92.17 4.97 0 9-3.18 9-7.1S16.97 3 12 3z"/>
                  </svg>
                  <span>카카오 로그인</span>
                </button>
              )}
              
              {clientId && (
                <div className="w-full flex justify-center">
                  <div id="realGoogleButtonAuth" className="w-full flex justify-center min-h-[44px]"></div>
                </div>
              )}
            </div>

            <div className="text-center mt-8 space-y-2">
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setMode('find');
                    setError('');
                    setFoundId(null);
                    setFindForm({ nickname: '', email: '', newPassword: '' });
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  아이디 또는 비밀번호를 잊으셨나요? <span className="font-bold text-primary-500 hover:underline">찾기 / 재설정</span>
                </button>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'login' ? 'register' : 'login');
                    setError('');
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {mode === 'login' ? (
                    <>계정이 없으신가요? <span className="font-bold text-primary-500 hover:underline">회원가입</span></>
                  ) : (
                    <>이미 계정이 있으신가요? <span className="font-bold text-primary-500 hover:underline">로그인</span></>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex border-b border-gray-100 mb-6">
              <button
                type="button"
                onClick={() => {
                  setFindTab('id');
                  setError('');
                  setFoundId(null);
                }}
                className={cn(
                  'flex-1 pb-3 text-sm font-bold text-gray-400 transition-colors border-b-2 border-transparent',
                  findTab === 'id' && 'text-primary-500 border-primary-500'
                )}
              >
                아이디 찾기
              </button>
              <button
                type="button"
                onClick={() => {
                  setFindTab('password');
                  setError('');
                  setFoundId(null);
                }}
                className={cn(
                  'flex-1 pb-3 text-sm font-bold text-gray-400 transition-colors border-b-2 border-transparent',
                  findTab === 'password' && 'text-primary-500 border-primary-500'
                )}
              >
                비밀번호 재설정
              </button>
            </div>

            {findTab === 'id' ? (
              <form onSubmit={handleFindId} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">가입된 닉네임</label>
                  <input
                    type="text"
                    value={findForm.nickname}
                    onChange={(e) => setFindForm((f) => ({ ...f, nickname: e.target.value }))}
                    className="w-full bg-gray-100 border-0 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {foundId && (
                  <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-center my-2">
                    <p className="text-[10px] text-green-700 font-semibold mb-1">찾으신 아이디는 다음과 같습니다</p>
                    <p className="text-sm font-extrabold text-green-900 tracking-wider bg-white rounded-lg py-2 border border-green-200">
                      {foundId}
                    </p>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-xs text-red-600">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-500 text-white rounded-2xl py-4 font-bold text-sm hover:bg-primary-600 transition-colors shadow-lg"
                >
                  {loading ? '검색 중...' : '아이디 찾기'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">아이디</label>
                  <input
                    type="text"
                    value={findForm.email}
                    onChange={(e) => setFindForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full bg-gray-100 border-0 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">닉네임</label>
                  <input
                    type="text"
                    value={findForm.nickname}
                    onChange={(e) => setFindForm((f) => ({ ...f, nickname: e.target.value }))}
                    className="w-full bg-gray-100 border-0 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">새 비밀번호</label>
                  <div className="relative">
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={findForm.newPassword}
                      onChange={(e) => setFindForm((f) => ({ ...f, newPassword: e.target.value }))}
                      onKeyDown={handleCapsLock}
                      onKeyUp={handleCapsLock}
                      className="w-full bg-gray-100 border-0 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPw ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  {isCapsLockOn && (
                    <div className="text-[10px] text-amber-600 font-bold mt-1.5 ml-1">
                      ⚠️ Caps Lock이 켜져 있습니다.
                    </div>
                  )}
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-xs text-red-600">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-500 text-white rounded-2xl py-4 font-bold text-sm hover:bg-primary-600 transition-colors shadow-lg"
                >
                  {loading ? '변경 중...' : '비밀번호 재설정'}
                </button>
              </form>
            )}

            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                  setFoundId(null);
                }}
                className="text-xs text-primary-500 font-bold hover:underline"
              >
                로그인 화면으로 돌아가기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
