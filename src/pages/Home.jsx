import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AIChatAssistant from '../components/chat/AIChatAssistant';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';

const EXPENSE_COLORS = ['#ef4444', '#f97316'];
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

  useEffect(() => {
    if (monthlyPlans && effectiveUserId && !viewingClientId) {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const hasCurrentMonth = monthlyPlans.some(p => p.month === currentMonth);
      if (!hasCurrentMonth) setShowAIChat(true);
    }
  }, [monthlyPlans, effectiveUserId, viewingClientId]);

  // Bar chart: income vs expenses from ExpenseTracking (actual), last 6 months sorted
  const sortedTrackings = (expenseTrackings || [])
    .filter(t => t.month)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6);

  const availableMonths = sortedTrackings.map(t => t.month);

  // Default to prevMonth if exists in data, else last available
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

  // Expense breakdown: from selected month
  const prevTracking = (expenseTrackings || []).find(t => t.month === effectiveSelectedMonth)
    || sortedTrackings[sortedTrackings.length - 1];

  const expenseBreakdown = (() => {
    if (!prevTracking) return [];
    const fixedTotal = Object.values(prevTracking.fixed_expenses || {}).reduce((s, v) => s + (v || 0), 0);
    const variableTotal = Object.values(prevTracking.variable_expenses || {}).reduce((s, v) => s + (v || 0), 0);
    const customFixed = (prevTracking.custom_expenses || []).filter(e => e.type === 'fixed').reduce((s, e) => s + (e.amount || 0), 0);
    const customVariable = (prevTracking.custom_expenses || []).filter(e => e.type === 'variable').reduce((s, e) => s + (e.amount || 0), 0);
    return [
      { name: 'הוצאות קבועות', value: fixedTotal + customFixed },
      { name: 'הוצאות משתנות', value: variableTotal + customVariable },
    ].filter(e => e.value > 0);
  })();

  // Assets from reflection plan
  const reflectionAssets = reflectionPlan?.[0]?.assets || {};
  const totalAssets = Object.values(reflectionAssets).reduce((sum, cat) => {
    return sum + Object.values(cat).reduce((s, item) => s + (item.value || 0), 0);
  }, 0);

  // Asset breakdown by category (reflection + pension)
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
            <div className="relative px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-3xl group-hover:scale-110 transition-transform duration-300">🚀</div>
                <h2 className="text-lg font-black text-[#105330]">תגלה מה הצעד הבא שלך</h2>
              </div>
              <div className="text-2xl text-[#105330]/40 group-hover:translate-x-1 transition-transform duration-300">←</div>
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
                <ResponsiveContainer width="100%" height={240}>
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

          {/* Expense Breakdown Pie */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-[#105330] text-base font-bold">פילוח הוצאות</CardTitle>
            </CardHeader>
            <CardContent>
              {expenseBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={expenseBreakdown} cx="50%" cy="45%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                      {expenseBreakdown.map((_, i) => (
                        <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />
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
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-[#105330] text-base font-bold">נכסים לעומת התחייבויות</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
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
            </CardContent>
          </Card>

          {/* Asset Breakdown Pie */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-[#105330] text-base font-bold">פילוח נכסים</CardTitle>
            </CardHeader>
            <CardContent>
              {assetBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={assetBreakdown} cx="50%" cy="45%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                      {assetBreakdown.map((_, i) => (
                        <Cell key={i} fill={ASSET_COLORS[i % ASSET_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `₪${v.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-sm text-center py-8">אין נתוני נכסים</p>
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
  );
}