import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, Home as HomeIcon } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  showHome?: boolean; // 홈 버튼 추가
  showLogout?: boolean;
  right?: React.ReactNode;
}

export default function Header({ title, showBack = false, showHome = false, showLogout = false, right }: HeaderProps) {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
        )}
        {showHome && (
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <HomeIcon size={20} className="text-gray-700" />
          </button>
        )}
        <h1 className="font-bold text-gray-900 text-lg truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-1">
        {right}
        {showLogout && (
          <button
            onClick={() => {
              logout();
              navigate('/auth');
            }}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <LogOut size={18} className="text-gray-500" />
          </button>
        )}
      </div>
    </header>
  );
}
