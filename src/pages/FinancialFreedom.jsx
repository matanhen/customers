import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowRight, TrendingUp, BarChart3 } from 'lucide-react';
import GoalSettingsPanel from '../components/freedom/GoalSettingsPanel';
import PlanningSection from '../components/freedom/PlanningSection';
import ResultsSection from '../components/freedom/ResultsSection';
import CapitalPlanning from '../components/freedom/CapitalPlanning';

const SECTIONS = [
  {
    key: 'cashflow',
    label: 'תכנון תזרימי',
    icon: BarChart3,
    description: 'תכנון ומעקב תזרים חודשי, יעדים וחופש כלכלי',
    color: 'from-[#105330] to-[#1a7a4a]',
  },
  {
    key: 'capital',
    label: 'תכנון הוני',
    icon: TrendingUp,
    description: 'השוואת תרחישי השקעה לאורך 30 שנה',
    color: 'from-[#1a5c8a] to-[#2a7abf]',
  },
];

export default function FinancialFreedom() {
  const [user, setUser] = useState(null);
  const [viewingClientId, setViewingClientId] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [cashflowTab, setCashflowTab] = useState('planning');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    try {
      const c = JSON.parse(sessionStorage.getItem('viewingClient') || '{}');
      if (c.id) setViewingClientId(c.id);
    } catch {}
  }, []);

  const effectiveUserId = viewingClientId || user?.id;

  if (!activeSection) {
    return (
      <div className="max-w-6xl mx-auto" dir="rtl">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-[#105330] mb-2">תכנון חופש כלכלי</h1>
          <p className="text-[#105330]/70">בחר קטגוריה להתחלה</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key)}
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

  const handleBack = () => setActiveSection(null);

  if (activeSection === 'cashflow') {
    return (
      <div className="max-w-6xl mx-auto" dir="rtl">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={handleBack} className="text-[#105330]/60 hover:text-[#105330] flex items-center gap-1 text-sm font-medium">
            <ArrowRight className="w-4 h-4" />חזרה
          </button>
          <h1 className="text-2xl font-bold text-[#105330]">תכנון תזרימי</h1>
        </div>
        <div className="flex gap-2 mb-6 p-2 bg-[#105330]/10 rounded-2xl w-fit">
          <button
            onClick={() => setCashflowTab('planning')}
            className={`rounded-xl py-3 px-6 font-semibold transition-all duration-300 flex items-center gap-2 ${
              cashflowTab === 'planning' ? 'bg-[#105330] text-white shadow-xl' : 'bg-transparent text-[#105330] hover:bg-[#105330]/10'
            }`}
          >
            <BarChart3 className="w-4 h-4" />תכנון
          </button>
          <button
            onClick={() => setCashflowTab('results')}
            className={`rounded-xl py-3 px-6 font-semibold transition-all duration-300 flex items-center gap-2 ${
              cashflowTab === 'results' ? 'bg-[#105330] text-white shadow-xl' : 'bg-transparent text-[#105330] hover:bg-[#105330]/10'
            }`}
          >
            <TrendingUp className="w-4 h-4" />תוצאות
          </button>
        </div>
        {cashflowTab === 'planning' && (
          <div className="space-y-6">
            <GoalSettingsPanel userId={effectiveUserId} />
            <PlanningSection userId={effectiveUserId} />
          </div>
        )}
        {cashflowTab === 'results' && <ResultsSection userId={effectiveUserId} />}
      </div>
    );
  }

  if (activeSection === 'capital') {
    return (
      <div className="max-w-6xl mx-auto" dir="rtl">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={handleBack} className="text-[#105330]/60 hover:text-[#105330] flex items-center gap-1 text-sm font-medium">
            <ArrowRight className="w-4 h-4" />חזרה
          </button>
        </div>
        <CapitalPlanning userId={effectiveUserId} />
      </div>
    );
  }

  return null;
}