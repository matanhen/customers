import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  PiggyBank, TrendingUp, Target, ChevronLeft, Sparkles
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import AIChatAssistant from '../components/chat/AIChatAssistant';

export default function Home() {
  const [user, setUser] = useState(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const [viewingClientId, setViewingClientId] = useState(null);

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

  const { data: monthlyPlans } = useQuery({
    queryKey: ['monthlyPlans', effectiveUserId],
    queryFn: () => base44.entities.MonthlyPlan.filter({ user_id: effectiveUserId }),
    enabled: !!effectiveUserId,
  });

  useEffect(() => {
    if (monthlyPlans && effectiveUserId && !viewingClientId) {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const hasCurrentMonth = monthlyPlans.some(p => p.month === currentMonth);
      if (!hasCurrentMonth) {
        setShowAIChat(true);
      }
    }
  }, [monthlyPlans, effectiveUserId, viewingClientId]);

  const categories = [
    {
      title: 'התנהלות כלכלית',
      icon: PiggyBank,
      page: 'FinancialManagement',
      gradient: 'from-emerald-500 via-emerald-600 to-teal-600',
      bgGradient: 'from-emerald-50 via-teal-50 to-cyan-50',
      shadowColor: 'shadow-emerald-500/25',
      iconBg: 'from-emerald-400 to-teal-500',
    },
    {
      title: 'השקעות',
      icon: TrendingUp,
      page: 'Investments',
      gradient: 'from-blue-500 via-blue-600 to-indigo-600',
      bgGradient: 'from-blue-50 via-indigo-50 to-violet-50',
      shadowColor: 'shadow-blue-500/25',
      iconBg: 'from-blue-400 to-indigo-500',
    },
    {
      title: 'תכנון חופש כלכלי',
      icon: Target,
      page: 'FinancialFreedom',
      gradient: 'from-purple-500 via-purple-600 to-pink-600',
      bgGradient: 'from-purple-50 via-pink-50 to-rose-50',
      shadowColor: 'shadow-purple-500/25',
      iconBg: 'from-purple-400 to-pink-500',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Premium Hero Section */}
      <div className="relative mb-12 rounded-3xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#105330] via-[#0d4027] to-[#105330]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMyIvPjwvZz48L2c+PC9zdmc+')] opacity-100" />
        <div className="absolute top-0 left-0 w-72 h-72 bg-[#c8a863]/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#c8a863]/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

        <div className="relative px-8 py-16 lg:py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#c8a863]/20 backdrop-blur-sm rounded-full text-[#c8a863] text-sm font-medium mb-6 border border-[#c8a863]/30">
            <Sparkles className="w-4 h-4" />
            צעירים מתעשרים
          </div>

          <h1 className="text-4xl lg:text-6xl font-black text-white mb-4 leading-tight">
            נהל את הכסף שלך
            <br />
            <span className="text-[#c8a863]">
              בחכמה
            </span>
          </h1>

          <p className="text-lg lg:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
            כלי פרימיום לניהול פיננסי אישי, תכנון השקעות והשגת חופש כלכלי
          </p>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid md:grid-cols-3 gap-8">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Link key={category.page} to={createPageUrl(category.page)}>
              <Card className="group cursor-pointer h-full overflow-hidden border-0 shadow-2xl shadow-[#105330]/20 hover:shadow-3xl hover:shadow-[#105330]/30 transition-all duration-500 hover:-translate-y-3 hover:scale-[1.02] bg-gradient-to-br from-white via-[#f8f9f7] to-[#105330]/5">
                <div className="h-1.5 bg-gradient-to-r from-[#105330] via-[#1a7a4a] to-[#c8a863]" />
                <CardContent className="p-10 flex flex-col items-center text-center">
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-[#105330] to-[#1a7a4a] shadow-2xl shadow-[#105330]/40 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 mb-6">
                    <Icon className="w-12 h-12 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-[#105330] group-hover:text-[#c8a863] transition-colors">
                    {category.title}
                  </h2>
                  <ChevronLeft className="w-6 h-6 text-[#105330]/30 group-hover:text-[#c8a863] group-hover:-translate-x-2 transition-all mt-4" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {showAIChat && (
        <AIChatAssistant 
          onClose={() => setShowAIChat(false)} 
          userId={effectiveUserId}
        />
      )}
    </div>
  );
}