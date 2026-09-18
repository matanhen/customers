// Shared expense categories + financial-week helpers for backend functions.
// Mirrors src/components/financial/expenseCategories.jsx (backend can't import src/).

export const EXPENSE_CATEGORIES = [
  {
    key: 'housing',
    label: 'דיור ותקשורת',
    items: [
      'מזון ומכולת', 'משכנתא', 'שכירות', 'ארנונה', 'חשמל', 'מים', 'גז',
      'טלויזיה ואינטרנט', 'טלפון נייד', 'ועד בית', 'ביטוח משכנתא', 'ריהוט ודברים לבית',
    ],
  },
  {
    key: 'vehicles',
    label: 'רכבים ונסיעות',
    items: ['ביטוחי רכב', 'טסט', 'דלק', 'חניה', 'תיקוני רכב', 'תחבורה ציבורית'],
  },
  {
    key: 'insurance',
    label: 'ביטוחים ובריאות',
    items: ['ביטוחי חיים', 'ביטוחי בריאות', 'קופת חולים', 'טיפולי שיניים'],
  },
  {
    key: 'leisure',
    label: 'תחביבים ופנאי',
    items: [
      'בילויים ומסעדות', 'בגדים ונעליים', 'הזמנת אוכל הביתה', 'חופשה / טיול',
      'חדר כושר', 'סיגריות', 'תספורת וקוסמטיקה', 'מתנות ואירועים',
    ],
  },
  {
    key: 'children',
    label: 'ילדים',
    items: ['חינוך', 'חוגים וקייטנות', 'עוזרת / בייביסיטר'],
  },
  {
    key: 'misc',
    label: 'שונות',
    items: [
      'החזר הלוואות', 'הוראות קבע', 'עמלות וריביות בנקים', 'אופטיקה',
      'חגים ויהדות', 'סופר פארם', 'ביטוח לאומי', 'מזומן', 'ביט',
      'תרומות', 'התפתחות אישית', 'בעלי חיים',
    ],
  },
];

export const FIXED_EXPENSE_ITEMS = new Set([
  'משכנתא', 'שכירות', 'ארנונה', 'חשמל', 'מים', 'גז', 'טלויזיה ואינטרנט', 'טלפון נייד',
  'ועד בית', 'ביטוח משכנתא', 'ביטוחי רכב', 'טסט', 'ביטוחי חיים', 'ביטוחי בריאות',
  'קופת חולים', 'חינוך', 'החזר הלוואות', 'הוראות קבע', 'עמלות וריביות בנקים', 'ביטוח לאומי',
]);

export function isVariableItem(itemName) {
  return !FIXED_EXPENSE_ITEMS.has(itemName);
}

export function findCategoryKey(itemName) {
  for (const cat of EXPENSE_CATEGORIES) {
    if (cat.items.includes(itemName)) return cat.key;
  }
  return 'misc';
}

// Financial week based on 10-cycle (matches WeeklyVariableTracker default):
// 10-16 = week1, 17-23 = week2, 24-end = week3, 1-9 = week4
export function getCurrentFinWeek(date = new Date()) {
  const day = date.getDate();
  if (day >= 10 && day <= 16) return 1;
  if (day >= 17 && day <= 23) return 2;
  if (day >= 24) return 3;
  return 4;
}

export function getCurrentMonth(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// Add amount to a week entry (number | { week1..week4 })
export function addAmountToWeek(entry, week, amount) {
  const base = typeof entry === 'number'
    ? { week1: entry, week2: 0, week3: 0, week4: 0 }
    : { week1: 0, week2: 0, week3: 0, week4: 0, ...(entry || {}) };
  base[`week${week}`] = (base[`week${week}`] || 0) + amount;
  return base;
}

export function getItemMonthTotal(entry) {
  if (entry == null) return 0;
  if (typeof entry === 'number') return entry;
  return (entry.week1 || 0) + (entry.week2 || 0) + (entry.week3 || 0) + (entry.week4 || 0);
}

export function sumVariableExpenses(variableExpenses = {}) {
  let total = 0;
  for (const catKey of Object.keys(variableExpenses)) {
    const catData = variableExpenses[catKey] || {};
    for (const item of Object.keys(catData)) {
      total += getItemMonthTotal(catData[item]);
    }
  }
  return Math.round(total);
}