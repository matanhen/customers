// Shared expense categories used across the app
export const EXPENSE_CATEGORIES = [
  {
    key: 'housing',
    label: 'דיור ותקשורת',
    items: ['משכנתא', 'שכירות', 'ועד בית', 'ארנונה', 'חשמל', 'מים', 'גז', 'אינטרנט', 'טלפון נייד', 'כבלים/סלולר'],
  },
  {
    key: 'vehicles',
    label: 'רכב ותחבורה',
    items: ['ביטוחי רכב', 'טסט', 'דלק וחניה', 'תחבורה ציבורית', 'תיקוני רכב', 'ליסינג/הלוואת רכב'],
  },
  {
    key: 'insurance',
    label: 'ביטוחים ופיננסים',
    items: ['ביטוחים (ללא רכב)', 'ביטוח משכנתא', 'החזר הלוואות', 'עמלות וריביות בנקים', 'ביטוח לאומי'],
  },
  {
    key: 'food',
    label: 'מזון וקניות',
    items: ['מזון', 'סופר פארם', 'דברים לבית', 'מסעדות וקפה'],
  },
  {
    key: 'lifestyle',
    label: 'אורח חיים ובילוי',
    items: ['בילויים', 'חופשה / טיול', 'בגדים ונעליים', 'ספורט ובריאות', 'אופטיקה', 'טיפולי שיניים', 'תספורת וקוסמטיקה', 'בעלי חיים', 'מתנות ואירועים', 'חגים ויהדות', 'סיגריות'],
  },
  {
    key: 'education',
    label: 'חינוך והתפתחות',
    items: ['חינוך', 'חוגים וקייטנות', 'התפתחות אישית', 'ספרים וקורסים'],
  },
  {
    key: 'misc',
    label: 'שונות',
    items: ['עוזרת / בייביסיטר', 'ביט', 'מזומן', 'תרומות', 'הוראות קבע', 'מנויים', 'אחר'],
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
    // Find which category this item belongs to
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

// Flat export for direct import
export const ALL_EXPENSE_ITEMS = EXPENSE_CATEGORIES.flatMap(cat =>
  cat.items.map(item => ({ item, categoryKey: cat.key, categoryLabel: cat.label }))
);