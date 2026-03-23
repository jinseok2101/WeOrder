import { NavLink } from 'react-router-dom';
import { Home, ClipboardList, PlusCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 safe-pb">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-colors',
              isActive ? 'text-primary-600' : 'text-gray-400'
            )
          }
        >
          <Home size={22} />
          <span className="text-xs font-medium">홈</span>
        </NavLink>

        <NavLink
          to="/rooms/create"
          className="flex flex-col items-center gap-0.5 px-4 py-1"
        >
          <div className="w-12 h-12 -mt-5 bg-primary-500 rounded-full flex items-center justify-center shadow-lg shadow-primary-200">
            <PlusCircle size={26} className="text-white" />
          </div>
          <span className="text-xs font-medium text-gray-400 mt-0.5">방 만들기</span>
        </NavLink>

        <NavLink
          to="/my-orders"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-colors',
              isActive ? 'text-primary-600' : 'text-gray-400'
            )
          }
        >
          <ClipboardList size={22} />
          <span className="text-xs font-medium">내 주문</span>
        </NavLink>
      </div>
    </nav>
  );
}
