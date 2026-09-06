export const FINANCIAL_STEPS = [
  { id: 1, key: 'no_overdraft', label: 'אין מינוס', description: 'יתרת עו"ש שאינה שלילית', unit: '₪' },
  { id: 2, key: 'positive_cashflow', label: 'תזרים חודשי חיובי', description: 'הכנסה גדולה מהוצאות', unit: '₪' },
  { id: 3, key: 'no_bad_debts', label: 'אין חובות רעים', description: 'סגירת חובות שהוגדרו לחיסול', unit: '₪' },
  { id: 4, key: 'initial_emergency_fund', label: 'קרן ביטחון ראשונית', description: '5,000 ₪ זמינים ונזילים', unit: '₪' },
  { id: 5, key: 'open_portfolio', label: 'פתיחת תיק השקעות', description: 'פתיחת תיק והפקדה ראשונה', unit: '' },
  { id: 6, key: 'full_emergency_fund', label: 'קרן ביטחון מלאה', description: 'הוצאות חודשיות × 3 חודשי מחיה', unit: '₪' },
  { id: 7, key: 'capital_100k', label: '100,000 ₪ הון עצמי', description: 'הון עצמי של 100,000 ₪', unit: '₪' },
  { id: 8, key: 'first_property', label: 'רכישת דירה ראשונה', description: 'הון עצמי לרכישת נכס', unit: '₪' },
  { id: 9, key: 'financial_security', label: 'ביטחון כלכלי', description: 'הכנסה פסיבית מכסה הוצאות חיוניות', unit: '₪' },
  { id: 10, key: 'financial_freedom', label: 'חופש כלכלי מוחלט', description: 'הכנסה פסיבית מכסה את כל ההוצאות', unit: '₪' },
];

export function getStepValue(stepId, s) {
  switch (stepId) {
    case 1: return s.checkingBalance ?? 0;
    case 2: return s.cashFlow ?? 0;
    case 3: return s.totalLiabilities ?? 0;
    case 4: return s.emergencyFund ?? 0;
    case 5: return s.hasInvestments ? 1 : 0;
    case 6: return s.emergencyFund ?? 0;
    case 7: return s.netWorth ?? 0;
    case 8: return s.netWorth ?? 0;
    case 9: return s.passiveIncome ?? 0;
    case 10: return s.passiveIncome ?? 0;
    default: return 0;
  }
}

export function getStepTarget(stepId, s, stepTargets) {
  const t = stepTargets || {};
  switch (stepId) {
    case 1: return 0;
    case 2: return t['2'] ?? 2000;
    case 3: return 0;
    case 4: return 5000;
    case 5: return 1;
    case 6: return Math.round((s.monthlyExpenses || 0) * 3);
    case 7: return 100000;
    case 8: return t['8'] ?? 200000;
    case 9: return s.essentialExpenses || 0;
    case 10: return s.totalExpenses || 0;
    default: return 0;
  }
}

export function getStepGap(stepId, s, stepTargets) {
  const current = getStepValue(stepId, s);
  const target = getStepTarget(stepId, s, stepTargets);
  if (stepId === 3) return current - target;
  if (stepId === 1) return Math.max(0, target - current);
  if (stepId === 5) return current >= target ? 0 : 1;
  return target - current;
}

export function isStepCompleted(stepId, s, stepTargets) {
  return getStepGap(stepId, s, stepTargets) <= 0;
}

export function formatCurrency(n) {
  const num = Math.round(n || 0);
  return `₪${num.toLocaleString('he-IL')}`;
}