import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Target } from 'lucide-react';
import PullToRefresh from '../components/PullToRefresh';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import AIChatAssistant from '../components/chat/AIChatAssistant';
import { EXPENSE_CATEGORIES } from '../components/financial/expenseCategories';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';

const DONUT_COLORS = [
  'hsl(168,55%,32%)',
  'hsl(42,80%,55%)',
  'hsl(210,60%,50%)',
  'hsl(340,65%,55%)',
  'hsl(280,55%,55%)',
  'hsl(120,40%,45%)',
  'hsl(30,70%,50%)',
  'hsl(190,60%,45%)',
  'hsl(0,60%,50%)',
  'hsl(60,70%,45%)',
];

const ASSET_COLORS = ['#105330', '#1a7a4a', '#c8a863', '#3b82f6', '#8b5cf6', '#14b8a6'];

function prevMonthKey() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-');
  const months = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  return `${months[parseInt(month) - 1]} ${year}`;
}

const ASSET_CATEGORY_LABELS = {
  cash: 'מזומנים',
  real_estate: 'נדל״ן',
  vehicles: 'רכבים',
  stocks: 'שוק ההון',
  alternative: 'השקעות אלטרנטיביות',
};

export default function Home() {
  const [user, setUser] = useState(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const [viewingClientId, setViewingClientId] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(prevMonthKey());
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

  const { data: monthlyPlans } = useQuery({
    queryKey: ['monthlyPlans', effectiveUserId],
    queryFn: () => base44.entities.MonthlyPlan.filter({ user_id: effectiveUserId }),
    enabled: !!effectiveUserId,
  });

  const { data: expenseTrackings } = useQuery({
    queryKey: ['expenseTrackings', effectiveUserId],
    queryFn: () => base44.entities.ExpenseTracking.filter({ user_id: effectiveUserId }),
    enabled: !!effectiveUserId,
  });

  const { data: debts } = useQuery({
    queryKey: ['debts', effectiveUserId],
    queryFn: () => base44.entities.Debt.filter({ user_id: effectiveUserId }),
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

  const { data: financialGoals } = useQuery({
    queryKey: ['financialGoals', effectiveUserId],
    queryFn: () => base44.entities.FinancialGoal.filter({ user_id: effectiveUserId }),
    enabled: !!effectiveUserId,
  });

  useEffect(() => {
    if (monthlyPlans && effectiveUserId && !viewingClientId) {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const hasCurrentMonth = monthlyPlans.some(p => p.month === currentMonth);
      if (!hasCurrentMonth) setShowAIChat(true);
    }
  }, [monthlyPlans, effectiveUserId, viewingClientId]);

  const sortedTrackings = (expenseTrackings || [])
    .filter(t => t.month)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6);

  const availableMonths = sortedTrackings.map(t => t.month);

  const effectiveSelectedMonth = availableMonths.includes(selectedMonth)
    ? selectedMonth
    : (availableMonths[availableMonths.length - 1] || selectedMonth);

  const incomeVsExpensesData = sortedTrackings.map(t => {
    const fixedTotal = Object.values(t.fixed_expenses || {}).reduce((s, v) => s + (v || 0), 0);
    const variableTotal = Object.values(t.variable_expenses || {}).reduce((s, v) => s + (v || 0), 0);
    const customTotal = (t.custom_expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
    return {
      month: formatMonthLabel(t.month).split(' ')[0] || '',
      fullMonth: t.month,
      הכנסות: t.actual_income || 0,
      הוצאות: fixedTotal + variableTotal + customTotal,
    };
  });

  // Expense breakdown by CATEGORY from actual tracking data
  const prevTracking = (expenseTrackings || []).find(t => t.month === effectiveSelectedMonth)
    || sortedTrackings[sortedTrackings.length - 1];

  const expenseBreakdown = (() => {
    if (!prevTracking) return [];
    const allExpenses = {
      ...prevTracking.fixed_expenses,
      ...prevTracking.variable_expenses,
    };
    // Group by EXPENSE_CATEGORIES
    const byCategory = {};
    EXPENSE_CATEGORIES.forEach(cat => { byCategory[cat.key] = 0; });

    Object.entries(allExpenses).forEach(([itemName, amount]) => {
      let catKey = 'misc';
      for (const cat of EXPENSE_CATEGORIES) {
        if (cat.items.includes(itemName)) { catKey = cat.key; break; }
      }
      byCategory[catKey] = (byCategory[catKey] || 0) + (amount || 0);
    });

    (prevTracking.custom_expenses || []).forEach(e => {
      byCategory['misc'] = (byCategory['misc'] || 0) + (e.amount || 0);
    });

    return EXPENSE_CATEGORIES
      .map(cat => ({ name: cat.label, value: byCategory[cat.key] || 0 }))
      .filter(e => e.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  })();

  // Assets
  const reflectionAssets = reflectionPlan?.[0]?.assets || {};
  const totalAssets = Object.values(reflectionAssets).reduce((sum, cat) => {
    return sum + Object.values(cat).reduce((s, item) => s + (item.value || 0), 0);
  }, 0);

  const totalPension = (pensionData || []).reduce((sum, p) => sum + (p.current_amount || 0), 0);
  const assetBreakdown = [
    ...Object.entries(reflectionAssets).map(([key, cat]) => ({
      name: ASSET_CATEGORY_LABELS[key] || key,
      value: Object.values(cat).reduce((s, item) => s + (item.value || 0), 0),
    })),
    ...(totalPension > 0 ? [{ name: 'פנסיוני', value: totalPension }] : []),
  ].filter(e => e.value > 0);

  const totalDebts = (debts || []).reduce((sum, d) => sum + (d.remaining_amount || 0), 0);
  const netWorth = totalAssets + totalPension - totalDebts;

  const hasData = incomeVsExpensesData.length > 0 || totalAssets > 0 || totalDebts > 0;

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['monthlyPlans', effectiveUserId] });
    await queryClient.invalidateQueries({ queryKey: ['expenseTrackings', effectiveUserId] });
    await queryClient.invalidateQueries({ queryKey: ['debts', effectiveUserId] });
    await queryClient.invalidateQueries({ queryKey: ['pensionData', effectiveUserId] });
    await queryClient.invalidateQueries({ queryKey: ['reflectionPlan', effectiveUserId] });
    await queryClient.invalidateQueries({ queryKey: ['financialGoals', effectiveUserId] });
  }, [queryClient, effectiveUserId]);

  const topGoals = (financialGoals || []).slice(0, 5);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="max-w-6xl mx-auto">
      {/* Compact Hero */}
      <div className="relative mb-6 rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#105330] via-[#0d4027] to-[#105330]" />
        <div className="relative px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#c8a863]/20 rounded-full text-[#c8a863] text-xs font-medium border border-[#c8a863]/30">
              <Sparkles className="w-3 h-3" />
              צעירים מתעשרים
            </div>
            <div>
              <h1 className="text-xl font-black text-white leading-tight">
                שלום{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''} 👋
              </h1>
              <p className="text-white/70 text-xs">מערכת פרימיום לניהול כסף של ה-1%</p>
            </div>
          </div>
          <button
            onClick={() => {
              const event = new CustomEvent('openFinancialAdvisor');
              window.dispatchEvent(event);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#c8a863] hover:bg-[#d4b87a] text-[#105330] font-bold rounded-xl shadow text-sm transition-all"
          >
            <Sparkles className="w-4 h-4" />
            יועץ AI
          </button>
        </div>
      </div>

      {/* System Button */}
      <div className="mb-6">
        <Link to="/Systems">
          <div className="relative rounded-2xl overflow-hidden cursor-pointer group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#c8a863] via-[#d4b87a] to-[#c8a863] group-hover:brightness-105 transition-all duration-300" />
            <div className="relative px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl group-hover:scale-110 transition-transform duration-300">🚀</div>
                <h2 className="text-base font-black text-[#105330]">תגלה מה הצעד הבא שלך</h2>
              </div>
              <div className="text-xl text-[#105330]/40 group-hover:translate-x-1 transition-transform duration-300">←</div>
            </div>
          </div>
        </Link>
      </div>

      {!hasData ? (
        <Card className="border-0 shadow-lg text-center py-16">
          <CardContent>
            <Sparkles className="w-12 h-12 text-[#c8a863] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#105330] mb-2">ברוך הבא!</h3>
            <p className="text-gray-500 mb-6">התחל על ידי הזנת נתונים דרך "התנהלות כלכלית"</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Income vs Expenses Bar Chart */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-[#105330] text-base font-bold">הכנסות לעומת הוצאות (בפועל)</CardTitle>
                {availableMonths.length > 0 && (
                  <Select value={effectiveSelectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-36 h-8 text-xs border-[#105330]/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMonths.map(m => (
                        <SelectItem key={m} value={m}>{formatMonthLabel(m)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {incomeVsExpensesData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={incomeVsExpensesData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₪${(v/1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v) => `₪${v.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="הכנסות" fill="#105330" radius={[4,4,0,0]} />
                    <Bar dataKey="הוצאות" fill="#ef4444" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-sm text-center py-8">אין נתוני מעקב חודשי</p>
              )}
            </CardContent>
          </Card>

          {/* Expense Breakdown Donut Chart by Category */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-[#105330] text-base font-bold">פילוח הוצאות לפי קטגוריה</CardTitle>
            </CardHeader>
            <CardContent>
              {expenseBreakdown.length > 0 ? (
                <div className="flex gap-4 items-center">
                  <div className="flex-shrink-0">
                    <PieChart width={150} height={150}>
                      <Pie
                        data={expenseBreakdown}
                        cx={70} cy={70}
                        innerRadius={40}
                        outerRadius={68}
                        dataKey="value"
                        strokeWidth={2}
                      >
                        {expenseBreakdown.map((_, i) => (
                          <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => `₪${v.toLocaleString()}`} />
                    </PieChart>
                  </div>
                  <div className="flex-1 space-y-1.5 min-w-0">
                    {expenseBreakdown.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                        />
                        <span className="text-slate-700 truncate flex-1">{item.name}</span>
                        <span className="font-semibold text-slate-600 flex-shrink-0">₪{item.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-8">אין נתוני הוצאות</p>
              )}
            </CardContent>
          </Card>

          {/* Financial Goals */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-[#105330] text-base font-bold">
                <Target className="w-4 h-4" />
                יעדים פיננסיים
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topGoals.length > 0 ? (
                <div className="space-y-4">
                  {topGoals.map((goal) => {
                    const pct = Math.min(100, Math.round(((goal.current_amount || 0) / (goal.target_amount || 1)) * 100));
                    return (
                      <div key={goal.id}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-semibold text-slate-800">{goal.name}</span>
                          <span className="text-slate-400 text-xs">₪{(goal.current_amount || 0).toLocaleString()} / ₪{(goal.target_amount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="h-2 flex-1" />
                          <span className="text-xs font-bold text-[#105330] w-8 text-left">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-6">אין יעדים עדיין</p>
              )}
            </CardContent>
          </Card>

          {/* Assets vs Liabilities */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-[#105330] text-base font-bold">נכסים לעומת התחייבויות</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
                <div className="text-center p-3 sm:p-4 rounded-2xl bg-emerald-50">
                  <p className="text-xs text-gray-500 mb-1">סה"כ נכסים</p>
                  <p className="text-sm sm:text-xl font-black text-emerald-700 break-all leading-tight">₪{(totalAssets + totalPension).toLocaleString()}</p>
                </div>
                <div className="text-center p-3 sm:p-4 rounded-2xl bg-red-50">
                  <p className="text-xs text-gray-500 mb-1">סה"כ חובות</p>
                  <p className="text-sm sm:text-xl font-black text-red-600 break-all leading-tight">₪{totalDebts.toLocaleString()}</p>
                </div>
                <div className={`text-center p-3 sm:p-4 rounded-2xl ${netWorth >= 0 ? 'bg-purple-50' : 'bg-orange-50'}`}>
                  <p className="text-xs text-gray-500 mb-1">שווי נקי</p>
                  <p className={`text-sm sm:text-xl font-black break-all leading-tight ${netWorth >= 0 ? 'text-purple-700' : 'text-orange-600'}`}>
                    ₪{netWorth.toLocaleString()}
                  </p>
                </div>
              </div>
              {assetBreakdown.length > 0 && (
                <div className="flex gap-4 items-center">
                  <div className="flex-shrink-0">
                    <PieChart width={110} height={110}>
                      <Pie data={assetBreakdown} cx={50} cy={50} innerRadius={28} outerRadius={50} dataKey="value" strokeWidth={2}>
                        {assetBreakdown.map((_, i) => (
                          <Cell key={i} fill={ASSET_COLORS[i % ASSET_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => `₪${v.toLocaleString()}`} />
                    </PieChart>
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    {assetBreakdown.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: ASSET_COLORS[i % ASSET_COLORS.length] }} />
                        <span className="text-slate-700 truncate flex-1">{item.name}</span>
                        <span className="font-semibold text-slate-600 flex-shrink-0">₪{item.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
    </PullToRefresh>
  );
}