import { useState, useEffect } from 'react';

declare global {
  interface Window {
    google: any;
  }
}

interface MockAccount {
  email: string;
  avatar: string;
}

export default function MockGoogleLogin() {
  const [googleAccounts, setGoogleAccounts] = useState<MockAccount[]>(() => {
    try {
      const stored = localStorage.getItem('weorder_google_accounts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [activeTab, setActiveTab] = useState<'picker' | 'custom'>(() => {
    try {
      const stored = localStorage.getItem('weorder_google_accounts');
      const parsed = stored ? JSON.parse(stored) : [];
      return parsed.length > 0 ? 'picker' : 'custom';
    } catch {
      return 'custom';
    }
  });

  const [authMode, setAuthMode] = useState<'mock' | 'real'>('mock');
  const [clientId, setClientId] = useState(() => {
    return localStorage.getItem('weorder_google_client_id') || (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '';
  });
  const [clientIdInput, setClientIdInput] = useState('');

  const [customForm, setCustomForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  // Dynamic GSI Loader & Render Hook
  useEffect(() => {
    if (authMode !== 'real' || !clientId) return;

    let isMounted = true;

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
                alert('구글 로그인에 성공했습니다! (부모 창이 열려있지 않습니다.)');
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
            width: 370
          });
        }
      } catch (err) {
        console.error('GSI Init Error:', err);
        setError('Google SDK 초기화에 실패했습니다. Client ID가 올바른지 확인해주세요.');
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
      };
      document.head.appendChild(script);
    }

    return () => {
      isMounted = false;
    };
  }, [authMode, clientId]);

  const handleSelectAccount = (account: MockAccount) => {
    const derivedName = account.email.split('@')[0];
    sendBack({
      token: `mock_google_token_${Date.now()}_${account.email.replace(/[@.]/g, '')}`,
      email: account.email,
      name: derivedName
    });
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!customForm.email.trim() || !customForm.password.trim()) {
      return setError('이메일 주소와 비밀번호를 모두 입력해주세요.');
    }

    if (!customForm.email.includes('@')) {
      return setError('유효한 이메일 형식이 아닙니다.');
    }

    const derivedName = customForm.email.trim().split('@')[0];

    sendBack({
      token: `mock_google_token_${Date.now()}_custom`,
      email: customForm.email.trim(),
      name: derivedName
    });
  };

  const sendBack = (data: { token: string; email: string; name: string }) => {
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random&size=100`;
    const updatedAccounts = [
      { email: data.email, avatar },
      ...googleAccounts.filter((acc) => acc.email !== data.email)
    ].slice(0, 5); // keep last 5 accounts
    
    try {
      localStorage.setItem('weorder_google_accounts', JSON.stringify(updatedAccounts));
    } catch (e) {
      console.error(e);
    }

    if (window.opener) {
      window.opener.postMessage(
        {
          type: 'MOCK_GOOGLE_SUCCESS',
          ...data
        },
        window.location.origin
      );
      window.close();
    } else {
      alert('인증을 호출한 부모 창이 존재하지 않습니다. 창을 닫고 다시 시도해 주세요.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-[450px] bg-white border border-gray-200 rounded-lg p-10 shadow-sm flex flex-col justify-between min-h-[550px]">
        <div>
          {/* Google Logo */}
          <div className="flex justify-center mb-6">
            <svg viewBox="0 0 24 24" width="24" height="24" className="mr-2">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            <span className="font-semibold text-gray-700 text-lg tracking-tight">Google</span>
          </div>

          {/* Heading */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-normal text-gray-900 mb-2">Google 로그인</h1>
            <p className="text-sm text-gray-600 font-medium">
              <span className="font-bold text-gray-800">WeOrder</span>(으)로 이동
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setAuthMode('mock');
                setError('');
              }}
              className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                authMode === 'mock'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              가상 로그인 (Mock)
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('real');
                setError('');
              }}
              className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                authMode === 'real'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              실제 구글 계정 연동
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-red-600 text-center mb-4">
              {error}
            </div>
          )}

          {authMode === 'mock' ? (
            activeTab === 'picker' ? (
              <div className="space-y-1">
                {googleAccounts.map((account) => {
                  const derivedName = account.email.split('@')[0];
                  return (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => handleSelectAccount(account)}
                      className="w-full flex items-center px-4 py-3 hover:bg-gray-50 rounded-md transition-colors border-b border-gray-100"
                    >
                      <img
                        src={account.avatar}
                        alt={derivedName}
                        className="w-8 h-8 rounded-full mr-3 object-cover"
                      />
                      <div className="text-left">
                        <p className="text-sm font-semibold text-gray-800">{derivedName}</p>
                        <p className="text-xs text-gray-500">{account.email}</p>
                      </div>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('custom');
                    setError('');
                  }}
                  className="w-full flex items-center px-4 py-4 hover:bg-gray-50 rounded-md transition-colors border-b border-gray-100"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#6b7280" strokeWidth="2">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M18 21a6 6 0 0 0-12 0" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-700">다른 계정 사용</p>
                  </div>
                </button>
              </div>
            ) : (
              <form onSubmit={handleCustomSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">이메일 주소</label>
                  <input
                    type="text"
                    value={customForm.email}
                    onChange={(e) => setCustomForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="example@gmail.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">비밀번호</label>
                  <input
                    type="password"
                    value={customForm.password}
                    onChange={(e) => setCustomForm((f) => ({ ...f, password: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="비밀번호 입력"
                  />
                </div>

                <div className={`flex ${googleAccounts.length > 0 ? 'justify-between' : 'justify-end'} items-center pt-2`}>
                  {googleAccounts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('picker');
                        setError('');
                      }}
                      className="text-xs text-blue-600 font-semibold hover:underline"
                    >
                      계정 선택으로 돌아가기
                    </button>
                  )}
                  
                  <button
                    type="submit"
                    className="bg-blue-600 text-white rounded px-5 py-2 text-xs font-semibold hover:bg-blue-700 transition-colors"
                  >
                    다음
                  </button>
                </div>
              </form>
            )
          ) : clientId ? (
            <div className="space-y-6 flex flex-col items-center">
              <div className="w-full bg-blue-50 border border-blue-100 rounded-xl p-4 text-left">
                <p className="text-xs font-extrabold text-blue-800 mb-1">설정된 Google Client ID</p>
                <p className="text-[10px] text-gray-600 break-all font-mono select-all bg-white p-2 rounded border border-blue-200">
                  {clientId}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('weorder_google_client_id');
                    setClientId('');
                    setError('');
                  }}
                  className="mt-2 text-xs text-red-600 hover:underline font-bold"
                >
                  Client ID 재설정
                </button>
              </div>

              <div className="w-full flex justify-center py-4">
                <div id="realGoogleButton" className="w-full flex justify-center"></div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-left text-xs">
                <p className="font-extrabold text-amber-800 mb-2">💡 실제 Google 계정 연동을 위한 설정 안내</p>
                <ol className="list-decimal pl-4 space-y-1.5 text-gray-700 leading-relaxed font-medium">
                  <li>
                    <a
                      href="https://console.cloud.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-bold"
                    >
                      Google Cloud Console
                    </a>
                    에 로그인 후 프로젝트를 생성합니다.
                  </li>
                  <li>
                    <strong>API 및 서비스 &gt; OAuth 동의 화면</strong>을 구성합니다. (앱 등록 및 테스트 사용자 추가)
                  </li>
                  <li>
                    <strong>사용자 인증 정보 만들기 &gt; OAuth 클라이언트 ID</strong>를 클릭합니다.
                  </li>
                  <li>
                    애플리케이션 유형을 <strong>'웹 애플리케이션'</strong>으로 선택합니다.
                  </li>
                  <li>
                    <strong>승인된 JavaScript 원본</strong>에 아래 주소를 입력합니다:
                    <span className="block font-mono bg-white px-2 py-1 rounded border border-amber-200 mt-1 select-all font-semibold text-gray-800 text-center">
                      {window.location.origin}
                    </span>
                  </li>
                  <li>발급받은 <strong>클라이언트 ID</strong>를 복사하여 아래에 입력해주세요.</li>
                </ol>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-600 text-left">Google Client ID 입력</label>
                <input
                  type="text"
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  placeholder="예: 123456-abcdef.apps.googleusercontent.com"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = clientIdInput.trim();
                    if (!trimmed) {
                      return setError('구글 클라이언트 ID를 입력해 주세요.');
                    }
                    localStorage.setItem('weorder_google_client_id', trimmed);
                    setClientId(trimmed);
                    setError('');
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 text-xs font-bold transition-all shadow-md shadow-blue-100"
                >
                  저장 및 연동하기
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex justify-between items-center text-xs text-gray-500 pt-8 border-t border-gray-100 mt-6">
          <div>한국어</div>
          <div className="flex space-x-3">
            <a href="#" className="hover:underline">도움말</a>
            <a href="#" className="hover:underline">개인정보보호</a>
            <a href="#" className="hover:underline">약관</a>
          </div>
        </div>
      </div>
    </div>
  );
}
