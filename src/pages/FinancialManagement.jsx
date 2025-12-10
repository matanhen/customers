import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Wallet, LineChart, TrendingUp, ClipboardList, CreditCard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MonthlyPlanning from '../components/financial/MonthlyPlanning';
import FinancialReflection from '../components/financial/FinancialReflection';
import BeforeAfterComparison from '../components/financial/BeforeAfterComparison';
import ExpenseTracking from '../components/financial/ExpenseTracking';
import DebtManager from '../components/financial/DebtManager';

export default function FinancialManagement() {
  const [user, setUser] = useState(null);
  const [viewingClientId, setViewingClientId] = useState(null);
  const [activeTab, setActiveTab] = useState('monthly');

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
        <h1 className="text-3xl font-bold text-[#105330] mb-2">התנהלות כלכלית</h1>
        <p className="text-[#105330]/70">ניהול תקציב חודשי, מעקב הוצאות והשוואות</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full bg-[#105330]/10 p-1.5 rounded-xl">
          <TabsTrigger 
            value="monthly" 
            className="rounded-lg data-[state=active]:bg-[#105330] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-semibold text-xs lg:text-sm"
          >
            <Wallet className="w-4 h-4 ml-1 lg:ml-2" />
            תכנון חודשי
          </TabsTrigger>
          <TabsTrigger 
            value="tracking"
            className="rounded-lg data-[state=active]:bg-[#105330] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-semibold text-xs lg:text-sm"
          >
            <ClipboardList className="w-4 h-4 ml-1 lg:ml-2" />
            מעקב חודשי
          </TabsTrigger>
          <TabsTrigger 
            value="debts"
            className="rounded-lg data-[state=active]:bg-[#105330] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-semibold text-xs lg:text-sm"
          >
            <CreditCard className="w-4 h-4 ml-1 lg:ml-2" />
            חובות
          </TabsTrigger>
          <TabsTrigger 
            value="reflection"
            className="rounded-lg data-[state=active]:bg-[#105330] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-semibold text-xs lg:text-sm"
          >
            <LineChart className="w-4 h-4 ml-1 lg:ml-2" />
            שיקוף
          </TabsTrigger>
          <TabsTrigger 
            value="comparison"
            className="rounded-lg data-[state=active]:bg-[#105330] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-semibold text-xs lg:text-sm"
          >
            <TrendingUp className="w-4 h-4 ml-1 lg:ml-2" />
            לפני/אחרי
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="mt-0">
          <MonthlyPlanning userId={effectiveUserId} />
        </TabsContent>

        <TabsContent value="tracking" className="mt-0">
          <ExpenseTracking userId={effectiveUserId} />
        </TabsContent>

        <TabsContent value="debts" className="mt-0">
          <DebtManager userId={effectiveUserId} />
        </TabsContent>

        <TabsContent value="reflection" className="mt-0">
          <FinancialReflection userId={effectiveUserId} />
        </TabsContent>

        <TabsContent value="comparison" className="mt-0">
          <BeforeAfterComparison userId={effectiveUserId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}