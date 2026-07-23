import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, Calculator, ReceiptText, Coins, ArrowRight, BarChart3, PieChart } from 'lucide-react';
import PortfolioManager from '../components/investments/PortfolioManager';
import CompoundInterestCalculator from '../components/investments/CompoundInterestCalculator';
import TaxSimulator from '../components/investments/TaxSimulator';
import MonetaryFunds from '../components/investments/MonetaryFunds';
import IndicesAndETFs from '../components/investments/IndicesAndETFs';
import ManagedFundsYields from '../components/investments/ManagedFundsYields';

const SECTIONS = [
  {
    key: 'portfolio',
    label: 'תיק השקעות',
    icon: TrendingUp,
    description: 'ניהול תיק ניירות ערך ומעקב תשואות',
    color: 'from-[#105330] to-[#1a7a4a]',
  },
  {
    key: 'tax',
    label: 'סימולטור מס',
    icon: ReceiptText,
    description: 'חיסכון במס באמצעות מימוש הפסדים',
    color: 'from-[#a16207] to-[#854d0e]',
  },
  {
    key: 'funds',
    label: 'קרנות כספיות',
    icon: Coins,
    description: 'רשימת קרנות כספיות ומחשבון מיסוי',
    color: 'from-[#7a4a10] to-[#b06a1a]',
  },
  {
    key: 'indices_etf',
    label: 'מדדים וקרנות סל',
    icon: BarChart3,
    description: 'טבלת מדדים פיננסיים וקרנות סל',
    color: 'from-[#0066a0] to-[#00b4ff]',
  },
  {
    key: 'managed_funds',
    label: 'תשואות קופות מנוהלות',
    icon: PieChart,
    description: 'השוואת מסלולים בקופות גמל, קרנות השתלמות ופנסיה',
    color: 'from-[#f97316] to-[#ea580c]',
  },
  {
    key: 'compound',
    label: 'ריבית דריבית',
    icon: Calculator,
    description: 'סימולציית צמיחת הון לאורך זמן',
    color: 'from-[#5b2a83] to-[#9a4fd4]',
  },
];

export default function Investments() {
  const [user, setUser] = useState(null);
  const [viewingClientId, setViewingClientId] = useState(null);
  const [activeSection, setActiveSection] = useState(null);

  useEffect(() => {
    loadUser();
    const clientData = sessionStorage.getItem('viewingClient');
    if (clientData) {
      const client = JSON.parse(clientData);
      setViewingClientId(client.id);
    }
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (e) {
      console.log('User not logged in');
    }
  };

  const effectiveUserId = viewingClientId || user?.id;

  const handleBack = () => setActiveSection(null);

  const renderSection = () => {
    switch (activeSection) {
      case 'portfolio':
        return <PortfolioManager userId={effectiveUserId} />;
      case 'tax':
        return <TaxSimulator />;
      case 'funds':
        return <MonetaryFunds />;
      case 'indices_etf':
        return <IndicesAndETFs />;
      case 'managed_funds':
        return <ManagedFundsYields />;
      case 'compound':
        return <CompoundInterestCalculator />;
      default:
        return null;
    }
  };

  // Landing: section cards selection
  if (!activeSection) {
    return (
      <div className="max-w-6xl mx-auto" dir="rtl">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-[#105330] mb-2">השקעות</h1>
          <p className="text-[#105330]/70">בחר קטגוריה להתחלה</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key)}
                className={`bg-gradient-to-br ${section.color} text-white rounded-2xl p-8 text-right shadow-xl hover:scale-105 transition-transform duration-200 flex flex-col gap-4 min-h-[160px]`}
              >
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Icon className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-1">{section.label}</h2>
                  <p className="text-white/75 text-sm">{section.description}</p>
                </div>
                <div className="flex items-center gap-1 text-white/80 text-sm mt-auto">
                  <span>כניסה</span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Selected section
  const currentSection = SECTIONS.find((s) => s.key === activeSection);
  return (
    <div className="max-w-6xl mx-auto" dir="rtl">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={handleBack}
          className="text-[#105330]/60 hover:text-[#105330] flex items-center gap-1 text-sm font-medium"
        >
          <ArrowRight className="w-4 h-4" />
          חזרה
        </button>
        <h1 className="text-2xl font-bold text-[#105330]">{currentSection?.label}</h1>
      </div>
      {renderSection()}
    </div>
  );
}