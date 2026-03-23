import { useState } from 'react';
import { X } from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';

interface ItemFormData {
  name: string;
  price: string;
  quantity: string;
  options: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; price: number; quantity: number; options?: string }) => Promise<void>;
  initial?: { name: string; price: number; quantity: number; options?: string | null };
  title?: string;
}

export default function AddItemModal({ open, onClose, onSubmit, initial, title = '메뉴 추가' }: Props) {
  const [form, setForm] = useState<ItemFormData>({
    name: initial?.name ?? '',
    price: initial?.price?.toString() ?? '',
    quantity: initial?.quantity?.toString() ?? '1',
    options: initial?.options ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) return setError('메뉴 이름을 입력해주세요.');
    const price = parseInt(form.price.replace(/,/g, ''));
    if (!price || price <= 0) return setError('올바른 가격을 입력해주세요.');
    const quantity = parseInt(form.quantity);
    if (!quantity || quantity <= 0) return setError('수량을 1 이상으로 입력해주세요.');

    setLoading(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        price,
        quantity,
        options: form.options.trim() || undefined,
      });
      onClose();
    } catch {
      setError('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl w-full max-w-lg p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">메뉴 이름</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="예: 짜장면"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">가격</label>
              <div className="relative">
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="0"
                  min="0"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">수량</label>
              <input
                type="number"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                min="1"
                max="99"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              옵션 <span className="text-gray-400 font-normal">(선택)</span>
            </label>
            <input
              type="text"
              value={form.options}
              onChange={(e) => setForm((f) => ({ ...f, options: e.target.value }))}
              placeholder="예: 곱빼기, 면 추가"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {form.price && parseInt(form.price) > 0 && parseInt(form.quantity) > 0 && (
            <div className="bg-primary-50 rounded-xl px-4 py-2.5 text-sm">
              <span className="text-gray-600">소계: </span>
              <span className="font-bold text-primary-700">
                {formatCurrency(parseInt(form.price) * parseInt(form.quantity || '1'))}
              </span>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className={cn(
                'flex-1 bg-primary-500 text-white rounded-xl py-3 text-sm font-bold hover:bg-primary-600 transition-colors',
                loading && 'opacity-60 cursor-not-allowed'
              )}
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
