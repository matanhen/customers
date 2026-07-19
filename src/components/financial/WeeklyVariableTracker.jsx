import React, { useEffect, useRef } from 'react';
import { format, lastDayOfMonth } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CalendarDays, ChevronRight, ChevronLeft } from 'lucide-react';

// Financial month cycle can start on the 10th (default) or the 1st.
// cycle=10: week1=10-16, week2=17-23, week3=24-end, week4=1-9 (NEXT month)
// cycle=1:  week1=1-7,   week2=8-15,  week3=16-23, week4=24-end (SAME month)
export function getFinMonthAnchor(cycleStart = 10) {
  const today = new Date();
  const day = today.getDate();
  const year = today.getFullYear();
  const month = today.getMonth();
  let currentWeek, finYear, finMonth;

  if (cycleStart === 1) {
    if (day >= 1 && day <= 7) { currentWeek = 1; finYear = year; finMonth = month; }
    else if (day >= 8 && day <= 15) { currentWeek = 2; finYear = year; finMonth = month; }
    else if (day >= 16 && day <= 23) { currentWeek = 3; finYear = year; finMonth = month; }
    else { currentWeek = 4; finYear = year; finMonth = month; }
  } else {
    // default 10-cycle (existing behavior)
    if (day >= 10 && day <= 16) { currentWeek = 1; finYear = year; finMonth = month; }
    else if (day >= 17 && day <= 23) { currentWeek = 2; finYear = year; finMonth = month; }
    else if (day >= 24) { currentWeek = 3; finYear = year; finMonth = month; }
    else { currentWeek = 4; finYear = month === 0 ? year - 1 : year; finMonth = month === 0 ? 11 : month - 1; }
  }

  return { finYear, finMonth, currentWeek };
}

function getRangeLabel(week, finYear, finMonth, cycleStart = 10) {
  const finMonthDate = new Date(finYear, finMonth, 1);
  const monthLabel = format(finMonthDate, 'MMMM', { locale: he });
  const lastDay = format(lastDayOfMonth(finMonthDate), 'd');

  if (cycleStart === 1) {
    if (week === 1) return `1-7 ב${monthLabel}`;
    if (week === 2) return `8-15 ב${monthLabel}`;
    if (week === 3) return `16-23 ב${monthLabel}`;
    return `24-${lastDay} ב${monthLabel}`;
  }

  // default 10-cycle
  if (week === 1) return `10-16 ב${monthLabel}`;
  if (week === 2) return `17-23 ב${monthLabel}`;
  if (week === 3) return `24-${lastDay} ב${monthLabel}`;
  const nextMonthLabel = format(new Date(finYear, finMonth + 1, 1), 'MMMM', { locale: he });
  return `1-9 ב${nextMonthLabel}`;
}

/**
 * Weekly progress for variable (discretionary) expenses, driven by the same data
 * that powers the monthly Expense Tracking table.
 * plannedVariable: the "יתרת הוצאות" budget from the Monthly Plan.
 * actualVariableSpent: cumulative sum of variable items entered so far this month in the tracking table.
 * weeklySnapshots: { week1, week2, week3, week4 } - cumulative actualVariableSpent baseline captured
 *   at the moment each week started, so previous weeks' amounts can be reconstructed.
 * onUpdateSnapshot(newWeeklySnapshots): called to persist backfilled/updated snapshots.
 * cycleStart: 10 (default, weeks run 10→9) or 1 (weeks run 1→31).
 */
export default function WeeklyVariableTracker({
  plannedVariable = 0,
  actualVariableSpent = 0,
  weeklySnapshots = {},
  onUpdateSnapshot,
  selectedWeek,
  onWeekChange,
  cycleStart = 10,
}) {
  const { finYear, finMonth, currentWeek: currentRealWeek } = getFinMonthAnchor(cycleStart);
  const backfilledRef = useRef(false);

  // Ensure we have a baseline snapshot for every week up to the current real week.
  useEffect(() => {
    if (backfilledRef.current) return;
    const missing = [];
    for (let w = 1; w <= currentRealWeek; w++) {
      if (weeklySnapshots[`week${w}`] === undefined) missing.push(w);
    }
    if (missing.length > 0) {
      backfilledRef.current = true;
      const updated = { ...weeklySnapshots };
      missing.forEach((w) => {
        updated[`week${w}`] = w === 1 ? 0 : actualVariableSpent;
      });
      onUpdateSnapshot && onUpdateSnapshot(updated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRealWeek]);

  const rangeLabel = getRangeLabel(selectedWeek, finYear, finMonth, cycleStart);
  const weeklyBudget = plannedVariable / 4;

  const start = weeklySnapshots[`week${selectedWeek}`] ?? (selectedWeek === 1 ? 0 : undefined);
  const nextSnapshot = weeklySnapshots[`week${selectedWeek + 1}`];
  const end = nextSnapshot !== undefined ? nextSnapshot : (selectedWeek === currentRealWeek ? actualVariableSpent : undefined);

  const hasData = start !== undefined && end !== undefined;
  const spentThisWeek = hasData ? Math.max(0, end - start) : 0;
  const remainingThisWeek = weeklyBudget - spentThisWeek;
  const weekProgress = weeklyBudget > 0 ? Math.min(100, Math.round((spentThisWeek / weeklyBudget) * 100)) : 0;
  const notReached = selectedWeek > currentRealWeek;

  const goPrev = () => onWeekChange && onWeekChange(Math.max(1, selectedWeek - 1));
  const goNext = () => onWeekChange && onWeekChange(Math.min(4, selectedWeek + 1));

  if (!plannedVariable) {
    return (
      <Card className="border-2 border-teal-300 bg-teal-50/40">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg text-teal-700">
            <CalendarDays className="w-5 h-5 text-teal-600" />
            מעקב שבועי - הוצאות משתנות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            יש להזין את "יתרת הוצאות" בתכנון החודשי כדי לראות כאן את המעקב השבועי.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-teal-300 bg-teal-50/40">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg text-teal-700">
          <CalendarDays className="w-5 h-5 text-teal-600" />
          מעקב שבועי - הוצאות משתנות
        </CardTitle>
        <div className="flex items-center justify-center gap-3 mt-1">
          <button
            onClick={goPrev}
            disabled={selectedWeek === 1}
            className="p-1 rounded-full text-teal-700 disabled:opacity-30 hover:bg-teal-100"
            aria-label="שבוע קודם"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-600 min-w-[140px] text-center">
            שבוע {selectedWeek} ({rangeLabel})
          </span>
          <button
            onClick={goNext}
            disabled={selectedWeek === 4}
            className="p-1 rounded-full text-teal-700 disabled:opacity-30 hover:bg-teal-100"
            aria-label="שבוע הבא"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {notReached ? (
          <p className="text-sm text-gray-500 text-center">השבוע הזה עוד לא הגיע.</p>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-gray-600">נותר להוצאה בשבוע זה:</span>
              <span className={`text-xl font-bold ${remainingThisWeek < 0 ? 'text-red-600' : 'text-teal-700'}`}>
                ₪{Math.round(remainingThisWeek).toLocaleString()} מתוך ₪{Math.round(weeklyBudget).toLocaleString()}
              </span>
            </div>
            <Progress
              value={weekProgress}
              className={`h-3 ${remainingThisWeek < 0 ? 'bg-red-200' : 'bg-teal-200'}`}
            />
            <p className="text-sm text-gray-500 mt-1">₪{Math.round(spentThisWeek).toLocaleString()} הוצאו בשבוע זה</p>
          </div>
        )}
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