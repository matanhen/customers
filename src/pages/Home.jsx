import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, TrendingUp, TrendingDown, Wallet, Target, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AIChatAssistant from '../components/chat/AIChatAssistant';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#105330', '#1a7a4a', '#c8a863', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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
    } catch (e) {}
  };

  const effectiveUserId = viewingClientId || user?.id;

  const { data: monthlyPlans } = useQuery({
    queryKey: ['monthlyPlans', effectiveUserId],
    queryFn: () => base44.entities.MonthlyPlan.filter({ user_id: effectiveUserId }),
    enabled: !!effectiveUserId,
  });

  const { data: debts } = useQuery({
    queryKey: ['debts', effectiveUserId],
    queryFn: () => base44.entities.Debt.filter({ user_id: effectiveUserId }),
    enabled: !!effectiveUserId,
  });

  const { data: investments } = useQuery({
    queryKey: ['investments', effectiveUserId],
    queryFn: () => base44.entities.Investment.filter({ user_id: effectiveUserId }),
    enabled: !!effectiveUserId,
  });

  const { data: pensionData } = useQuery({
    queryKey: ['pensionData', effectiveUserId],
    queryFn: () => base44.entities.PensionData.filter({ user_id: effectiveUserId }),
    enabled: !!effectiveUserId,
  });

  const { data: reflectionPlan } = useQuery({
    queryKey: ['reflectionPlan', effectiveUserId],
    queryFn: () => base44.entities.FinancialPlan.filter({ user_id: effectiveUserId, plan_type: 'reflection_assets' }),
    enabled: !!effectiveUserId,
  });

  useEffect(() => {
    if (monthlyPlans && effectiveUserId && !viewingClientId) {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const hasCurrentMonth = monthlyPlans.some(p => p.month === currentMonth);
      if (!hasCurrentMonth) setShowAIChat(true);
    }
  }, [monthlyPlans, effectiveUserId, viewingClientId]);

  // Prepare income vs expenses chart data (last 6 months)
  const sortedPlans = (monthlyPlans || [])
    .filter(p => p.month)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6);

  const incomeVsExpensesData = sortedPlans.map(p => ({
    month: p.month?.slice(5) || '',
    הכנסות: p.expected_income || 0,
    הוצאות: (p.fixed_expenses || 0) + (p.variable_expenses || 0),
  }));

  // Latest plan for expense breakdown
  const latestPlan = sortedPlans[sortedPlans.length - 1];
  const expenseBreakdown = latestPlan ? [
    { name: 'הוצאות קבועות', value: latestPlan.fixed_expenses || 0 },
    { name: 'הוצאות משתנות', value: latestPlan.variable_expenses || 0 },
    { name: 'חיסכון', value: latestPlan.savings || 0 },
    { name: 'השקעות', value: latestPlan.investments_allocation || 0 },
    { name: 'חלומות', value: latestPlan.dreams_savings || 0 },
  ].filter(e => e.value > 0) : [];

  // Assets vs liabilities - from reflection plan
  const reflectionAssets = reflectionPlan?.[0]?.assets || {};
  const totalAssets = Object.values(reflectionAssets).reduce((sum, cat) => {
    return sum + Object.values(cat).reduce((s, item) => s + (item.value || 0), 0);
  }, 0);

  const totalDebts = (debts || []).reduce((sum, d) => sum + (d.remaining_amount || 0), 0);
  const netWorth = totalAssets - totalDebts;

  const hasData = sortedPlans.length > 0;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero */}
      <div className="relative mb-10 rounded-3xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#105330] via-[#0d4027] to-[#105330]" />
        <div className="absolute top-0 left-0 w-72 h-72 bg-[#c8a863]/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#c8a863]/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

        <div className="relative px-8 py-12 lg:py-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#c8a863]/20 backdrop-blur-sm rounded-full text-[#c8a863] text-sm font-medium mb-4 border border-[#c8a863]/30">
            <Sparkles className="w-4 h-4" />
            צעירים מתעשרים
          </div>

          <h1 className="text-4xl lg:text-5xl font-black text-white mb-3 leading-tight">
            שלום{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-lg text-white/80 max-w-xl mx-auto mb-6">
            מערכת פרימיום לניהול כסף של ה-1%
          </p>
          <button
            onClick={() => {
              const event = new CustomEvent('openFinancialAdvisor');
              window.dispatchEvent(event);
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#c8a863] hover:bg-[#d4b87a] text-[#105330] font-bold rounded-2xl shadow-lg transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <Sparkles className="w-5 h-5" />
            יועץ פיננסי AI
          </button>
        </div>
      </div>

      {/* System Button */}
      <div className="mb-8">
        <Link to="/Systems">
          <div className="relative rounded-3xl overflow-hidden cursor-pointer group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#c8a863] via-[#d4b87a] to-[#c8a863] group-hover:brightness-105 transition-all duration-300" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0icmdiYSgwLDAsMCwwLjA1KSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNnKSIvPjwvc3ZnPg==')] opacity-30" />
            <div className="relative px-8 py-7 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="text-5xl group-hover:scale-110 transition-transform duration-300">🚀</div>
                <div>
                  <p className="text-[#105330]/70 text-sm font-bold uppercase tracking-wider mb-1">המדריך המלא</p>
                  <h2 className="text-2xl lg:text-3xl font-black text-[#105330]">סיסטמים</h2>
                  <p className="text-[#105330]/70 text-sm mt-1">2 סיסטמים • כל הצעדים לחופש כלכלי</p>
                </div>
              </div>
              <div className="text-4xl text-[#105330]/40 group-hover:translate-x-1 transition-transform duration-300">←</div>
            </div>
          </div>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
              <div>
                <p className="text-xs text-gray-500">הכנסה חודשית</p>
                <p className="text-lg font-bold text-emerald-700">₪{(latestPlan?.expected_income || 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-white">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-100"><TrendingDown className="w-5 h-5 text-red-500" /></div>
              <div>
                <p className="text-xs text-gray-500">הוצאות חודשיות</p>
                <p className="text-lg font-bold text-red-600">₪{((latestPlan?.fixed_expenses || 0) + (latestPlan?.variable_expenses || 0)).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100"><Wallet className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-xs text-gray-500">סה"כ נכסים</p>
                <p className="text-lg font-bold text-blue-700">₪{totalAssets.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-0 shadow-lg bg-gradient-to-br ${netWorth >= 0 ? 'from-purple-50' : 'from-orange-50'} to-white`}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${netWorth >= 0 ? 'bg-purple-100' : 'bg-orange-100'}`}>
                <Target className={`w-5 h-5 ${netWorth >= 0 ? 'text-purple-600' : 'text-orange-500'}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">שווי נקי</p>
                <p className={`text-lg font-bold ${netWorth >= 0 ? 'text-purple-700' : 'text-orange-600'}`}>
                  ₪{netWorth.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!hasData ? (
        <Card className="border-0 shadow-lg text-center py-16">
          <CardContent>
            <Sparkles className="w-12 h-12 text-[#c8a863] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#105330] mb-2">ברוך הבא!</h3>
            <p className="text-gray-500 mb-6">התחל על ידי הזנת תכנון חודשי ראשון דרך "התנהלות כלכלית"</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Income vs Expenses Bar Chart */}
          <Card className="border-0 shadow-lg lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-[#105330] text-base font-bold">הכנסות לעומת הוצאות</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={incomeVsExpensesData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₪${(v/1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v) => `₪${v.toLocaleString()}`} />
                  <Bar dataKey="הכנסות" fill="#105330" radius={[4,4,0,0]} />
                  <Bar dataKey="הוצאות" fill="#ef4444" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Expense Breakdown Pie */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-[#105330] text-base font-bold">פילוח הוצאות</CardTitle>
            </CardHeader>
            <CardContent>
              {expenseBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={expenseBreakdown} cx="50%" cy="45%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                      {expenseBreakdown.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `₪${v.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-sm text-center py-8">אין נתוני הוצאות</p>
              )}
            </CardContent>
          </Card>

          {/* Assets vs Liabilities */}
          <Card className="border-0 shadow-lg lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-[#105330] text-base font-bold">נכסים לעומת התחייבויות</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-5 rounded-2xl bg-emerald-50">
                  <p className="text-xs text-gray-500 mb-1">סה"כ נכסים</p>
                  <p className="text-2xl font-black text-emerald-700">₪{totalAssets.toLocaleString()}</p>
                </div>
                <div className="text-center p-5 rounded-2xl bg-red-50">
                  <p className="text-xs text-gray-500 mb-1">סה"כ חובות</p>
                  <p className="text-2xl font-black text-red-600">₪{totalDebts.toLocaleString()}</p>
                </div>
                <div className={`text-center p-5 rounded-2xl ${netWorth >= 0 ? 'bg-purple-50' : 'bg-orange-50'} lg:col-span-2`}>
                  <p className="text-xs text-gray-500 mb-1">שווי נקי</p>
                  <p className={`text-2xl font-black ${netWorth >= 0 ? 'text-purple-700' : 'text-orange-600'}`}>
                    ₪{netWorth.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showAIChat && (
        <AIChatAssistant
          onClose={() => setShowAIChat(false)}
          userId={effectiveUserId}
        />
      )}
    </div>
  );
}