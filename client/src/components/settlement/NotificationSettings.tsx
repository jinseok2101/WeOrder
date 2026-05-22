import { useState } from 'react';
import { Bell, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import { useMutation } from '@tanstack/react-query';
import { registerPushNotifications } from '../../lib/push';

export default function NotificationSettings() {
  const { user, setUser } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [settings, setSettings] = useState({
    notifyChat: user?.notifyChat ?? true,
    notifyRoomStatus: user?.notifyRoomStatus ?? true,
    notifySettlement: user?.notifySettlement ?? true,
  });

  const mutation = useMutation({
    mutationFn: authApi.updateNotifications,
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      setSuccessMsg('알림 설정이 변경되었습니다.');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
  });

  const [permission, setPermission] = useState(() => 
    'Notification' in window ? Notification.permission : 'denied'
  );

  const handleRequestDevicePermission = async () => {
    if ('Notification' in window) {
      await registerPushNotifications();
      setPermission(Notification.permission);
    }
  };

  const handleToggle = (key: keyof typeof settings) => {
    const nextValue = !settings[key];
    const updatedSettings = { ...settings, [key]: nextValue };
    setSettings(updatedSettings);
    mutation.mutate(updatedSettings);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-primary-500" />
          <span className="font-bold text-gray-700 text-sm">알림 수신 설정</span>
        </div>
        {isOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>

      {isOpen && (
        <div className="p-4 border-t border-gray-100 space-y-4">
          {permission !== 'granted' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-amber-800 block">기기 알림이 꺼져있습니다</span>
                <span className="text-xs text-amber-600">푸시 알림을 받으려면 기기 알림을 허용해주세요.</span>
              </div>
              <button
                type="button"
                onClick={handleRequestDevicePermission}
                className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ml-2"
              >
                권한 허용
              </button>
            </div>
          )}

          {/* 채팅 알림 */}
          <div className="flex items-center justify-between py-1">
            <div>
              <span className="text-sm font-bold text-gray-700 block">실시간 채팅 알림</span>
              <span className="text-xs text-gray-400">참여 중인 배달방의 대화 메시지를 받습니다.</span>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('notifyChat')}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 focus:outline-none ${
                settings.notifyChat ? 'bg-primary-500' : 'bg-gray-200'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                  settings.notifyChat ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 방 상태 변경 알림 */}
          <div className="flex items-center justify-between py-1 border-t border-gray-50 pt-3">
            <div>
              <span className="text-sm font-bold text-gray-700 block">배달방 상태 변경 알림</span>
              <span className="text-xs text-gray-400">배달 주문 시작, 메뉴 모집 마감 소식을 받습니다.</span>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('notifyRoomStatus')}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 focus:outline-none ${
                settings.notifyRoomStatus ? 'bg-primary-500' : 'bg-gray-200'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                  settings.notifyRoomStatus ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 정산 알림 */}
          <div className="flex items-center justify-between py-1 border-t border-gray-50 pt-3">
            <div>
              <span className="text-sm font-bold text-gray-700 block">정산 및 입금 확인 알림</span>
              <span className="text-xs text-gray-400">배달비 정산 요청과 내 입금 확인 통계를 실시간으로 수신합니다.</span>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('notifySettlement')}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 focus:outline-none ${
                settings.notifySettlement ? 'bg-primary-500' : 'bg-gray-200'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                  settings.notifySettlement ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 알림 메시지 */}
          {successMsg && (
            <div className="pt-2 flex items-center justify-end text-xs text-emerald-600 font-medium gap-1 animate-pulse">
              <CheckCircle2 size={14} />
              <span>{successMsg}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
