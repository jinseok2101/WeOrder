import { useState, useEffect } from 'react';

declare global {
  interface Window {
    google: any;
  }
}

export default function MockGoogleLogin() {
  const [clientId, setClientId] = useState(() => {
    return (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || localStorage.getItem('weorder_google_client_id') || '';
  });
  const [clientIdInput, setClientIdInput] = useState('');
  const [error, setError] = useState('');
  const [loadingSdk, setLoadingSdk] = useState(false);

  // Dynamic GSI Loader & Render Hook
  useEffect(() => {
    if (!clientId) return;

    let isMounted = true;
    setLoadingSdk(true);

    const initGsi = () => {
      if (!window.google?.accounts?.id) return;
      
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: any) => {
            if (!isMounted) return;
            if (response.credential) {
              if (window.opener) {
                window.opener.postMessage(
                  {
                    type: 'REAL_GOOGLE_SUCCESS',
                    token: response.credential
                  },
                  window.location.origin
                );
                window.close();
              } else {
                alert('구글 로그인에 성공했습니다! (부모 창이 존재하지 않습니다.)');
              }
            }
          },
          auto_select: false
        });

        const container = document.getElementById('realGoogleButton');
        if (container) {
          window.google.accounts.id.renderButton(container, {
            theme: 'outline',
            size: 'large',
            width: 350
          });
        }
        setLoadingSdk(false);
      } catch (err) {
        console.error('GSI Init Error:', err);
        setError('Google SDK 초기화에 실패했습니다. Client ID가 올바른지 확인해주세요.');
        setLoadingSdk(false);
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
      script.onerror = () => {
        setError('Google SDK 로드에 실패했습니다. 인터넷 상태를 확인해 주세요.');
        setLoadingSdk(false);
      };
      document.head.appendChild(script);
    }

    return () => {
      isMounted = false;
    };
  }, [clientId]);
  const handleSaveClientId = () => {
    const trimmed = clientIdInput.trim();
    if (!trimmed) {
      return setError('구글 클라이언트 ID를 입력해 주세요.');
    }
    localStorage.setItem('weorder_google_client_id', trimmed);
    setClientId(trimmed);
    setError('');

    if (window.opener) {
      window.opener.postMessage(
        {
          type: 'GOOGLE_CLIENT_ID_UPDATED',
          clientId: trimmed
        },
        window.location.origin
      );
      window.close();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[420px] bg-white border border-slate-100 rounded-2xl p-8 shadow-md flex flex-col justify-between min-h-[480px] transition-all duration-300">
        <div>
          {/* Google Logo & App Identity */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center justify-center w-12 h-12 bg-slate-50 rounded-2xl mb-4 border border-slate-100 shadow-sm">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-slate-800 tracking-tight">Google 계정으로 로그인</h1>
            <p className="text-xs text-slate-500 mt-1.5 font-medium">WeOrder 서비스와 안전하게 연동됩니다</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl p-3.5 text-xs text-center font-medium mb-6 animate-pulse">
              {error}
            </div>
          )}

          {/* Main Content Area */}
          {clientId ? (
            <div className="space-y-6 flex flex-col items-center py-6">
              {loadingSdk ? (
                <div className="flex flex-col items-center justify-center py-6 space-y-3">
                  <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                  <p className="text-xs text-slate-400 font-medium">Google 로그인 버튼을 로딩 중입니다...</p>
                </div>
              ) : (
                <div className="w-full flex justify-center transform hover:scale-[1.01] transition-all">
                  <div id="realGoogleButton" className="w-full flex justify-center min-h-[44px]"></div>
                </div>
              )}
              
              {/* Client ID info */}
              <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-center mt-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">설정된 Google Client ID</span>
                <p className="text-[10px] text-slate-500 font-mono break-all line-clamp-1 bg-white border border-slate-100 rounded p-1.5 select-all">
                  {clientId}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('weorder_google_client_id');
                    setClientId('');
                    setError('');
                  }}
                  className="mt-2.5 text-[11px] text-red-500 hover:text-red-600 hover:underline font-bold transition-all"
                >
                  Client ID 재설정
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5 py-4">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-left">
                <p className="text-xs font-bold text-slate-700 mb-1.5">🔑 Client ID 연동 필요</p>
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  Google SSO 실제 로그인을 가동하려면 구글 클라우드 콘솔에서 발급받은 웹 애플리케이션용 <strong>클라이언트 ID</strong>를 입력해 주십시오.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-500 text-left">Google Client ID</label>
                <input
                  type="text"
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  placeholder="예: 123456-abcdef.apps.googleusercontent.com"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-mono transition-all placeholder:text-slate-300"
                />
                <button
                  type="button"
                  onClick={handleSaveClientId}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3.5 text-xs font-bold transition-all shadow-md shadow-blue-100 mt-2 hover:shadow-lg"
                >
                  저장 및 연동하기
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center text-[10px] text-slate-400 pt-6 border-t border-slate-100 mt-8 font-medium">
          <div>WeOrder 안전 로그인</div>
          <div className="flex space-x-3">
            <a href="#" className="hover:text-slate-600 transition-colors">도움말</a>
            <a href="#" className="hover:text-slate-600 transition-colors">개인정보보호</a>
          </div>
        </div>
      </div>
    </div>
  );
}
