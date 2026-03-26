import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Info } from 'lucide-react';
import { roomsApi, CreateRoomPayload } from '../api/rooms';
import { useGeolocation } from '../hooks/useGeolocation';
import Header from '../components/layout/Header';
import { cn, formatCurrency } from '../lib/utils';

function InputField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-800 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function CreateRoom() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { latitude, longitude } = useGeolocation();

  const [form, setForm] = useState({
    title: '',
    restaurantName: '',
    restaurantUrl: '',
    maxMembers: '4',
    deliveryFee: '',
    minimumOrder: '',
    radiusKm: '1',
    deadline: '',
  });
  const [error, setError] = useState('');

  const { data: roomData, isLoading: isFetching } = useQuery({
    queryKey: ['room', id],
    queryFn: () => roomsApi.get(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (isEdit && roomData) {
      setForm({
        title: roomData.title,
        restaurantName: roomData.restaurantName,
        restaurantUrl: roomData.restaurantUrl || '',
        maxMembers: String(roomData.maxMembers),
        deliveryFee: String(roomData.deliveryFee),
        minimumOrder: String(roomData.minimumOrder),
        radiusKm: String(roomData.radiusKm),
        deadline: new Date(roomData.deadline).toISOString().slice(0, 16),
      });
    }
  }, [isEdit, roomData]);

  const mutation = useMutation({
    mutationFn: (data: CreateRoomPayload) => 
      isEdit ? roomsApi.update(id!, data) : roomsApi.create(data),
    onSuccess: (room) => navigate(`/rooms/${room.id}`, { replace: true }),
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        `방 ${isEdit ? '수정' : '생성'}에 실패했습니다.`;
      setError(msg);
    },
  });

  const getDefaultDeadline = () => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim()) return setError('방 제목을 입력해주세요.');
    if (!form.restaurantName.trim()) return setError('식당 이름을 입력해주세요.');
    if (!form.deliveryFee) return setError('배달비를 입력해주세요.');
    if (!form.minimumOrder) return setError('최소주문금액을 입력해주세요.');
    if (!form.deadline) return setError('마감 시간을 설정해주세요.');
    
    // 수정 시에는 기존 좌표를 유지하므로 위치 정보 체크를 건너뛸 수 있음
    if (!isEdit && (!latitude || !longitude)) return setError('위치 정보를 가져오는 중입니다. 잠시 후 다시 시도해주세요.');

    mutation.mutate({
      title: form.title.trim(),
      restaurantName: form.restaurantName.trim(),
      restaurantUrl: form.restaurantUrl.trim() || undefined,
      maxMembers: parseInt(form.maxMembers),
      deliveryFee: parseInt(form.deliveryFee),
      minimumOrder: parseInt(form.minimumOrder),
      radiusKm: parseFloat(form.radiusKm),
      latitude: latitude || (isEdit ? roomData?.latitude ?? 0 : 0),
      longitude: longitude || (isEdit ? roomData?.longitude ?? 0 : 0),
      deadline: new Date(form.deadline).toISOString(),
    });
  };

  const update = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const perPerson =
    form.deliveryFee && form.maxMembers
      ? Math.ceil(parseInt(form.deliveryFee) / parseInt(form.maxMembers))
      : 0;

  if (isEdit && (isFetching || !roomData)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="정보 불러오는 중..." showBack showHome />
        <div className="p-10 text-center text-gray-400">정보를 불러오는 중입니다...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <Header title={isEdit ? "방 정보 수정" : "방 만들기"} showBack showHome />

      <form onSubmit={handleSubmit} className="px-4 pt-4 space-y-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h2 className="font-bold text-gray-700 text-xs uppercase tracking-wide">식당 정보</h2>

          <InputField label="식당 이름">
            <input
              type="text"
              value={form.restaurantName}
              onChange={(e) => update('restaurantName', e.target.value)}
              placeholder="예: 홍콩반점"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </InputField>

          <InputField label="방 제목">
            <input
              type="text"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="예: 점심 같이 시켜요"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </InputField>

          <InputField label="주문 링크" hint="배달앱 메뉴 링크를 붙여넣으면 멤버들이 바로 볼 수 있어요">
            <input
              type="url"
              value={form.restaurantUrl}
              onChange={(e) => update('restaurantUrl', e.target.value)}
              placeholder="https://..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </InputField>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h2 className="font-bold text-gray-700 text-xs uppercase tracking-wide">주문 조건</h2>

          <div className="grid grid-cols-2 gap-3">
            <InputField label="배달비">
              <div className="relative">
                <input
                  type="number"
                  value={form.deliveryFee}
                  onChange={(e) => update('deliveryFee', e.target.value)}
                  placeholder="0"
                  min="0"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>
              </div>
            </InputField>

            <InputField label="최소주문금액">
              <div className="relative">
                <input
                  type="number"
                  value={form.minimumOrder}
                  onChange={(e) => update('minimumOrder', e.target.value)}
                  placeholder="0"
                  min="0"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>
              </div>
            </InputField>
          </div>

          {perPerson > 0 && (
            <div className="flex items-start gap-2 bg-primary-50 rounded-xl px-3 py-2.5 text-sm">
              <Info size={15} className="text-primary-500 mt-0.5 flex-shrink-0" />
              <span className="text-primary-700">
                최대 {form.maxMembers}명 기준 1인당 배달비 약{' '}
                <strong>{formatCurrency(perPerson)}</strong>
              </span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h2 className="font-bold text-gray-700 text-xs uppercase tracking-wide">모집 설정</h2>

          <InputField label="최대 인원">
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => update('maxMembers', String(n))}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors',
                    form.maxMembers === String(n)
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'border-gray-200 text-gray-600 hover:border-primary-300'
                  )}
                >
                  {n}명
                </button>
              ))}
            </div>
          </InputField>

          <InputField label="모집 반경">
            <div className="flex gap-2">
              {[0.5, 1, 2, 3].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => update('radiusKm', String(r))}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors',
                    parseFloat(form.radiusKm) === r
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'border-gray-200 text-gray-600 hover:border-primary-300'
                  )}
                >
                  {r}km
                </button>
              ))}
            </div>
          </InputField>

          <InputField label="마감 시간">
            <input
              type="datetime-local"
              value={form.deadline}
              onChange={(e) => update('deadline', e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              defaultValue={getDefaultDeadline()}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </InputField>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className={cn(
            'w-full bg-primary-500 text-white rounded-2xl py-4 font-bold text-base hover:bg-primary-600 transition-colors shadow-lg shadow-primary-200',
            mutation.isPending && 'opacity-60 cursor-not-allowed'
          )}
        >
          {mutation.isPending ? (isEdit ? '수정 중...' : '방 만드는 중...') : (isEdit ? '수정 완료' : '방 만들기')}
        </button>
      </form>
    </div>
  );
}
