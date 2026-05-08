import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, Calculator } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PortfolioManager from '../components/investments/PortfolioManager';
import CompoundInterestCalculator from '../components/investments/CompoundInterestCalculator';

export default function Investments() {
  const [user, setUser] = useState(null);
  const [viewingClientId, setViewingClientId] = useState(null);
  const [activeTab, setActiveTab] = useState('portfolio');
  // 'pension' tab removed - now lives under Financial Reflection > Assets

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
    <div className="max-w-6xl mx-auto" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#105330] mb-2">השקעות</h1>
        <p className="text-[#105330]/70">ניהול תיק השקעות ומחשבון ריבית דריבית</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 w-full max-w-sm bg-[#105330]/10 p-1.5 rounded-xl">
          <TabsTrigger 
            value="portfolio" 
            className="rounded-lg data-[state=active]:bg-[#105330] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-semibold"
          >
            <TrendingUp className="w-4 h-4 ml-2" />
            תיק השקעות
          </TabsTrigger>
          <TabsTrigger 
            value="compound"
            className="rounded-lg data-[state=active]:bg-[#105330] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-semibold"
          >
            <Calculator className="w-4 h-4 ml-2" />
            ריבית דריבית
          </TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio" className="mt-0">
          <PortfolioManager userId={effectiveUserId} />
        </TabsContent>

        <TabsContent value="compound" className="mt-0">
          <CompoundInterestCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
}