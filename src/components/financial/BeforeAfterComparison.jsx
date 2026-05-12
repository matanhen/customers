import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, subMonths } from 'date-fns';
import { he } from 'date-fns/locale';
import { 
  TrendingUp, TrendingDown, BarChart3, 
  ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Cell } from 'recharts';

export default function BeforeAfterComparison({ userId }) {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, [userId]);

  const isAdvisorOrAdmin = currentUser?.user_type === 'advisor' || currentUser?.user_type === 'admin';
  const isViewingOther = !!currentUser && currentUser.id !== userId;

  const viewingClientEmail = (() => {
    try { return JSON.parse(sessionStorage.getItem('viewingClient') || '{}').email || null; } catch { return null; }
  })();

  const { data: monthlyPlans = [] } = useQuery({
    queryKey: ['monthlyPlans', userId, currentUser?.id],
    queryFn: async () => {
      if (isViewingOther && isAdvisorOrAdmin) {
        const response = await base44.functions.invoke('getClientData', { clientUserId: userId, clientEmail: viewingClientEmail, entityName: 'MonthlyPlan' });
        return response.data.data;
      }
      return base44.entities.MonthlyPlan.filter({ user_id: userId });
    },
    enabled: !!userId && !!currentUser,
  });

  const { data: reflection } = useQuery({
    queryKey: ['financialReflection', userId, currentUser?.id],
    queryFn: async () => {
      if (isViewingOther && isAdvisorOrAdmin) {
        const response = await base44.functions.invoke('getClientData', { clientUserId: userId, clientEmail: viewingClientEmail, entityName: 'FinancialReflection' });
        return response.data.data[0];
      }
      const results = await base44.entities.FinancialReflection.filter({ user_id: userId });
      return results[0];
    },
    enabled: !!userId && !!currentUser,
  });

  const selectedPlan = monthlyPlans.find(p => p.month === selectedMonth);

  const calculateReflectionAverage = () => {
    if (!reflection) return { income: 0, fixedExpenses: 0, variableExpenses: 0 };

    const incomes = reflection.incomes || {};
    const incomeSum = ['month1','month2','month3','month4','month5','month6'].reduce((s, m) => s + (incomes[m] || 0), 0);
    const incomeAvg = Math.round(incomeSum / 6);

    let fixedTotal = 0;
    let variableTotal = 0;

    if (reflection.fixed_expenses) {
      Object.values(reflection.fixed_expenses).forEach(category => {
        const sum = ['month1','month2','month3'].reduce((s, m) => s + (category?.[m] || 0), 0);
        fixedTotal += sum / 3;
      });
    }

    if (reflection.variable_expenses) {
      Object.values(reflection.variable_expenses).forEach(category => {
        const sum = ['month1','month2','month3'].reduce((s, m) => s + (category?.[m] || 0), 0);
        variableTotal += sum / 3;
      });
    }

    return {
      income: incomeAvg,
      fixedExpenses: Math.round(fixedTotal),
      variableExpenses: Math.round(variableTotal),
    };
  };

  const reflectionData = calculateReflectionAverage();
  const reflectionTotalExpenses = reflectionData.fixedExpenses + reflectionData.variableExpenses;
  const reflectionCashFlow = reflectionData.income - reflectionTotalExpenses;

  const planIncome = selectedPlan?.expected_income || 0;
  const planFixedExpenses = selectedPlan?.fixed_expenses || 0;
  const planVariableExpenses = selectedPlan?.variable_expenses || 0;
  const planTotalExpenses = planFixedExpenses + planVariableExpenses;
  const planSavings = selectedPlan?.savings || 0;
  const planCashFlow = planIncome - planTotalExpenses - planSavings;

  const incomeDiff = planIncome - reflectionData.income;
  const expensesDiff = planTotalExpenses - reflectionTotalExpenses;
  const cashFlowDiff = (planIncome - planTotalExpenses) - reflectionCashFlow;
  const monthlyDiff = cashFlowDiff;
  const yearlyDiff = monthlyDiff * 12;
  const fiveYearDiff = monthlyDiff * 60;

  const chartData = [
    {
      name: 'הכנסות',
      'שיקוף פיננסי': reflectionData.income,
      'תכנון חודשי': planIncome,
    },
    {
      name: 'הוצאות',
      'שיקוף פיננסי': reflectionTotalExpenses,
      'תכנון חודשי': planTotalExpenses,
    },
    {
      name: 'תזרים',
      'שיקוף פיננסי': reflectionCashFlow,
      'תכנון חודשי': planIncome - planTotalExpenses,
    },
  ];

  const getMonthOptions = () => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);
      months.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy', { locale: he }),
      });
    }
    return months;
  };

  const DifferenceIndicator = ({ value, reverse = false }) => {
    const isPositive = reverse ? value < 0 : value > 0;
    const isNegative = reverse ? value > 0 : value < 0;
    
    return (
      <div className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-500'}`}>
        {isPositive && <ArrowUp className="w-4 h-4" />}
        {isNegative && <ArrowDown className="w-4 h-4" />}
        {value === 0 && <Minus className="w-4 h-4" />}
        <span className="font-medium">₪{Math.abs(value).toLocaleString()}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-700">בחר חודש לתכנון:</h3>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getMonthOptions().map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-red-700">לפני - שיקוף פיננסי (ממוצע)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">הכנסות:</span>
              <span className="font-medium">₪{reflectionData.income.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">הוצאות קבועות:</span>
              <span className="font-medium">₪{reflectionData.fixedExpenses.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">הוצאות משתנות:</span>
              <span className="font-medium">₪{reflectionData.variableExpenses.toLocaleString()}</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="font-medium">תזרים:</span>
              <span className={`font-bold ${reflectionCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₪{reflectionCashFlow.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-blue-700">אחרי - תכנון חודשי</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">הכנסות:</span>
              <span className="font-medium">₪{planIncome.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">הוצאות קבועות:</span>
              <span className="font-medium">₪{planFixedExpenses.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">הוצאות משתנות:</span>
              <span className="font-medium">₪{planVariableExpenses.toLocaleString()}</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="font-medium">תזרים:</span>
              <span className={`font-bold ${(planIncome - planTotalExpenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₪{(planIncome - planTotalExpenses).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {cashFlowDiff > 0 ? (
              <TrendingUp className="w-5 h-5 text-green-600" />
            ) : cashFlowDiff < 0 ? (
              <TrendingDown className="w-5 h-5 text-red-600" />
            ) : (
              <Minus className="w-5 h-5 text-gray-500" />
            )}
            פערים בין הלפני לאחרי
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-white rounded-xl shadow-sm">
              <p className="text-sm text-gray-500 mb-2">פער בתזרים חודשי</p>
              <DifferenceIndicator value={monthlyDiff} />
            </div>
            <div className="text-center p-4 bg-white rounded-xl shadow-sm">
              <p className="text-sm text-gray-500 mb-2">פער בתזרים שנתי</p>
              <DifferenceIndicator value={yearlyDiff} />
            </div>
            <div className="text-center p-4 bg-white rounded-xl shadow-sm">
              <p className="text-sm text-gray-500 mb-2">פער בתזרים ב-5 שנים</p>
              <DifferenceIndicator value={fiveYearDiff} />
            </div>
          </div>

          {monthlyDiff > 0 && (
            <div className="mt-4 p-4 bg-green-100 rounded-xl">
              <p className="text-green-700 font-medium">
                🎉 מעולה! לפי התכנון החודשי, אתם צפויים לחסוך ₪{monthlyDiff.toLocaleString()} יותר בחודש.
              </p>
            </div>
          )}

          {monthlyDiff < 0 && (
            <div className="mt-4 p-4 bg-amber-100 rounded-xl">
              <p className="text-amber-700 font-medium">
                ⚠️ לפי התכנון הנוכחי, התזרים נמוך מהממוצע ההיסטורי. מומלץ לבדוק את ההוצאות.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison Chart - bottom, after gaps */}
      <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-slate-800">
            <div className="p-2 rounded-xl bg-indigo-500/10">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
            </div>
            השוואה: לפני VS אחרי
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={[
                { name: 'הכנסות', לפני: reflectionData.income, אחרי: planIncome },
                { name: 'הוצאות', לפני: reflectionTotalExpenses, אחרי: planTotalExpenses },
                { name: 'תזרים', לפני: reflectionCashFlow, אחרי: planIncome - planTotalExpenses },
              ]}
              margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#64748b' }} />
              <YAxis tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                formatter={(value, name) => [`₪${value.toLocaleString()}`, name === 'לפני' ? '📊 לפני (שיקוף)' : '✅ אחרי (תכנון)']}
                contentStyle={{ direction: 'rtl', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
              />
              <Legend
                formatter={(value) => value === 'לפני' ? '📊 לפני (שיקוף)' : '✅ אחרי (תכנון)'}
                wrapperStyle={{ fontSize: '13px', paddingTop: '8px' }}
              />
              <ReferenceLine y={0} stroke="#94a3b8" />
              <Bar dataKey="לפני" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              <Bar dataKey="אחרי" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}