import { useState } from 'react';
import { User as UserIcon, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import { useMutation } from '@tanstack/react-query';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmed = nickname.trim();
    if (!trimmed) {
      return setErrorMsg('닉네임은 공백일 수 없습니다.');
    }

    mutation.mutate({ nickname: trimmed });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <UserIcon size={18} className="text-primary-500" />
          <span className="font-bold text-gray-700 text-sm">내 정보 관리</span>
        </div>
        {isOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>

      {isOpen && (
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-100 space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-bold text-gray-600 block">이메일 계정 (수정 불가)</label>
            <input
              type="text"
              value={user?.email || ''}
              disabled
              className="w-full bg-gray-100 border-0 rounded-xl px-3 py-2.5 text-sm text-gray-400 font-semibold cursor-not-allowed focus:outline-none"
            />
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-xs font-bold text-gray-600 block">닉네임</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setErrorMsg('');
              }}
              maxLength={15}
              placeholder="변경할 닉네임을 입력해 주세요"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {errorMsg && (
              <p className="text-[11px] text-red-600 font-semibold mt-1 ml-0.5">
                ❌ {errorMsg}
              </p>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between">
            <p className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
              {successMsg && <><CheckCircle2 size={14} />{successMsg}</>}
            </p>
            <button
              type="submit"
              disabled={mutation.isPending || !nickname.trim()}
              className="bg-primary-500 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {mutation.isPending ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
