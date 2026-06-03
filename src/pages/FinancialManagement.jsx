import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import PullToRefresh from '../components/PullToRefresh';
import { Wallet, LineChart, TrendingUp, ClipboardList, ArrowRight, Rocket } from 'lucide-react';
// Note: DebtManager and PensionManager removed from Reflection tab per product decision
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MonthlyPlanning from '../components/financial/MonthlyPlanning';
import FinancialReflection from '../components/financial/FinancialReflection';

import BeforeAfterComparison from '../components/financial/BeforeAfterComparison';
import ExpenseTracking from '../components/financial/ExpenseTracking';
import FinancialForecast from '../components/financial/FinancialForecast';


const SECTIONS = [
  {
    key: 'monthly',
    label: 'תכנון חודשי',
    icon: Wallet,
    description: 'תכנון תקציב חודשי ומעקב הוצאות',
    color: 'from-[#105330] to-[#1a7a4a]',
  },
  {
    key: 'reflection',
    label: 'שיקוף פיננסי',
    icon: LineChart,
    description: 'שיקוף ההתנהלות הכלכלית וניהול חובות',
    color: 'from-[#1a5c8a] to-[#2a7abf]',
  },
  {
    key: 'comparison',
    label: 'לפני / אחרי',
    icon: TrendingUp,
    description: 'השוואה בין מצב קודם למצב הנוכחי',
    color: 'from-[#7a4a10] to-[#b06a1a]',
  },
];

export default function FinancialManagement() {
  const [user, setUser] = useState(null);
  const [viewingClientId, setViewingClientId] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [activeTab, setActiveTab] = useState('planning');
  const queryClient = useQueryClient();

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

    } catch (e) {}
  };

  const effectiveUserId = viewingClientId || user?.id;

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);

  const handleSelectSection = (key) => {
    setActiveSection(key);
    if (key === 'monthly') setActiveTab('planning');
    if (key === 'reflection') setActiveTab('reflection');
  };

  const handleBack = () => {
    setActiveSection(null);
  };

  // Landing: section selection
  if (!activeSection) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
      <div className="max-w-6xl mx-auto" dir="rtl">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-[#105330] mb-2">התנהלות כלכלית</h1>
          <p className="text-[#105330]/70">בחר קטגוריה להתחלה</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.key}
                onClick={() => handleSelectSection(section.key)}
                className={`bg-gradient-to-br ${section.color} text-white rounded-2xl p-8 text-right shadow-xl hover:scale-105 transition-transform duration-200 flex flex-col gap-4`}
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
      </PullToRefresh>
    );
  }

  // Monthly section: 2 sub-tabs
  if (activeSection === 'monthly') {
    return (
      <div className="max-w-6xl mx-auto" dir="rtl">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={handleBack} className="text-[#105330]/60 hover:text-[#105330] flex items-center gap-1 text-sm font-medium">
            <ArrowRight className="w-4 h-4" />
            חזרה
          </button>
          <h1 className="text-2xl font-bold text-[#105330]">תכנון חודשי</h1>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 w-full max-w-sm bg-[#105330]/10 p-1.5 rounded-xl">
            <TabsTrigger
              value="planning"
              className="rounded-lg data-[state=active]:bg-[#105330] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-semibold text-sm"
            >
              <Wallet className="w-4 h-4 ml-2" />
              תכנון חודשי
            </TabsTrigger>
            <TabsTrigger
              value="tracking"
              className="rounded-lg data-[state=active]:bg-[#105330] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-semibold text-sm"
            >
              <ClipboardList className="w-4 h-4 ml-2" />
              מעקב חודשי
            </TabsTrigger>
          </TabsList>
          <TabsContent value="planning" className="mt-0">
            <MonthlyPlanning userId={effectiveUserId} />
          </TabsContent>
          <TabsContent value="tracking" className="mt-0">
            <ExpenseTracking userId={effectiveUserId} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Reflection section: tabs
  if (activeSection === 'reflection') {
    return (
      <div className="max-w-6xl mx-auto" dir="rtl">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={handleBack} className="text-[#105330]/60 hover:text-[#105330] flex items-center gap-1 text-sm font-medium">
            <ArrowRight className="w-4 h-4" />
            חזרה
          </button>
          <h1 className="text-2xl font-bold text-[#105330]">שיקוף פיננסי</h1>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex w-full overflow-x-auto bg-[#105330]/10 p-1.5 rounded-xl gap-1">
            <TabsTrigger value="reflection" className="rounded-lg data-[state=active]:bg-[#105330] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-semibold text-sm whitespace-nowrap">
              <LineChart className="w-4 h-4 ml-1 hidden sm:block" />תזרים
            </TabsTrigger>
            <TabsTrigger value="forecast" className="rounded-lg data-[state=active]:bg-[#c8a863] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-semibold text-sm whitespace-nowrap">
              <Rocket className="w-4 h-4 ml-1 hidden sm:block" />🚀 תחזית עתיד
            </TabsTrigger>
          </TabsList>
          <TabsContent value="reflection" className="mt-0">
            <FinancialReflection userId={effectiveUserId} />
          </TabsContent>
          <TabsContent value="forecast" className="mt-0">
            <ForecastWrapper userId={effectiveUserId} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Comparison section
  if (activeSection === 'comparison') {
    return (
      <div className="max-w-6xl mx-auto" dir="rtl">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={handleBack} className="text-[#105330]/60 hover:text-[#105330] flex items-center gap-1 text-sm font-medium">
            <ArrowRight className="w-4 h-4" />
            חזרה
          </button>
          <h1 className="text-2xl font-bold text-[#105330]">לפני / אחרי</h1>
        </div>
        <BeforeAfterComparison userId={effectiveUserId} />
      </div>
    );
  }

  return null;
}

// Wrapper that loads reflection data and passes calculated values to FinancialForecast
function ForecastWrapper({ userId }) {
  const { data: reflection } = useQuery({
    queryKey: ['financialReflection', userId],
    queryFn: async () => {
      const me = await base44.auth.me();
      const isAdvisorOrAdmin = me?.user_type === 'advisor' || me?.user_type === 'admin';
      const isViewingOther = !!me && me.id !== userId;
      if (isViewingOther && isAdvisorOrAdmin) {
        try {
          const clientData = sessionStorage.getItem('viewingClient');
          const clientEmail = clientData ? JSON.parse(clientData).email : null;
          const response = await base44.functions.invoke('getClientData', {
            clientUserId: userId,
            clientEmail,
            entityName: 'FinancialReflection'
          });
          return response.data.data[0] || null;
        } catch { return null; }
      }
      const results = await base44.entities.FinancialReflection.filter({ user_id: userId });
      return results[0] || null;
    },
    enabled: !!userId,
    staleTime: 30000,
  });

  // Calculate income from new income_rows format
  const incomeRows = reflection?.income_rows || [];
  const incomeAvg = Math.round(
    incomeRows
      .filter(r => r.id !== 'pension_male' && r.id !== 'pension_female')
      .reduce((s, r) => {
        return s + ['month1','month2','month3','month4','month5','month6'].reduce((a, m) => a + (r[m] || 0), 0) / 6;
      }, 0)
  ) || Math.round(
    // Fallback to legacy
    ['month1','month2','month3','month4','month5','month6'].reduce((s, m) => s + ((reflection?.incomes?.[m]) || 0), 0) / 6
  );

  // Calculate expenses from new structure
  const expensesObj = reflection?.expenses || {};
  const expenseAvg = Math.round(
    Object.values(expensesObj).reduce((s, catData) => {
      return s + Object.values(catData || {}).reduce((cs, itemData) => {
        return cs + ['month1','month2','month3'].reduce((a, m) => a + (itemData?.[m] || 0), 0) / 3;
      }, 0);
    }, 0)
  ) || Math.round(
    // Fallback to legacy
    (() => {
      const fe = reflection?.fixed_expenses || {};
      const ve = reflection?.variable_expenses || {};
      const fa = Object.values(fe).reduce((s, d) => s + ['month1','month2','month3'].reduce((a, m) => a + (d?.[m] || 0), 0) / 3, 0);
      const va = Object.values(ve).reduce((s, d) => s + ['month1','month2','month3'].reduce((a, m) => a + (d?.[m] || 0), 0) / 3, 0);
      return fa + va;
    })()
  );
  const cashFlowAvg = incomeAvg - expenseAvg;

  return (
    <FinancialForecast
      incomeAverage={incomeAvg}
      expenseAverage={expenseAvg}
      cashFlowAverage={cashFlowAvg}
      checkingBalance={reflection?.checking_account_balance || 0}
      maleAge={reflection?.male_age}
      femaleAge={reflection?.female_age}
    />
  );
}