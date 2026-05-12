import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Wallet, LineChart, TrendingUp, ClipboardList, CreditCard, ArrowRight, Building2, Landmark } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MonthlyPlanning from '../components/financial/MonthlyPlanning';
import FinancialReflection from '../components/financial/FinancialReflection';
import BeforeAfterComparison from '../components/financial/BeforeAfterComparison';
import ExpenseTracking from '../components/financial/ExpenseTracking';
import DebtManager from '../components/financial/DebtManager';
import AssetsManager from '../components/financial/AssetsManager';
import PensionManager from '../components/investments/PensionManager';


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
          <TabsContent value="planning" className="mt-0" forceMount hidden={activeTab !== 'planning'}>
            <MonthlyPlanning userId={effectiveUserId} />
          </TabsContent>
          <TabsContent value="tracking" className="mt-0" forceMount hidden={activeTab !== 'tracking'}>
            <ExpenseTracking userId={effectiveUserId} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Reflection section: 3 sub-tabs
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
          <TabsList className="grid grid-cols-4 w-full max-w-2xl bg-[#105330]/10 p-1.5 rounded-xl">
            <TabsTrigger
              value="reflection"
              className="rounded-lg data-[state=active]:bg-[#105330] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-semibold text-sm"
            >
              <LineChart className="w-4 h-4 ml-2" />
              תזרים
            </TabsTrigger>
            <TabsTrigger
              value="debts"
              className="rounded-lg data-[state=active]:bg-[#105330] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-semibold text-sm"
            >
              <CreditCard className="w-4 h-4 ml-2" />
              התחייבויות
            </TabsTrigger>
            <TabsTrigger
              value="assets"
              className="rounded-lg data-[state=active]:bg-[#105330] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-semibold text-sm"
            >
              <Building2 className="w-4 h-4 ml-2" />
              נכסים
            </TabsTrigger>
            <TabsTrigger
              value="pension"
              className="rounded-lg data-[state=active]:bg-[#105330] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-semibold text-sm"
            >
              <Landmark className="w-4 h-4 ml-2" />
              פנסיוני
            </TabsTrigger>
          </TabsList>
          <TabsContent value="reflection" className="mt-0" forceMount hidden={activeTab !== 'reflection'}>
            <FinancialReflection userId={effectiveUserId} />
          </TabsContent>
          <TabsContent value="debts" className="mt-0" forceMount hidden={activeTab !== 'debts'}>
            <DebtManager userId={effectiveUserId} />
          </TabsContent>
          <TabsContent value="assets" className="mt-0" forceMount hidden={activeTab !== 'assets'}>
            <AssetsManager userId={effectiveUserId} />
          </TabsContent>
          <TabsContent value="pension" className="mt-0" forceMount hidden={activeTab !== 'pension'}>
            <PensionManager userId={effectiveUserId} />
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