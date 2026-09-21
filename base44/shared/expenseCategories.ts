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

// Synonym map: common variations / free-text terms → predefined item name.
// Used by addMyExpense to normalize incoming item names from the WhatsApp agent
// so that "מסעדה" maps to "בילויים ומסעדות", "סופר" to "מזון ומכולת", etc.
const ITEM_SYNONYMS: Record<string, string[]> = {
  'מזון ומכולת': ['סופר', 'סופרמרקט', 'סופר-מרקט', 'מכולת', 'מצרכים', 'קניות מזון', 'מזון', 'שופרסל', 'יינות ביתן', 'טיב טעם', 'אוכל סופר', 'מכולת ומזון'],
  'משכנתא': ['משכנתה', 'משכנתה בנקאית', 'החזר משכנתא'],
  'שכירות': ['שכר דירה', 'שכ"ד', 'שכרדירה', 'דמי שכירות'],
  'ארנונה': ['מס נכס', 'ארנונה עירייה', 'מסנכס', 'מס נכסים'],
  'חשמל': ['חשמל חברת חשמל', 'חברת חשמל', 'חשמלית', 'חשבון חשמל'],
  'מים': ['מים תאגיד', 'מים עירייה', 'תאגיד מים', 'חשבון מים'],
  'גז': ['גז בישול', 'גז טבעי', 'חשבון גז'],
  'טלויזיה ואינטרנט': ['טלוויזיה', 'אינטרנט', 'כבלים', 'yes', 'הוט', 'סלקום טיוי', 'טלוויזיה ואינטרנט', 'טלויזיה', 'טלוויזיה ואינטרנט'],
  'טלפון נייד': ['סלולרי', 'פלאפון', 'סלקום', 'פרטנר', 'ראדיו סלולר', 'סלולר', 'חשבון טלפון', 'סלולרי וטלפון'],
  'ועד בית': ['ועד', 'ועד-בית', 'תחזוקה', 'ועד בניין'],
  'ביטוח משכנתא': ['ביטוח חיים משכנתא'],
  'ריהוט ודברים לבית': ['ריהוט', 'דברים לבית', 'איקאה', 'ריהוט ובית'],
  'ביטוחי רכב': ['ביטוח רכב', 'ביטוח צד ג', 'ביטוח חובה', 'ביטוח מקיף', 'ביטוחים רכב'],
  'טסט': ['טסט רכב', 'טסט שנתי'],
  'דלק': ['דלק רכב', 'בנזין', 'פזול', 'סולר', 'דלקים', 'פאזול', 'דלק95', 'דלק 95', 'תדלוק'],
  'חניה': ['חניה חניון', 'חניון', 'חניה חודשית', 'חניון חודשי', 'חנייה'],
  'תיקוני רכב': ['תיקון רכב', 'מוסך', 'מכונאי', 'טיפול רכב'],
  'תחבורה ציבורית': ['אוטובוס', 'רכבת', 'חופשי שנתי', 'חופשי חודשי', 'רב קו', 'רב-קו', 'תחבורה', 'מטרונית', 'מונית', 'מוניות', 'נסיעות'],
  'ביטוחי חיים': ['ביטוח חיים', 'ביטוחי-חיים'],
  'ביטוחי בריאות': ['ביטוח בריאות', 'ביטוח משלים', 'מדיקל', 'ביטוח משלים בריאות'],
  'קופת חולים': ['קופ"ח', 'מכבי', 'מאוחדת', 'לאומית', 'קופת-חולים', 'קופ"ח וטיפולים'],
  'טיפולי שיניים': ['שיניים', 'רופא שיניים', 'דנטיסט', 'טיפול שיניים'],
  'בילויים ומסעדות': ['מסעדה', 'מסעדות', 'בילויים', 'קפה', 'בית קפה', 'פאב', 'בר', 'יציאה', 'בילוי', 'ארוחה', 'ארוחות', 'פיצה', 'המבורגר', 'מעדנייה', 'בתי קפה', 'מסעדת', 'בילוי ומסעדות', 'בילויים ומסעדה', 'מסעדה ובילוי', 'בית-קפה'],
  'בגדים ונעליים': ['בגדים', 'נעליים', 'חולצה', 'מכנסיים', 'שמלה', 'הנעלה', 'אופנה', 'קניות בגדים', 'פוקס', 'רנואר', 'בגד', 'נעל', 'נעליים ובגדים', 'ביגוד'],
  'הזמנת אוכל הביתה': ['אוכל הביתה', 'דליברי', 'wolt', 'ייס', '10bis', '10ביס', 'אוכל עד הבית', 'הזמנת אוכל', 'הזמנת מזון', 'wolt ישראל', 'תן-ביס'],
  'חופשה / טיול': ['חופשה', 'טיול', 'נופש', 'מלון', 'צימר', 'חופשה משפחתית', 'טיול מאורגן', 'טיולים', 'נופשים', 'חופשה וטיול'],
  'חדר כושר': ['חדר כושר', "ג'ימ", 'גימ', 'כושר', 'מכון כושר', 'פילאטיס', 'סטודיו', 'גימנסיה', "ג'ימנסיה"],
  'סיגריות': ['סיגריה', 'עישון', 'טבק', 'סיגר'],
  'תספורת וקוסמטיקה': ['תספורת', 'מספרה', 'קוסמטיקה', 'טיפול פנים', 'צבע שיער', 'שיער', 'יופי', 'תספורת וקוסמטיקה', 'טיפוח'],
  'מתנות ואירועים': ['מתנות', 'מתנה', 'אירוע', 'אירועים', 'יום הולדת', 'חתונה', 'ברית', 'בת מצווה', 'מתנה ואירוע'],
  'חינוך': ['שכר לימוד', 'בית ספר', 'צהרון', 'שכר לימוד וחינוך'],
  'חוגים וקייטנות': ['חוג', 'חוגים', 'קייטנה', 'קייטנות', 'חוג כדורגל', 'חוג ריקוד'],
  'עוזרת / בייביסיטר': ['עוזרת', 'בייביסיטר', 'שמרטף', 'מטפלת', 'עוזרת ובייביסיטר'],
  'החזר הלוואות': ['הלוואה', 'החזר הלוואה', 'הלוואות', 'החזר הלוואות'],
  'הוראות קבע': ['הוראת קבע', 'קבע', 'הוראות-קבע'],
  'עמלות וריביות בנקים': ['עמלות', 'ריבית', 'עמלת בנק', 'עמלה', 'עמלות בנקים', 'ריביות בנקים'],
  'אופטיקה': ['משקפיים', 'משקפי ראייה', 'עדשות', 'אופטומטריסט', 'משקפי שמש'],
  'חגים ויהדות': ['חג', 'חגים', 'פסח', 'ראש השנה', 'סוכות', 'פורים', 'חנוכה', 'שבת', 'חג ויהדות'],
  'סופר פארם': ['פארם', 'סופר-פארם', 'בית מרקחת', 'תרופות', 'תרופה'],
  'ביטוח לאומי': ['המוסד לביטוח לאומי', 'דמי ביטוח', 'ביטוח-לאומי'],
  'מזומן': ['כסף מזומן', 'cash', 'מזומנים'],
  'ביט': ['bit', 'ביט פי', 'bit pay'],
  'תרומות': ['תרומה', 'צדקה', 'תרומה וצדקה'],
  'התפתחות אישית': ['ספר', 'ספרים', 'קורס', 'סדנה', 'התפתחות', 'אימון אישי', "קואוצ'ינג", 'ספר וקורס'],
  'בעלי חיים': ['כלב', 'חתול', 'חיית מחמד', 'מזון לכלב', 'וטרינר', 'וט', 'חיות מחמד', 'בעלי-חיים'],
};

// Normalize a free-text item name to a predefined expense item.
// 1. Exact match against predefined items.
// 2. Exact match against custom categories (user-defined items).
// 3. Synonym map lookup.
// 4. Substring containment (both directions) against predefined items.
// Returns the matched predefined item name, or the original input if no match.
export function normalizeItemName(
  itemName: string,
  customCategories: { name: string }[] = [],
): string {
  const trimmed = (itemName || '').trim();
  if (!trimmed) return trimmed;

  const allItems = EXPENSE_CATEGORIES.flatMap(c => c.items);

  // 1. Exact match
  if (allItems.includes(trimmed)) return trimmed;

  // 2. Custom categories exact match
  for (const cc of customCategories) {
    if (cc.name === trimmed) return trimmed;
  }

  const lower = trimmed.toLowerCase();

  // 3. Synonym map
  for (const [target, synonyms] of Object.entries(ITEM_SYNONYMS)) {
    for (const syn of synonyms) {
      if (syn.toLowerCase() === lower) return target;
    }
  }

  // 4. Substring containment — check if input contains or is contained in a predefined item
  for (const item of allItems) {
    const itemLower = item.toLowerCase();
    if (itemLower.includes(lower) || lower.includes(itemLower)) {
      return item;
    }
  }

  // 4b. Substring against custom categories
  for (const cc of customCategories) {
    const ccLower = (cc.name || '').toLowerCase();
    if (ccLower && (ccLower.includes(lower) || lower.includes(ccLower))) {
      return cc.name;
    }
  }

  return trimmed;
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