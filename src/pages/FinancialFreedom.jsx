import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ClipboardList, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GoalSettingsPanel from '../components/freedom/GoalSettingsPanel';
import PlanningSection from '../components/freedom/PlanningSection';
import ResultsSection from '../components/freedom/ResultsSection';

export default function FinancialFreedom() {
  const [user, setUser] = useState(null);
  const [viewingClientId, setViewingClientId] = useState(null);
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
    } catch (e) {
      console.log('User not logged in');
    }
  };

  const effectiveUserId = viewingClientId || user?.id;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#105330] mb-2">תכנון חופש כלכלי</h1>
        <p className="text-[#105330]/70">תכנון ארוך טווח להשגת עצמאות כלכלית</p>
      </div>

      {/* Tab Buttons */}
      <div className="flex gap-2 mb-6 p-2 bg-[#105330]/10 rounded-2xl w-fit">
        <Button
          type="button"
          onClick={() => setActiveTab('planning')}
          className={`rounded-xl py-3 px-6 font-semibold transition-all duration-300 ${
            activeTab === 'planning' 
              ? 'bg-[#105330] text-white shadow-xl' 
              : 'bg-transparent text-[#105330] hover:bg-[#105330]/10'
          }`}
        >
          <ClipboardList className="w-4 h-4 ml-2" />
          תכנון
        </Button>
        <Button
          type="button"
          onClick={() => setActiveTab('results')}
          className={`rounded-xl py-3 px-6 font-semibold transition-all duration-300 ${
            activeTab === 'results' 
              ? 'bg-[#105330] text-white shadow-xl' 
              : 'bg-transparent text-[#105330] hover:bg-[#105330]/10'
          }`}
        >
          <BarChart3 className="w-4 h-4 ml-2" />
          תוצאות
        </Button>
      </div>

      {/* Content */}
      {activeTab === 'planning' && (
        <div className="space-y-6">
          <GoalSettingsPanel userId={effectiveUserId} />
          <PlanningSection userId={effectiveUserId} />
        </div>
      )}

      {activeTab === 'results' && (
        <ResultsSection userId={effectiveUserId} />
      )}
    </div>
  );
}