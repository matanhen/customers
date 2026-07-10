import React, { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format, lastDayOfMonth } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CalendarDays } from 'lucide-react';
import { isVariableItem } from './expenseCategories';

// Financial weeks run 10th-to-10th: week1=10-16, week2=17-23, week3=24-end, week4=1-9 (next month)
function getFinancialWeekInfo() {
  const today = new Date();
  const day = today.getDate();
  const year = today.getFullYear();
  const month = today.getMonth();
  let week, finYear, finMonth;

  if (day >= 10 && day <= 16) { week = 1; finYear = year; finMonth = month; }
  else if (day >= 17 && day <= 23) { week = 2; finYear = year; finMonth = month; }
  else if (day >= 24) { week = 3; finYear = year; finMonth = month; }
  else { week = 4; finYear = month === 0 ? year - 1 : year; finMonth = month === 0 ? 11 : month - 1; }

  const finMonthDate = new Date(finYear, finMonth, 1);
  const financialMonthKey = format(finMonthDate, 'yyyy-MM');
  const monthLabel = format(finMonthDate, 'MMMM', { locale: he });

  let rangeLabel = '';
  if (week === 1) rangeLabel = `10-16 ב${monthLabel}`;
  else if (week === 2) rangeLabel = `17-23 ב${monthLabel}`;
  else if (week === 3) rangeLabel = `24-${format(lastDayOfMonth(finMonthDate), 'd')} ב${monthLabel}`;
  else {
    const nextMonthLabel = format(new Date(finYear, finMonth + 1, 1), 'MMMM', { locale: he });
    rangeLabel = `1-9 ב${nextMonthLabel}`;
  }

  return { week, financialMonthKey, rangeLabel };
}

export default function WeeklyVariableTracker({ userId, monthlyPlans = [], currentUser, isViewingOther, isAdvisorOrAdmin, viewingClientEmail }) {
  const { week, financialMonthKey, rangeLabel } = getFinancialWeekInfo();
  const processedRef = useRef(null);

  const plan = monthlyPlans.find(p => p.month === financialMonthKey);
  const plannedVariable = plan?.variable_expenses || 0;
  const weeklyBudget = plannedVariable / 4;

  const { data: trackingList = [] } = useQuery({
    queryKey: ['weeklyExpenseTracking', userId, financialMonthKey, currentUser?.id, isViewingOther, isAdvisorOrAdmin],
    queryFn: async () => {
      if (isViewingOther && isAdvisorOrAdmin) {
        const response = await base44.functions.invoke('getClientData', {
          clientUserId: userId,
          clientEmail: viewingClientEmail,
          entityName: 'ExpenseTracking'
        });
        return (response.data.data || []).filter(t => t.month === financialMonthKey);
      }
      return base44.entities.ExpenseTracking.filter({ user_id: userId, month: financialMonthKey });
    },
    enabled: !!userId && !!currentUser && !!plan,
    staleTime: 0,
  });

  const tracking = trackingList[0];

  const actualVariableSpent = (() => {
    if (!tracking) return 0;
    let total = 0;
    Object.entries(tracking.fixed_expenses || {}).forEach(([item, amount]) => {
      if (isVariableItem(item)) total += (amount || 0);
    });
    (tracking.custom_expenses || []).forEach(exp => {
      if (exp.type === 'variable') total += (exp.amount || 0);
    });
    return total;
  })();

  const snapshotMutation = useMutation({
    mutationFn: async (data) => {
      if (isViewingOther && isAdvisorOrAdmin) {
        return base44.functions.invoke('saveClientData', {
          entityName: 'ExpenseTracking',
          clientUserId: userId,
          data: { ...data, user_id: userId, month: financialMonthKey },
          recordId: tracking?.id || null,
        });
      }
      return base44.entities.ExpenseTracking.update(tracking.id, data);
    },
  });

  useEffect(() => {
    if (!tracking) return;
    const key = `${tracking.id}_${week}`;
    if (processedRef.current === key) return;
    if (tracking.weekly_snapshot_week === week) { processedRef.current = key; return; }
    processedRef.current = key;
    snapshotMutation.mutate({ weekly_snapshot_week: week, weekly_snapshot_amount: actualVariableSpent });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracking?.id, week]);

  if (!plannedVariable) {
    return (
      <Card className="border-2 border-teal-300 bg-teal-50/40">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg text-teal-700">
            <CalendarDays className="w-5 h-5 text-teal-600" />
            מעקב שבועי - הוצאות משתנות
          </CardTitle>
          <p className="text-sm text-gray-500">שבוע {week} ({rangeLabel})</p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            יש להזין את "יתרת הוצאות" בתכנון החודשי כדי לראות כאן את המעקב השבועי.
          </p>
        </CardContent>
      </Card>
    );
  }

  const baseline = tracking?.weekly_snapshot_week === week ? (tracking.weekly_snapshot_amount || 0) : actualVariableSpent;
  const spentThisWeek = Math.max(0, actualVariableSpent - baseline);
  const remainingThisWeek = weeklyBudget - spentThisWeek;
  const weekProgress = weeklyBudget > 0 ? Math.min(100, Math.round((spentThisWeek / weeklyBudget) * 100)) : 0;

  return (
    <Card className="border-2 border-teal-300 bg-teal-50/40">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg text-teal-700">
          <CalendarDays className="w-5 h-5 text-teal-600" />
          מעקב שבועי - הוצאות משתנות
        </CardTitle>
        <p className="text-sm text-gray-500">שבוע {week} ({rangeLabel})</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-600">נותר להוצאה השבוע:</span>
            <span className={`text-xl font-bold ${remainingThisWeek < 0 ? 'text-red-600' : 'text-teal-700'}`}>
              ₪{Math.round(remainingThisWeek).toLocaleString()} מתוך ₪{Math.round(weeklyBudget).toLocaleString()}
            </span>
          </div>
          <Progress
            value={weekProgress}
            className={`h-3 ${remainingThisWeek < 0 ? 'bg-red-200' : 'bg-teal-200'}`}
          />
          <p className="text-sm text-gray-500 mt-1">₪{Math.round(spentThisWeek).toLocaleString()} הוצאו השבוע</p>
        </div>
        <div className="pt-2 border-t border-teal-200 flex justify-between text-sm">
          <span className="text-gray-600">סה"כ הוצאות משתנות החודש:</span>
          <span className="font-bold text-teal-700">
            ₪{Math.round(actualVariableSpent).toLocaleString()} / ₪{Math.round(plannedVariable).toLocaleString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}