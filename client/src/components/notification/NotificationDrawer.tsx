import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, MessageSquare, CreditCard, BellRing, Trash2, CheckCheck } from 'lucide-react';
import { notificationsApi } from '../../api/notifications';
import { InAppNotification } from '../../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: InAppNotification[];
}

export default function NotificationDrawer({ isOpen, onClose, notifications }: NotificationDrawerProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const readMutation = useMutation({
    mutationFn: notificationsApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const readAllMutation = useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: notificationsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleNotificationClick = (n: InAppNotification) => {
    if (!n.isRead) {
      readMutation.mutate(n.id);
    }
    onClose();
    if (n.targetId) {
      let url = `/rooms/${n.targetId}`;
      if (n.type === 'CHAT') {
        url = `/rooms/${n.targetId}?tab=chat`;
      } else if (n.type === 'SETTLEMENT') {
        url = `/rooms/${n.targetId}?tab=settlement`;
      }
      navigate(url);
    }
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays === 1) return '어제';
    return `${diffDays}일 전`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop with fade-in and click-close */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/20 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* Slide-out Panel with glassmorphism */}
      <div className="relative w-full max-w-[380px] h-full bg-white/90 backdrop-blur-md border-l border-gray-100 shadow-2xl flex flex-col z-10 transition-transform duration-300">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellRing size={18} className="text-primary-500 animate-bounce" />
            <h2 className="font-bold text-gray-800 text-base">알림 보관함</h2>
          </div>
          <div className="flex items-center gap-2">
            {notifications.some((n) => !n.isRead) && (
              <button
                onClick={() => readAllMutation.mutate()}
                className="text-xs text-primary-600 font-bold flex items-center gap-0.5 hover:text-primary-700 transition-colors"
                title="모두 읽음"
              >
                <CheckCheck size={14} />
                모두 읽음
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Notification List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
          {notifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                <BellRing size={24} className="text-gray-300" />
              </div>
              <p className="text-sm font-bold text-gray-700">새로운 소식이 없어요</p>
              <p className="text-xs text-gray-400 mt-1 max-w-[200px] leading-relaxed">
                배달 도착 알림이나 이웃의 정산 요청이 이곳에 실시간 보관됩니다
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              const isUnread = !n.isRead;
              
              // Dynamic color/icon mapping based on notification type
              let Icon = BellRing;
              let iconBgColor = 'bg-primary-50';
              let iconColor = '#f97316';
              
              if (n.type === 'CHAT') {
                Icon = MessageSquare;
                iconBgColor = 'bg-amber-50';
                iconColor = '#d97706';
              } else if (n.type === 'SETTLEMENT') {
                Icon = CreditCard;
                iconBgColor = 'bg-emerald-50';
                iconColor = '#059669';
              }

              return (
                <div
                  key={n.id}
                  className={`group relative rounded-2xl p-4 border transition-all cursor-pointer flex gap-3 ${
                    isUnread
                      ? 'bg-amber-50/20 border-amber-100/50 hover:bg-amber-50/30'
                      : 'bg-white border-gray-100 hover:bg-gray-50'
                  }`}
                  onClick={() => handleNotificationClick(n)}
                >
                  {/* Category Circle Icon */}
                  <div className={`w-9 h-9 rounded-full ${iconBgColor} flex items-center justify-center shrink-0`}>
                    <Icon size={16} color={iconColor} />
                  </div>

                  {/* Body Text */}
                  <div className="flex-1 min-w-0 pr-4">
                    <p className={`text-xs text-gray-800 leading-relaxed ${isUnread ? 'font-bold' : 'font-medium'}`}>
                      {n.body}
                    </p>
                    <span className="text-[10px] text-gray-400 font-semibold mt-1.5 block">
                      {formatRelativeTime(n.createdAt)}
                    </span>
                  </div>

                  {/* Read status dot or hover delete action */}
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {isUnread && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 group-hover:scale-0 transition-transform" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(n.id);
                      }}
                      className="p-1 rounded-full bg-gray-100/80 hover:bg-red-50 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-200"
                      title="삭제"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
