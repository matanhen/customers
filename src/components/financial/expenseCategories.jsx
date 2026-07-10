// Shared expense categories used across the app
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
    items: [
      'ביטוחי רכב', 'טסט', 'דלק', 'חניה', 'תיקוני רכב', 'תחבורה ציבורית',
    ],
  },
  {
    key: 'insurance',
    label: 'ביטוחים ובריאות',
    items: [
      'ביטוחי חיים', 'ביטוחי בריאות', 'קופת חולים', 'טיפולי שיניים',
    ],
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
    items: [
      'חינוך', 'חוגים וקייטנות', 'עוזרת / בייביסיטר',
    ],
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

export function getCategoryByKey(key) {
  return EXPENSE_CATEGORIES.find(c => c.key === key);
}

// Migrate legacy fixed/variable expenses to new category-based structure
export function migrateLegacyExpenses(fixedExpenses = {}, variableExpenses = {}) {
  const allLegacy = { ...fixedExpenses, ...variableExpenses };
  const result = {};

  Object.entries(allLegacy).forEach(([itemName, monthData]) => {
    let catKey = 'misc';
    for (const cat of EXPENSE_CATEGORIES) {
      if (cat.items.includes(itemName)) {
        catKey = cat.key;
        break;
      }
    }
    if (!result[catKey]) result[catKey] = {};
    result[catKey][itemName] = monthData;
  });

  return result;
}

// Get flat list of all expense items with their category
export function getAllExpenseItems() {
  return EXPENSE_CATEGORIES.flatMap(cat =>
    cat.items.map(item => ({ item, categoryKey: cat.key, categoryLabel: cat.label }))
  );
}

// Flat list of all item names
export const ALL_EXPENSE_ITEMS = EXPENSE_CATEGORIES.flatMap(cat => cat.items);

// Items considered "fixed" (recurring/committed) expenses - everything else counts as variable
export const FIXED_EXPENSE_ITEMS = new Set([
  'משכנתא', 'שכירות', 'ארנונה', 'חשמל', 'מים', 'גז', 'טלויזיה ואינטרנט', 'טלפון נייד',
  'ועד בית', 'ביטוח משכנתא', 'ביטוחי רכב', 'טסט', 'ביטוחי חיים', 'ביטוחי בריאות',
  'קופת חולים', 'חינוך', 'החזר הלוואות', 'הוראות קבע', 'עמלות וריביות בנקים', 'ביטוח לאומי',
]);

// Whether an expense item name should count as a "variable" (discretionary) expense
export function isVariableItem(itemName) {
  return !FIXED_EXPENSE_ITEMS.has(itemName);
}

// Weekly breakdown helpers - each tracking table entry can be either a legacy plain number
// (treated as week1) or an object { week1, week2, week3, week4 }.
export function getItemWeekAmount(entry, week) {
  if (entry == null) return 0;
  if (typeof entry === 'number') return week === 1 ? entry : 0;
  return entry[`week${week}`] || 0;
}

export function setItemWeekAmount(entry, week, value) {
  const base = typeof entry === 'number'
    ? { week1: entry, week2: 0, week3: 0, week4: 0 }
    : { week1: 0, week2: 0, week3: 0, week4: 0, ...(entry || {}) };
  base[`week${week}`] = value;
  return base;
}

export function getItemMonthTotal(entry) {
  if (entry == null) return 0;
  if (typeof entry === 'number') return entry;
  return (entry.week1 || 0) + (entry.week2 || 0) + (entry.week3 || 0) + (entry.week4 || 0);
}

// Default expense structure for new users
export function getDefaultExpenses() {
  const result = {};
  EXPENSE_CATEGORIES.forEach(cat => {
    result[cat.key] = {};
    cat.items.forEach(item => {
      result[cat.key][item] = { month1: 0, month2: 0, month3: 0 };
    });
  });
  return result;
}