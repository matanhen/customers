import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ClientAppointments from '../components/appointments/ClientAppointments';
import AdvisorAvailability from '../components/appointments/AdvisorAvailability';

export default function Appointments() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (e) {
      console.log('User not logged in');
    }
  };

  const isClient = user?.user_type === 'client';
  const isAdvisorOrAdmin = user?.user_type === 'advisor' || user?.user_type === 'admin';

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#105330] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#105330] font-semibold">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 via-purple-700 to-indigo-700 bg-clip-text text-transparent">
          קביעת פגישות
        </h1>
        <p className="text-slate-500 mt-2 text-lg">
          {isClient ? 'קבע פגישה עם היועץ שלך' : 'נהל את הזמינות שלך ופגישות הלקוחות'}
        </p>
      </div>

      {isClient ? (
        <ClientAppointments user={user} />
      ) : isAdvisorOrAdmin ? (
        <Tabs defaultValue="availability" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="availability">ניהול זמינות</TabsTrigger>
            <TabsTrigger value="appointments">הפגישות שלי</TabsTrigger>
          </TabsList>
          <TabsContent value="availability">
            <AdvisorAvailability user={user} />
          </TabsContent>
          <TabsContent value="appointments">
            <ClientAppointments user={user} isAdvisor={true} />
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}