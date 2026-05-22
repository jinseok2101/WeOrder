import { useState, useEffect } from 'react';

declare global {
  interface Window {
    Kakao: any;
  }
}

export default function MockKakaoLogin() {
  const [activeTab, setActiveTab] = useState<'real' | 'mock'>('real');
  const [kakaoKey, setKakaoKey] = useState(() => {
    return (import.meta.env.VITE_KAKAO_JS_KEY as string) || localStorage.getItem('weorder_kakao_js_key') || '';
  });
  const [kakaoKeyInput, setKakaoKeyInput] = useState('');
  
  // Mock login states
  const [mockEmail, setMockEmail] = useState('');
  const [mockNickname, setMockNickname] = useState('');
  
  const [error, setError] = useState('');
  const [loadingSdk, setLoadingSdk] = useState(false);

  // Dynamic Kakao Loader & Render Hook
  useEffect(() => {
    if (!kakaoKey || activeTab !== 'real') return;

    let isMounted = true;
    setLoadingSdk(true);

    const initKakao = () => {
      if (!window.Kakao) return;
      
      try {
        if (!window.Kakao.isInitialized()) {
          window.Kakao.init(kakaoKey);
        }
        setLoadingSdk(false);
      } catch (err) {
        console.error('Kakao Init Error:', err);
        setError('카카오 SDK 초기화에 실패했습니다. JavaScript 키가 올바른지 확인해주세요.');
        setLoadingSdk(false);
      }
    };

    if (window.Kakao) {
      initKakao();
    } else {
      const script = document.createElement('script');
      script.src = 'https://developers.kakao.com/sdk/js/kakao.min.js';
      script.async = true;
      script.onload = initKakao;
      script.onerror = () => {
        setError('카카오 SDK 로드에 실패했습니다. 인터넷 상태를 확인해 주세요.');
        setLoadingSdk(false);
      };
      document.head.appendChild(script);
    }

    return () => {
      isMounted = false;
    };
  }, [kakaoKey, activeTab]);

  const handleSaveKakaoKey = () => {
    const trimmed = kakaoKeyInput.trim();
    if (!trimmed) {
      return setError('카카오 JavaScript 키를 입력해 주세요.');
    }
    localStorage.setItem('weorder_kakao_js_key', trimmed);
    setKakaoKey(trimmed);
    setError('');

    if (window.opener) {
      window.opener.postMessage(
        {
          type: 'KAKAO_JS_KEY_UPDATED',
          kakaoKey: trimmed
        },
        window.location.origin
      );
      // We don't close instantly so the user can see it successfully updated, or we can close it.
      // Closing it instantly is cleaner as the parent will reload the SDK.
      window.close();
    }
  };

  const handleRealLogin = () => {
    if (!window.Kakao) return setError('카카오 SDK가 준비되지 않았습니다.');
    setError('');
    
    try {
      window.Kakao.Auth.login({
        success: (authObj: any) => {
          if (window.opener) {
            window.opener.postMessage(
              {
                type: 'REAL_KAKAO_SUCCESS',
                token: authObj.access_token
              },
              window.location.origin
            );
            window.close();
          } else {
            alert('카카오 로그인에 성공했습니다! (부모 창이 존재하지 않습니다.)');
          }
        },
        fail: (err: any) => {
          console.error('Kakao login fail:', err);
          setError('카카오 인증 중 오류가 발생했습니다.');
        }
      });
    } catch (e) {
      setError('카카오 인증 프로세스를 시작하는 중 에러가 발생했습니다.');
    }
  };

  const handleMockLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const emailTrimmed = mockEmail.trim();
    const nicknameTrimmed = mockNickname.trim();

    if (!emailTrimmed || !nicknameTrimmed) {
      return setError('이메일 주소와 닉네임을 모두 입력해 주세요.');
    }

    if (window.opener) {
      window.opener.postMessage(
        {
          type: 'MOCK_KAKAO_SUCCESS',
          token: `mock_kakao_token_${Date.now()}`,
          email: emailTrimmed,
          nickname: nicknameTrimmed
        },
        window.location.origin
      );
      window.close();
    } else {
      alert('모의 카카오 로그인 완료 (부모 창 없음)');
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[420px] bg-white border border-slate-100 rounded-3xl p-8 shadow-md flex flex-col justify-between min-h-[500px] transition-all duration-300">
        <div>
          {/* Kakao Logo & Identity */}
          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center justify-center w-12 h-12 bg-[#FEE500] rounded-2xl mb-4 border border-[#E5CF00] shadow-sm">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="#191919">
                <path d="M12 3c-4.97 0-9 3.18-9 7.1 0 2.5 1.62 4.7 4.1 5.92-.17.6-.62 2.22-.7 2.56-.12.48.17.47.36.35.15-.1 2.37-1.6 3.32-2.24.62.1 1.26.17 1.92.17 4.97 0 9-3.18 9-7.1S16.97 3 12 3z"/>
              </svg>
            </div>
            <h1 className="text-xl font-extrabold text-[#191919] tracking-tight">카카오 계정 연동</h1>
            <p className="text-xs text-slate-500 mt-1.5 font-medium">WeOrder 서비스와 카카오 로그인을 구성합니다</p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('real');
                setError('');
              }}
              className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'real' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              실제 서비스 연동
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('mock');
                setError('');
              }}
              className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'mock' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              개발자 모의 로그인
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl px-4 py-3 text-xs text-center font-bold mb-6">
              {error}
            </div>
          )}

          {/* Real Tab Contents */}
          {activeTab === 'real' ? (
            kakaoKey ? (
              <div className="space-y-6 flex flex-col items-center py-4">
                {loadingSdk ? (
                  <div className="flex flex-col items-center justify-center py-6 space-y-3">
                    <div className="w-8 h-8 border-2 border-slate-200 border-t-[#FEE500] rounded-full animate-spin"></div>
                    <p className="text-xs text-slate-400 font-bold">카카오 SDK를 로딩 중입니다...</p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleRealLogin}
                    className="w-full flex items-center justify-center space-x-2 bg-[#FEE500] hover:bg-[#FCE000] text-[#191919] rounded-2xl py-4 text-xs font-bold transition-all shadow-md hover:shadow-lg hover:scale-[1.01]"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="#191919" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 3c-4.97 0-9 3.18-9 7.1 0 2.5 1.62 4.7 4.1 5.92-.17.6-.62 2.22-.7 2.56-.12.48.17.47.36.35.15-.1 2.37-1.6 3.32-2.24.62.1 1.26.17 1.92.17 4.97 0 9-3.18 9-7.1S16.97 3 12 3z"/>
                    </svg>
                    <span>카카오 로그인 시작</span>
                  </button>
                )}
                
                {/* Key Status Information */}
                <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center mt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">설정된 카카오 JavaScript 키</span>
                  <p className="text-[10px] text-slate-500 font-mono break-all line-clamp-1 bg-white border border-slate-100 rounded p-1.5 select-all">
                    {kakaoKey}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem('weorder_kakao_js_key');
                      setKakaoKey('');
                      setError('');
                    }}
                    className="mt-2.5 text-[11px] text-red-500 hover:text-red-600 hover:underline font-bold transition-all"
                  >
                    키값 초기화 및 재설정
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                <div className="bg-[#FFFDF0] border border-[#FCEBA2] rounded-2xl p-4 text-left">
                  <p className="text-xs font-bold text-amber-800 mb-1">🔑 JavaScript 키 등록 필요</p>
                  <p className="text-[11px] text-amber-700 leading-relaxed font-semibold">
                    실제 카카오 로그인을 가동하려면 카카오 디벨로퍼스 콘솔에서 발급받은 <strong>JavaScript 키</strong>를 등록해 주세요.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-500 text-left">JavaScript 키</label>
                  <input
                    type="text"
                    value={kakaoKeyInput}
                    onChange={(e) => setKakaoKeyInput(e.target.value)}
                    placeholder="예: 71239ab7d2c18d9f45610a2..."
                    className="w-full border border-slate-200 rounded-2xl px-4 py-3.5 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 font-mono transition-all placeholder:text-slate-300"
                  />
                  <button
                    type="button"
                    onClick={handleSaveKakaoKey}
                    className="w-full bg-[#191919] hover:bg-black text-[#FEE500] rounded-2xl py-4 text-xs font-bold transition-all shadow-md mt-2"
                  >
                    저장 및 연동 시작
                  </button>
                </div>
              </div>
            )
          ) : (
            /* Mock Tab Contents */
            <form onSubmit={handleMockLogin} className="space-y-4 py-2 text-left">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-slate-700 mb-1">💡 개발자 모의 로그인</p>
                <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                  카카오 개발자 키 발급 없이도, 이메일 주소와 닉네임만 입력하여 간편하게 카카오 로그인 프로세스를 시뮬레이션할 수 있습니다.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1.5">이메일 주소 (ID)</label>
                <input
                  type="email"
                  value={mockEmail}
                  onChange={(e) => setMockEmail(e.target.value)}
                  placeholder="test-kakao@example.com"
                  className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-200 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1.5">닉네임</label>
                <input
                  type="text"
                  value={mockNickname}
                  onChange={(e) => setMockNickname(e.target.value)}
                  placeholder="모의카카오"
                  maxLength={15}
                  className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-200 font-semibold"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#FEE500] hover:bg-[#FCE000] text-[#191919] rounded-2xl py-4 text-xs font-bold transition-all shadow-md mt-2"
              >
                모의 로그인으로 시작
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center text-[10px] text-slate-400 pt-6 border-t border-slate-100 mt-8 font-medium">
          <div>WeOrder 카카오 연동</div>
          <div className="flex space-x-3">
            <a href="#" className="hover:text-slate-600 transition-colors">도움말</a>
            <a href="#" className="hover:text-slate-600 transition-colors">개인정보처리방침</a>
          </div>
        </div>
      </div>
    </div>
  );
}
