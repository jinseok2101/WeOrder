import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { cn } from '../lib/utils';

export default function Auth() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ email: '', nickname: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) {
    navigate('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-orange-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm text-center mb-6">
        <img 
          src="/icons/icon-512.png" 
          alt="WeOrder Logo" 
          className="w-16 h-16 rounded-[20px] mx-auto mb-3 shadow-lg shadow-orange-100" 
        />
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">WeOrder</h1>
        <p className="text-xs text-gray-500 font-medium mt-1">같이 시키면 더 맛있어요</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-[32px] shadow-xl p-8">
        <div className="text-center mb-6">
          <h2 className="text-xl font-extrabold text-gray-900">
            {mode === 'login' ? '로그인' : '회원가입'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">이메일</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full bg-gray-100 border-0 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-400"
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
                className="w-full bg-gray-100 border-0 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-400"
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
                className="w-full bg-gray-100 border-0 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 pr-12 placeholder-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
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

        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => alert('카카오 로그인은 준비 중입니다.')}
            className="flex-1 flex items-center justify-center space-x-2 bg-[#FEE500] hover:bg-[#FCE000] text-[#191919] rounded-2xl py-3 text-xs font-bold transition-colors"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="#191919" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3c-4.97 0-9 3.18-9 7.1 0 2.5 1.62 4.7 4.1 5.92-.17.6-.62 2.22-.7 2.56-.12.48.17.47.36.35.15-.1 2.37-1.6 3.32-2.24.62.1 1.26.17 1.92.17 4.97 0 9-3.18 9-7.1S16.97 3 12 3z"/>
            </svg>
            <span>카카오 로그인</span>
          </button>
          
          <button
            type="button"
            onClick={() => alert('Google 로그인은 준비 중입니다.')}
            className="flex-1 flex items-center justify-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl py-3 text-xs font-bold transition-colors"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            <span>Google 로그인</span>
          </button>
        </div>

        <div className="text-center mt-8 space-y-2">
          <div>
            <button
              type="button"
              onClick={() => alert('비밀번호 재설정 기능은 준비 중입니다.')}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              비밀번호를 잊으셨나요? <span className="font-bold text-primary-500 hover:underline">재설정</span>
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
      </div>
    </div>
  );
}
