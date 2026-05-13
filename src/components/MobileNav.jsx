import { Link, useLocation } from 'react-router-dom';
import { Home, PiggyBank, TrendingUp, Target, Calendar } from 'lucide-react';
import { createPageUrl } from '../utils/index.ts';

const navItems = [
  { name: 'בית', page: 'Home', icon: Home },
  { name: 'כלכלה', page: 'FinancialManagement', icon: PiggyBank },
  { name: 'השקעות', page: 'Investments', icon: TrendingUp },
  { name: 'חופש', page: 'FinancialFreedom', icon: Target },
  { name: 'פגישות', page: 'Appointments', icon: Calendar },
];

export default function MobileNav() {
  const location = useLocation();
  const currentPage = location.pathname.replace('/', '');

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#105330] border-t border-white/10 flex items-stretch pb-safe">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.page;
        return (
          <Link
            key={item.page}
            to={createPageUrl(item.page)}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors touch-manipulation select-none min-h-[56px]
              ${isActive ? 'text-[#c8a863]' : 'text-white/60 active:text-white/90'}`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}