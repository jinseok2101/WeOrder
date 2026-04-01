import { useState } from 'react';
import { CreditCard, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import { useMutation } from '@tanstack/react-query';

export default function PaymentSettings() {
  const { user, setUser } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    tossId: user?.tossId || '',
    kakaoPayLink: user?.kakaoPayLink || '',
    bankAccount: user?.bankAccount || '',
  });
  const [successMsg, setSuccessMsg] = useState('');

  const mutation = useMutation({
    mutationFn: authApi.updatePayment,
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      setSuccessMsg('결제 정보가 저장되었습니다.');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <CreditCard size={18} className="text-primary-500" />
          <span className="font-bold text-gray-700 text-sm">내 정산/계좌 정보 설정</span>
        </div>
        {isOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>

      {isOpen && (
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-100 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 block">카카오페이 송금 링크</label>
            <input
              type="text"
              value={form.kakaoPayLink}
              onChange={(e) => setForm({ ...form, kakaoPayLink: e.target.value })}
              placeholder="예: https://qr.kakaopay.com/..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 block">일반 계좌번호</label>
            <input
              type="text"
              value={form.bankAccount}
              onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
              placeholder="예: 카카오뱅크 3333-12-..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <p className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
              {successMsg && <><CheckCircle2 size={14} />{successMsg}</>}
            </p>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="bg-primary-500 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              저장
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
