import { NavLink } from 'react-router-dom';
import { Home, ClipboardList, PlusCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 safe-pb">
      <div className="grid grid-cols-3 items-center h-16 max-w-lg mx-auto">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center h-full w-full transition-colors',
              isActive ? 'text-primary-600' : 'text-gray-400'
            )
          }
        >
          <Home size={22} />
          <span className="text-[11px] font-medium mt-0.5">홈</span>
        </NavLink>

        <NavLink
          to="/rooms/create"
          className="flex flex-col items-center justify-center h-full w-full"
        >
          <div className="w-12 h-12 -mt-5 bg-primary-500 rounded-full flex items-center justify-center shadow-lg shadow-primary-200">
            <PlusCircle size={26} className="text-white" />
          </div>
          <span className="text-[11px] font-medium text-gray-400 mt-1">방 만들기</span>
        </NavLink>

        <NavLink
          to="/my-orders"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center h-full w-full transition-colors',
              isActive ? 'text-primary-600' : 'text-gray-400'
            )
          }
        >
          <ClipboardList size={22} />
          <span className="text-[11px] font-medium mt-0.5">마이페이지</span>
        </NavLink>
      </div>
    </nav>
  );
}
