import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, PiggyBank, TrendingUp, Target, Scale } from 'lucide-react';
import { createPageUrl } from '../utils/index.ts';

const navItems = [
  { name: 'בית', page: 'Home', icon: Home },
  { name: 'התנהלות', page: 'FinancialManagement', icon: PiggyBank },
  { name: 'מאזן', page: 'Balance', icon: Scale },
  { name: 'השקעות', page: 'Investments', icon: TrendingUp },
  { name: 'תכנון', page: 'FinancialFreedom', icon: Target },
];

export default function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPage = location.pathname.replace('/', '');

  const handleTabClick = (e, item) => {
    const targetPath = createPageUrl(item.page);
    if (location.pathname === targetPath || currentPage === item.page) {
      e.preventDefault();
      navigate(targetPath, { replace: true });
    }
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#105330] border-t border-white/10 flex items-stretch pb-safe">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.page;
        return (
          <Link
            key={item.page}
            to={createPageUrl(item.page)}
            onClick={(e) => handleTabClick(e, item)}
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