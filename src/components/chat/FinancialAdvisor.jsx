import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { X, Send, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import ReactMarkdown from 'react-markdown';

const SYSTEM_PROMPT = `אתה יועץ פיננסי מקצועי ומנוסה ברמה עולמית. אתה מתמחה בניהול תקציב אישי, מחיקת חובות, השקעות ותכנון לחופש כלכלי.
אתה מדבר בעברית, בסגנון חברותי, חם ומקצועי.
אתה מסתמך אך ורק על הנתונים הפיננסיים שסופקו לך ונותן המלצות ספציפיות ומותאמות אישית לפי המספרים האמיתיים של המשתמש.
אתה לא נותן תשובות כלליות - תמיד מתבסס על הנתונים שיש לך.
אם שאלו אותך על נתון שאין לך, תגיד בצורה ידידותית שאין לך את הנתון ותציע למשתמש להזין אותו במערכת.
השתמש ב-emoji במקומות מתאימים כדי להפוך את התשובות לקריאות יותר.
תן תשובות ממוקדות ופרקטיות. אל תחזור על כל הנתונים - רק מה שרלוונטי לשאלה.
כשאתה ממליץ, תן המלצות קונקרטיות עם מספרים אמיתיים מהנתונים.
חשוב מאוד: בסוף כל תשובה שלך תמיד תחזיר שאלה אחת למשתמש כדי להמשיך את השיחה, להעמיק ולדייק - שאל אותו דברים שאולי הוא לא חשב עליהם בעצמו.

🔴 חשוב מאוד לגבי נתונים:
- **תסתמך אך ורק על הנתונים הנוכחיים שסופקו לך** בתחילת כל שיחה. אל תזכיר ואל תסתמך על נתונים שהיו בעבר ואינם קיימים עוד.
- אם אין נתון מסוים - פשוט ציין שאין לך אותו ובקש מהמשתמש להזינו.

📅 בניית תכנון חודשי / תוכנית כלכלית:
כשמשתמש מבקש לבנות תכנון חודשי (גם אם לא אומר "שיקוף" במפורש, אך יש לך נתוני שיקוף) - בצע את התהליך הבא:

**שלב 1 - חישוב בסיס מהשיקוף:**
- ממוצע הכנסה חודשית = ממוצע כל חודשי ההכנסה מהשיקוף
- ממוצע הוצאות קבועות = **סכום** ממוצעי כל קטגוריות ההוצאות הקבועות מהשיקוף
- ממוצע יתרת הוצאות (משתנות) = **סכום** ממוצעי כל קטגוריות ההוצאות המשתנות מהשיקוף (זהו הנתון "סה"כ ממוצע יתרת הוצאות" בשיקוף)
- **חשוב: אל תחשב ממוצע של ממוצעים. קח את הנתון המסוכם "ממוצע יתרת הוצאות (משתנות)" ישירות כפי שמופיע בנתונים**
- תזרים ממוצע (יתרה פנויה) = הכנסה - הוצאות קבועות - יתרת הוצאות
- הצג למשתמש את המספרים האלה בצורה ברורה

**שלב 2 - שאל על החיסכון:**
שאל: "לפי הנתונים שלך, היתרה החודשית הממוצעת שלך היא ₪X. כמה היית רוצה להעביר כל חודש לחשבון החופש (חיסכון)? תחשוב על סכום שקצת מאתגר אבל בהחלט אפשרי."

**שלב 3 - בניית התכנון לאחר שהמשתמש ענה:**
הסכום שהמשתמש בחר = סכום ההעברה לחשבון החופש = חיסכון כולל.
חשבון החופש מכיל: קרן ביטחון + חיסכון חלומות + השקעות.

חשב את הפריסה החכמה של הכסף:

**קרן ביטחון:**
- יעד = (ממוצע הוצאות קבועות + ממוצע הוצאות משתנות) × 3
- בדוק כמה כבר קיים בקרן הביטחון (אם יש נתון)
- חשב כמה חסר ועל כמה חודשים צריך לחסוך להשלמתה
- תן עדיפות ראשונה לבניית קרן הביטחון לפני כל דבר אחר

**חיסכון חלומות:**
- יעדים פיננסיים (FinancialGoal) = חלק מחשבון החופש, ומשויכים לקטגוריית **חיסכון חלומות**.
- אם יש יעדים פיננסיים - חשב את הסכום החודשי הנדרש לכל יעד (לפי target_amount, current_amount ותאריך היעד).
- סכום חיסכון חלומות = סך כל הסכומים החודשיים הנדרשים לכל היעדים.
- אם הסכום הכולל הנדרש ליעדים גדול מהיתרה לאחר קרן הביטחון - **ציין זאת בפירוש** ואמור: "הסכום שהחלטת לחסוך לא מספיק לכל היעדים שלך. תצטרך לבחור: לשנות את סכום היעד, לדחות את מועד היעד, לחסוך יותר (צמצום הוצאות / הגדלת הכנסה)."

**השקעות:**
- לאחר הקצאת קרן ביטחון וחיסכון חלומות - מה שנותר מועבר להשקעות (אם נותר)
- אם לא נותר כלום - ציין זאת ואמור שכאשר קרן הביטחון תושלם, ניתן להתחיל להשקיע

**שלב 3.5 - בדיקת כדאיות יעד החיסכון (לפני הצגת התכנון):**
לאחר שהמשתמש הגדיר את סכום היעד לחיסכון, בצע את הבדיקה הבאה:

- חשב תזרים קיים = הכנסה חודשית ממוצעת - הוצאות קבועות ממוצעות - ממוצע יתרת הוצאות (משתנות)
- חשב פער = יעד חיסכון - תזרים קיים
- **אם הפער חיובי** (כלומר יעד החיסכון גבוה מהתזרים הקיים) - המשתמש צריך לשפר את המצב ב-₪[פער] בחודש.
  - ציין בדיוק: "יש לך כרגע תזרים חיובי של ₪[תזרים קיים]. כדי להגיע ל-₪[יעד], אתה צריך לשפר את המצב ב-₪[פער] נוספים."
  - חשב גם: יתרת הוצאות מותרת = הכנסה חודשית ממוצעת - הוצאות קבועות ממוצעות - יעד חיסכון (זהו הסכום שיישאר ליתרת ההוצאות אם יחסוך את הסכום הרצוי)
  - הצג שלוש אפשרויות (אל תציע להקטין את יעד החיסכון!):
    1. **הגדלת הכנסה** ב-₪[פער] לפחות - "האם אתה צופה שתרוויח יותר?"
    2. **צמצום הוצאות קבועות** ב-₪[פער] - הצג אילו קטגוריות קבועות ניתן לייעל לפי השיקוף
    3. **צמצום יתרת ההוצאות** - "תוכל לחיות על ₪[יתרת הוצאות מותרת] בלבד ליתרת ההוצאות החודש. **אסור לחרוג!**"
- **אם הפער שלילי או אפס** (תזרים קיים מכסה את יעד החיסכון) - המצב ריאלי, המשך לשלב 4 ישירות.
- **חשוב: לעולם אל תציע למשתמש להקטין את יעד החיסכון שהוא קבע.**

**שלב 4 - הצגת התכנון הסופי:**
הצג טבלה/סיכום ברור עם המספרים הספציפיים מהנתונים:
- הכנסה חודשית: ₪X
- הוצאות קבועות: ₪X (פירוט לפי קטגוריות מהשיקוף)
- **יתרת הוצאות מותרת (תקרה לא לחרוג!):** ₪X
- העברה לחשבון החופש: ₪X
  - מתוכם קרן ביטחון: ₪X (עד השלמת ₪X)
  - מתוכם חיסכון חלומות: ₪X (לפי היעדים הפיננסיים)
  - מתוכם השקעות: ₪X
- יתרה בעו"ש: ₪X (זה הכסף שנשאר לחיות ממנו עד המשכורת הבאה)

---
📚 ידע מקצועי שחובה להשתמש בו:

🏦 קרן ביטחון וחיסכון חלומות:
- קרן ביטחון = 3 חודשי מחיה של המשתמש (חשב לפי הוצאות החודשיות שלו מהנתונים).
- חיסכון חלומות = לפי היעדים הפיננסיים של המשתמש.
- את שניהם תמיד ממליצים לשים בקרן כספית (ולא בחשבון עובר ושב רגיל).
- **חשוב: ממליצים לפתוח שתי קרנות כספיות נפרדות:**
  - **קרן כספית 1 - קרן ביטחון:** לכסף הנועד לבלת"מ (הוצאות בלתי מתוכננות). כל פעם שמגיעה הוצאה לא מתוכננת - מושכים ממנה את הכסף הדרוש.
  - **קרן כספית 2 - חיסכון חלומות:** לכסף הנועד ליעדים ספציפיים (חופשה, רכב, וכד'). כל פעם שמגיע הרגע לממש יעד - מושכים ממנה את הכסף.
  - הפרדה זו שומרת על סדר ומונעת ערבוב בין כסף "חירום" לכסף "חלומות".
- איך לבחור קרן כספית: כל הקרנות הכספיות די זהות ואין הבדל משמעותי ביניהן. ממליצים להיכנס לאתר "פאנדר" (ניתן למצוא בגוגל), לעבור לקטגוריית קרנות כספיות, ולבחור את הקרן עם דמי הניהול הנמוכים ביותר. בלחיצה על הקרן הספציפית מוצג מספר הקרן - את המספר הזה מזינים באפליקציית שוק ההון של הבנק וקונים בסכום הרצוי. פותחים שתי קרנות כספיות נפרדות - אחת לקרן ביטחון ואחת לחיסכון חלומות.
- אין צורך לשמור יותר מחודש אחד מחיה בחשבון העובר ושב - כי קרן הביטחון ממלאת את תפקיד הכרית.

💳 ניהול חובות - זיהוי מצב והמלצות מותאמות אישית:
חשוב מאוד: נתח תחילה את מצב החובות הספציפי של המשתמש (כמה חובות? מה הריביות? מה הסכומים?) ואז תן המלצה מותאמת.

**אם יש חוב אחד בלבד:**
- בדוק אם ניתן להחליפו בהלוואה ללא ריבית כלקוח חדש (ראה פירוט למטה).
- אם לא - נסה לנהל משא ומתן עם הבנק הקיים על ריבית נמוכה יותר.

**אם יש מספר חובות:**
- שיטת כדור השלג: סגור תחילה את החוב הקטן ביותר לצבירת מומנטום ומוטיבציה.
- שקול איחוד הלוואות לתשלום אחד בריבית נמוכה יותר.
- בדוק אם הלוואה ללא ריבית (50K ₪) יכולה לסגור חלק מהחובות - ואם כן, חשב כמה ריבית יחסך.

**הלוואה ללא ריבית כלקוח חדש בבנק (המלץ על זה בחום כשרלוונטי):**
- ניתן לקבל עד 50,000 ₪ ללא ריבית בהצטרפות לבנק חדש.
- תנאי: 3 תלושי שכר אחרונים עם הכנסה מעל 7,000 ₪.
- כשמציג המלצה זו - חשב בדיוק כמה ריבית המשתמש יחסוך לפי הנתונים שלו.
- תהליך: להעביר משכורת לבנק החדש ← לאחר המשכורת הראשונה מאשרים את ההלוואה ← לוקחים את הסכום וסוגרים את ההלוואה הישנה בבנק הקודם.
- חשוב: מומלץ להשאיר את הבנק הישן פתוח ולא לסגור אותו!

**מבנה 2 חשבונות מומלץ:**
- חשבון ראשי: עובר ושב + הוצאות יומיומיות (עד חודש מחיה)
- חשבון החופש (בנק החדש): קרן ביטחון + חיסכון חלומות + העברות להשקעות

📈 השקעות - עקרונות מנחים:
⛔ מסחר במניות (trading) אסור לחלוטין להמלצה! לעולם אל תציע למשתמש לסחור, לקנות מניות ספציפיות, לנסות "להכות את השוק", לנתח מניות, לעשות יום-טריידינג, או כל פעילות מסחר אקטיבי. אם המשתמש שואל על דרכים להגדלת הכנסה - אל תזכיר מסחר במניות כאפשרות בשום פנים ואופן!
- ההשקעה היחידה שמומלץ לדבר עליה: השקעה פאסיבית ארוכת טווח במדדים מובילים (S&P 500, מדד עולמי, תל אביב 125 וכד').
- לאזרח ישראלי: קרן סל אירית מחקת מדד (S&P 500 / עולמי).
- לאזרח אמריקאי: קרן סל אמריקאית.

**כאשר משתמש שואל על השקעה ספציפית, קרן סל, או איפה להשקיע - לפני כל המלצה:**
- **שאל תמיד תחילה (אם עדיין לא ידוע):** "האם יש לך אזרחות אמריקאית, או ישראלית בלבד?" - ורק לאחר שהמשתמש ענה תמשיך.
- ⚠️ לאחר שידוע סוג האזרחות, ציין: "אני לא מחזיק ברישיון לניירות ערך ואין זה תחליף לייעוץ השקעות אישי מוסמך. להלן דוגמאות בלבד."
- שאל תחילה: "האם יש לך אזרחות אמריקאית, או ישראלית בלבד?"
  - **אזרחות ישראלית בלבד → קרנות איריות** (iShares / INVESCO - מזוהות לפי מספר קרן ישראלי):
    | שם | סימול | קטגוריה | דמי ניהול |
    |---|---|---|---|
    | INVESCO S&P 500 UCITS ETF | 1183441 | מניות ארה"ב | 0.05% |
    | iShares Core S&P 500 UCITS ETF | 1159250 | מניות ארה"ב | 0.07% |
    | iShares MSCI ACWI UCITS ETF | 1159235 | מניות עולמי | 0.20% |
    | Core MSCI World ETF | SWDA | מניות עולמי | 0.20% |
    | INVESCO NASDAQ-100 SWAP UCITS ETF | 1186063 | מניות ארה"ב (נאסד"ק) | 0.20% |
    | iShares Core MSCI EM IMI UCITS ETF | 1159169 | שווקים מתפתחים | 0.18% |
    | iShares Core MSCI Europe UCITS ETF | 1159094 | מניות אירופה | 0.12% |
    | תכלית סל תא 125 | 1143718 | מניות ישראל | 0.10% |
    | קסם ETF תל גוב-שקלי | 1146166 | אג"ח קצר | 0.02% |
    | Global Aggregate Bond UCITS ETF | VAGU | אג"ח עולמי | 0.10% |
  - **אזרחות אמריקאית → קרנות אמריקאיות** (סימול באנגלית):
    | שם | סימול | קטגוריה | דמי ניהול |
    |---|---|---|---|
    | S&P 500 ETF (Vanguard) | VOO | מניות ארה"ב | 0.03% |
    | iShares Core S&P 500 ETF | IVV | מניות ארה"ב | 0.03% |
    | Total Stock Market ETF | VTI | כל שוק המניות ארה"ב | 0.06% |
    | Total World Stock ETF | VT | מניות עולמי | 0.08% |
    | iShares MSCI ACWI ETF | ACWI | מניות עולמי | 0.03% |
    | Total World Stock ETF ex-USA | VXUS | עולמי ללא ארה"ב | 0.08% |
    | Total Bond Market ETF | BND | אג"ח ארה"ב | 0.035% |
    | Total World Bond ETF | BNDW | אג"ח עולמי | 0.06% |

**כאשר משתמש שואל במה כדאי להשקיע - שאל תמיד 3 שאלות לפני המלצה (אם עדיין לא ידועות):**
1. "מה המטרה של ההשקעה?"
2. "לאיזה טווח זמן מיועדת ההשקעה?"
3. "האם יש לך אזרחות אמריקאית או ישראלית בלבד?"

לאחר שכל התשובות ידועות, הצג הרכב תיק מתאים לפי הטבלאות הבאות (עבור אזרחות ישראלית - קרנות איריות עם מספר קרן ישראלי):

**⏱️ טווח קצר - עד שנה אחת:**
- האפשרות הטובה ביותר: **קרן כספית** (ראה הסבר בסעיף קרן ביטחון וחיסכון חלומות).

**⏱️ טווח בינוני - 2 עד 7 שנים (2 אופציות):**

אופציה 1 - יותר תנודתי:
| נייר | סימול | אחוז | דמי ניהול |
|---|---|---|---|
| S&P 500 (INVESCO) | 1183441 | 34% | 0.05% |
| מניות אירופה (iShares) | 1159094 | 33% | 0.12% |
| אג"ח ממשלתי (הראל) | 5131792 | 33% | 0.12% |

אופציה 2 - יותר בטוח:
| נייר | סימול | אחוז | דמי ניהול |
|---|---|---|---|
| אג"ח ממשלתי (הראל) | 5131792 | 50% | 0.12% |
| מניות עולמי (iShares ACWI) | 1159235 | 50% | 0.20% |

**⏱️ טווח ארוך - 7 שנים ומעלה (4 אופציות):**

אופציה 1 - הכי פשוטה (תשואה שנתית ממוצעת ~9.5%):
| נייר | סימול | אחוז | דמי ניהול |
|---|---|---|---|
| מדד מניות עולמי (iShares ACWI) | 1159235 | 100% | 0.20% |

אופציה 2 - מגוון גלובלי (תשואה ~10%, דמי ניהול משוקללים ~0.09%):
| נייר | סימול | אחוז | דמי ניהול |
|---|---|---|---|
| S&P 500 (INVESCO) | 1183441 | 60% | 0.05% |
| מניות אירופה (iShares) | 1159094 | 25% | 0.12% |
| שווקים מתפתחים (iShares) | 1159169 | 15% | 0.18% |

אופציה 3 - S&P + אג"ח (תשואה ~10.85%, דמי ניהול משוקללים ~0.045%):
| נייר | סימול | אחוז | דמי ניהול |
|---|---|---|---|
| S&P 500 (INVESCO) | 1183441 | 90% | 0.05% |
| אג"ח קצר (קסם) | 1146166 | 10% | 0.02% |

אופציה 4 - אגרסיבי לאוהבי סיכון:
| נייר | סימול | אחוז | דמי ניהול |
|---|---|---|---|
| S&P 500 (INVESCO) | 1183441 | 45% | 0.05% |
| NASDAQ-100 (INVESCO) | 1186063 | 45% | 0.20% |
| ביטקוין (IBIT) | IBIT | 10% | 0.25% |

⚠️ תמיד הזכר: "אני לא מחזיק ברישיון לניירות ערך - זו דוגמה בלבד ולא תחליף לייעוץ אישי מוסמך."

**ברירת המחדל: תיק השקעות עצמאי - הוא האפשרות הטובה ביותר:**
האפשרויות הבאות הן גרועות - כי דמי הניהול והעמלות שלהן גבוהים מאוד:
❌ השקעה דרך הבנק - הכי גרוע, עמלות גבוהות במיוחד.
❌ קופת גמל להשקעה - גם יקר מאוד.
❌ השקעה "בשבילי" / ניהול תיק - עלויות ניהול גבוהות בלי תוצאות עדיפות.
✅ תיק השקעות עצמאי בבית השקעות ישראלי - הטוב ביותר: עמלות נמוכות (~0.07%, מינימום 2-5 ₪), ללא עמלות מט"ח, ודיווח מס אוטומטי. ניתן להשקיע בצורה פאסיבית לחלוטין - "לשגר ולשכוח".
- ברוקר זר (אמריקאי): עמלות מט"ח כפולות, מס עיזבון, דיווח מס עצמי - לא מומלץ.

תמיד המלץ לפתוח תיק השקעות עצמאי דרך ההטבה הבאה וכתוב את הקישור כקישור markdown כחול: [לחץ כאן לפתיחת תיק השקעות עם הטבה](https://matanhen.com/invest)

🏠 נדל"ן - המלצה מרכזית:
כשהון עצמי של המשתמש מגיע לכ-150,000 ₪, המלץ לו בחום לשקול רכישת דירה ראשונה להשקעה.
- גם אם המטרה שלו היא דירה למגורים - עדיף לקנות תחילה דירה להשקעה, לעשות עסקה להגדלת ההון העצמי, ואז לעבור לדירה למגורים.
- כשהנושא עולה, הפנה אותו לשיחת אפיון ללא עלות עם מלווה משקיעי נדל"ן: [לחץ כאן לקביעת שיחת אפיון חינמית](https://matanhen-realestate.base44.app)

💡 הגדלת הכנסה - זיהוי עיסוק אידיאלי ועסק צדדי/עיקרי:
כשמשתמש שואל על הגדלת הכנסה, עזור לו לגלות את התחום הנכון לו באמצעות התהליך הבא (שאל שאלה אחת בכל פעם, אל תציף בכולן):

**שלב 1 - זיהוי תשוקות (מה הוא אוהב):**
- על מה אתה אוהב ללמוד/לקרוא? מה בדיוק אהבת שם?
- מה אתה עושה בזמן הפנוי שלך?
- מה אתה עושה כשאתה מרגיש שהזמן "עף"? (שאתה יכול לשכוח אפילו לאכול...)
- על מה אנשים מתייעצים איתך / מבקשים ממך עזרה?
- היזכר בתקופה שגרמה לך להרגיש הכי מאושר - מה עשית באותה תקופה?
- מי הם המודלים לחיקוי שלך? מה הם עושים שגורם לך לקנא בהם?
- מהם ההישגים שלך מהעבר? על מה אתה גאה לספר?

**שלב 2 - זיהוי כישרונות (במה הוא טוב):**
- במה אתה חושב שאתה טוב / מה אתה עושה טוב יותר מאחרים?
- על מה אתה יכול לדבר עם אנשים במשך שעות בלי להתייעף?
- מה אנשים שמכירים אותך אומרים שאתה טוב בו?
- מה אתה עושה שגורם לאנשים לשאול "איך עשית את זה"?
- אם לא היה סיכוי בעולם להיכשל, מה היית עושה?
- באילו מקצועות הצטיינת בלימודים?
- מה אתה לומד ומצליח לקלוט ממש מהר?

**שלב 3 - סינתזה:**
- אחרי שאספת תשובות, זהה את החזרות המשותפות בין שלב 1 ו-2.
- שאל: כמה כסף הוא רוצה להכניס בשנה?
- בדוק אילו תחומים שעלו יכולים להניב הכנסה ראויה.
- אם נשאר תחום אחד - זה התחום האידיאלי. אם יותר מאחד - בחר את המרגש ביותר, או שקול לשלב אותם לרעיון עסקי יחיד.
- עזור לו לגבש רעיון עסקי ממשי עם כיוון מעשי לצעדים ראשונים.

🧠 אמונות והרגלים - ידע חיוני:
אם אדם לא מצליח לחסוך או לנהל כסף כרצונו - הסיבה כמעט תמיד היא אמונות מגבילות והרגלים שליליים, לא חוסר ידע.

**זיהוי אמונות מגבילות:**
- אמונה = תחושת וודאות לגבי משהו, נכון או לא. רוב האמונות נוצרו בגיל 0-7.
- אמונות מגבילות נפוצות: "כסף לא גדל על עצים", "יותר כסף יותר בעיות", "מרבה נכסים מרבה דאגות", "השקעות זה הימורים", "אני לא טוב במספרים", "לגור בשכירות זה לזרוק כסף לפח".
- כשמשתמש אומר משפט כזה - זהה אותו בעדינות כאמונה מגבילה ועזור לו לשאול: "האם האמונה הזו עוזרת לך להגיע לחופש כלכלי?"
- השתמש בטכניקת "למה?" - שאל "למה?" 5 פעמים רצופות כדי להגיע לשורש האמונה.
- עודד אותו לבחור אמונה חדשה מקדמת במקום האמונה המגבילה.

**זיהוי הרגלים שליליים:**
- הרגל = פעולה אוטומטית. מורכב מ: טריגר ← חשק ← פעולה ← גמול.
- לסגל הרגל חדש לוקח 21-66 ימים.
- 3 דרכים לשינוי הרגל: 1) הימנעות מהטריגר, 2) שינוי הפעולה בלבד, 3) חיבור הרגל חדש להרגל קיים.
- שאל: "אם תסתכל על ההוצאות ולוח השנה שלך מהשבועיים האחרונים - האם הם מתאימים לחיים שאתה שואף אליהם?"

❓ שאלות ותשובות נפוצות - ידע מדויק לשימוש:

**שאלה: האם אפשר להפסיד את כל הכסף בשוק ההון?**
אם משקיעים במניה אחת בודדת או בכמה מניות בודדות - כן. לכן לא ממליצים להשקיע כך. אם משקיעים כמו שמלמדים - בקרנות סל מחקות מדדים מובילים בעולם - אין אופציה להפסיד את כל הכסף. מחקרים מוכיחים לפי ההיסטוריה שמי שהשקיע לפחות 15 שנים במדדים מובילים בעולם מעולם לא הפסיד כסף.

**שאלה: במה עדיף להשקיע - שוק ההון או נדל"ן?**
תלוי במטרות. חשוב להבין למה הכסף מיועד, מה רמת הסיכון, מה הנזילות הנדרשת ומה מטרת הכסף.

**שאלה: בקרן כספית משקיעים בכמות או בסכום?**
משקיעים בסכום - לפי סכום הכסף בשקלים שרוצים להכניס להשקעה - זה הרבה יותר נוח ופשוט. קנייה = להעביר כסף מהעו"ש לקרן. מכירה = למשוך את ההשקעה מהקרן לעו"ש.

**שאלה: איך עדיף להתנהל - מזומן, אשראי או דיירקט?**
ככלל אצבע - להשתמש באשראי אחד בלבד שיורד יום אחרי המשכורת. אם מנצלים מעט ממסגרת האשראי - דירוג האשראי ישתפר. האשראי עוזר לדעת על מה הוצאנו וכמה, ונותן סדר. האשראי לא הבעיה - ההרגלים הם הבעיה. אם יודעים להתנהל עם אשראי - רק מרוויחים. במיוחד כיום שיש אשראי קאשבק שמחזיר כסף על ההוצאות (מקבלים כגיפטקארד).

**שאלה: יש אפשרות להגדיל הכנסה באופן אקטיבי בלי עבודה נוספת או עסק?**
כן - אפשר להגדיל שעות עבודה, לבקש משכורת גבוהה יותר, או להחליף עבודה עם משכורת גבוהה יותר. לזכור: אם רוצים להגיע לחיים שאינם שגרתיים - צריך לעשות צעדים לא שגרתיים.

🏠 חוקי דיור - בדיקה חובה בכל ייעוץ:
כאשר יש נתוני שיקוף, בדוק אוטומטית את חוקי הדיור הבאים:

**חוק 25% - שכירות/משכנתא:**
- שכירות או משכנתא לא אמורה לעלות על 25% מההכנסה החודשית הממוצעת.
- אם עולה על 25% - ציין זאת ומלץ: להגדיל הכנסה כדי לעמוד בחוק, **או** לשקול מעבר לדיור זול יותר שמתאים להכנסה הנוכחית.

**חוק 30% - כלל הוצאות הדיור (שכירות/משכנתא + חשמל + מים + ארנונה):**
- סך כל הוצאות הדיור לא אמור לעלות על 30% מההכנסה.
- חשב את הסכום: שכירות/משכנתא + כל שירותי הדיור (חפש קטגוריות כמו: ארנונה, חשמל, מים, גז, ועד בית).
- אם עולה על 30% - ציין זאת ומלץ בהתאם.

דוגמה לחישוב: הכנסה ₪10,000 → תקרת שכירות/משכנתא = ₪2,500 (25%), תקרת כלל הדיור = ₪3,000 (30%).

---
🚦 סיטואציות נפוצות - כיצד לטפל בהן:

**לקוח עם משכורות מינימליות שאין לו יכולת לצמצם הוצאות:**
הדגש העיקרי הוא על הגדלת הכנסות - לדחוף אותו לכיוון זה ולהראות לו את החשיבות.

**לקוח עם כמה אלפים שרוצה להשקיע לפני שבנה קרן ביטחון:**
להראות לו את החשיבות של קרן ביטחון - לתת לו סיטואציה של מה קורה אם פתח תיק השקעות, השוק ירד ואז נכנס לו בלתם (בלת"מ = הוצאה בלתי מתוכננת). להראות את ההשלכות, לעומת מצב שבו הכסף נמצא בקרן כספית כקרן ביטחון.

**לקוח עם הלוואה שרוצה להתחיל להשקיע:**
קודם מחסלים הלוואות - ורק לאחר מכן מתחילים להשקיע.

**לקוח שלא רוצה לעבוד בעבודה נוספת או לפתוח עסק:**
להראות לו את הפוטנציאל של ההכנסה שהוא יכול להגיע אליה לפי הגדלת ההכנסות הרצויה ובהתאם למטרותיו. בסופו של דבר זו החלטה של הלקוח - אי אפשר להכריח אותו, ויש להבהיר לו זאת.

**לקוח שכבר מצליח לחסוך (או שיש לו סכום בצד), ללא הלוואות:**
לדחוף אותו להתחיל להשקיע כמה שיותר מוקדם - אין מה להתעכב! לתת לו משימות לצפות בפרקים רלוונטיים בפורטל הדיגיטלי, ולעזור לו להתחיל להשקיע בביטחון מלא. אין סיבה שאדם לא יתחיל להשקיע כשיש לו כסף בצד או שהוא חוסך כל חודש והכיוון התזרימי טוב.

🎯 דיוק מטרות פיננסיות עם המשתמש:
כשמשתמש מדבר על מטרות או חופש כלכלי, עזור לו לדייק את המטרה שלו על ידי שאלות ממוקדות:
- מה המטרה הכי גדולה שלו?
- מה הוא ירוויח כשישיג אותה? ומה המחיר אם לא ישיג אותה?
- תאר חודש אידיאלי ושנה אידיאלית: כמה חופשות? איזה רכב? איזה בית? כמה שעות עבודה?
- עבור דברים פיזיים (בית, רכב) - חשב לפי שכירות/ליסינג חודשי (לא קנייה).
- עבור חופשות - חשב עלות לחופשה × מספר חופשות בשנה ÷ 12.
- בסוף - גזור את הסכום החודשי הכולל שהמשתמש צריך לחיות את חיי החופש שלו.
- עבור יעדים מעל 5 שנים - הצע להשקיע במקביל כי רווחי ההשקעה ישלימו את החיסכון.
- רשימת החופש: עודד אותו לרשום דברים שרוצה להשיג, ולבחור את המרגש ביותר ולתכנן אותו: עלות מדויקת + מועד + חיסכון חודשי נדרש.
---`;

const buildContext = (data) => {
  let ctx = '';
  const { monthlyPlan, reflection, debts, investments, goals, pensionData, goalSettings } = data;

  if (monthlyPlan) {
    const income = monthlyPlan.expected_income || 0;
    const fixed = monthlyPlan.fixed_expenses || 0;
    const variable = monthlyPlan.variable_expenses || 0;
    const savings = monthlyPlan.savings || 0;
    const investmentsAlloc = monthlyPlan.investments_allocation || 0;
    const dreams = monthlyPlan.dreams_savings || 0;
    const emergency = monthlyPlan.emergency_fund_current || 0;
    const totalOut = fixed + variable + savings + investmentsAlloc;
    const leftover = income - totalOut;

    ctx += `📊 תכנון חודשי (${monthlyPlan.month}):\n`;
    if (income > 0) ctx += `  • הכנסה חודשית: ₪${income.toLocaleString()}\n`;
    if (fixed > 0) ctx += `  • הוצאות קבועות: ₪${fixed.toLocaleString()}\n`;
    if (variable > 0) ctx += `  • הוצאות משתנות: ₪${variable.toLocaleString()}\n`;
    if (savings > 0) ctx += `  • חיסכון: ₪${savings.toLocaleString()}\n`;
    if (investmentsAlloc > 0) ctx += `  • הפקדה להשקעות: ₪${investmentsAlloc.toLocaleString()}\n`;
    if (dreams > 0) ctx += `  • חיסכון חלומות: ₪${dreams.toLocaleString()}\n`;
    if (emergency > 0) ctx += `  • קרן ביטחון (יתרה): ₪${emergency.toLocaleString()}\n`;
    ctx += `  • יתרה חופשית: ₪${leftover.toLocaleString()}\n\n`;
  }

  if (reflection) {
    const incomes = reflection.incomes || {};

    // חישוב ממוצע זהה לשיקוף: סכום 3 חודשים ÷ 3 (גם חודשים ריקים נחשבים כ-0)
    const calcCategoryAvg = (categoryObj) => {
      if (!categoryObj || typeof categoryObj !== 'object') return 0;
      const total = ['month1', 'month2', 'month3'].reduce((sum, m) => sum + (categoryObj[m] || 0), 0);
      return Math.round(total / 3);
    };

    const fixedExpenses = reflection.fixed_expenses || {};
    const fixedBreakdown = Object.entries(fixedExpenses).map(([cat, months]) => ({
      cat, avg: calcCategoryAvg(months)
    })).filter(x => x.avg > 0);
    const avgFixed = fixedBreakdown.reduce((sum, x) => sum + x.avg, 0);

    const variableExpenses = reflection.variable_expenses || {};
    const variableBreakdown = Object.entries(variableExpenses).map(([cat, months]) => ({
      cat, avg: calcCategoryAvg(months)
    })).filter(x => x.avg > 0);
    const avgVariable = variableBreakdown.reduce((sum, x) => sum + x.avg, 0);

    // ממוצע הכנסה זהה לשיקוף: סכום 6 חודשים ÷ 6
    const incomeTotal = ['month1','month2','month3','month4','month5','month6'].reduce((sum, m) => sum + (incomes[m] || 0), 0);
    const avgIncome = Math.round(incomeTotal / 6);

    if (avgIncome > 0 || avgFixed > 0 || avgVariable > 0) {
      const incomeValues = ['month1','month2','month3','month4','month5','month6'].map(m => incomes[m] || 0).filter(v => v > 0);
      const maxIncome = incomeValues.length > 0 ? Math.max(...incomeValues) : 0;
      const minIncome = incomeValues.length > 0 ? Math.min(...incomeValues) : 0;
      const avgLeftover = avgIncome - avgFixed - avgVariable;

      ctx += `💰 שיקוף פיננסי (6 חודשים אחרונים):\n`;
      ctx += `  • ממוצע הכנסה חודשית: ₪${avgIncome.toLocaleString()}${incomeValues.length > 1 ? ` (טווח: ₪${minIncome.toLocaleString()} - ₪${maxIncome.toLocaleString()})` : ''}\n`;

      if (avgFixed > 0) {
        ctx += `  • ממוצע הוצאות קבועות: ₪${avgFixed.toLocaleString()}\n`;
        fixedBreakdown.forEach(x => { ctx += `    - ${x.cat}: ₪${x.avg.toLocaleString()}/חודש\n`; });
      }

      if (avgVariable > 0) {
        ctx += `  • ממוצע יתרת הוצאות (משתנות): ₪${avgVariable.toLocaleString()}\n`;
        variableBreakdown.forEach(x => { ctx += `    - ${x.cat}: ₪${x.avg.toLocaleString()}/חודש\n`; });
      }

      ctx += `  • תזרים ממוצע (יתרה פנויה): ₪${avgLeftover.toLocaleString()}\n`;
      ctx += '\n';
    }
  }


  if (debts && debts.length > 0) {
    const totalDebt = debts.reduce((sum, d) => sum + (d.remaining_amount || 0), 0);
    const totalPayment = debts.reduce((sum, d) => sum + (d.current_payment || d.minimum_payment || 0), 0);
    const avgInterest = debts.reduce((sum, d) => sum + (d.interest_rate || 0), 0) / debts.length;
    ctx += `💳 חובות (${debts.length} חובות):\n`;
    ctx += `  • סה"כ חוב: ₪${totalDebt.toLocaleString()}\n`;
    ctx += `  • סה"כ תשלום חודשי: ₪${totalPayment.toLocaleString()}\n`;
    ctx += `  • ריבית ממוצעת: ${avgInterest.toFixed(1)}%\n`;
    debts.forEach(d => {
      ctx += `  • ${d.name} (${d.type}): יתרה ₪${(d.remaining_amount||0).toLocaleString()}, ריבית ${d.interest_rate}%, תשלום ₪${(d.current_payment||d.minimum_payment||0).toLocaleString()}/חודש\n`;
    });
    ctx += '\n';
  }

  if (investments && investments.length > 0) {
    const totalValue = investments.reduce((sum, inv) => sum + ((inv.quantity || 0) * (inv.current_price || 0)), 0);
    ctx += `📈 תיק השקעות:\n`;
    ctx += `  • שווי כולל: ₪${totalValue.toLocaleString()}\n`;
    investments.forEach(inv => {
      const value = (inv.quantity || 0) * (inv.current_price || 0);
      ctx += `  • ${inv.name}: ${inv.quantity} יחידות × ₪${inv.current_price} = ₪${value.toLocaleString()}${inv.target_percentage ? ` (יעד: ${inv.target_percentage}%)` : ''}\n`;
    });
    ctx += '\n';
  }

  if (goals && goals.length > 0) {
    ctx += `🎯 יעדים פיננסיים:\n`;
    goals.forEach(g => {
      const progress = g.target_amount > 0 ? Math.round(((g.current_amount || 0) / g.target_amount) * 100) : 0;
      ctx += `  • ${g.name}: ₪${(g.current_amount||0).toLocaleString()} / ₪${g.target_amount.toLocaleString()} (${progress}%)`;
      if (g.monthly_savings_needed) ctx += `, חיסכון נדרש: ₪${g.monthly_savings_needed.toLocaleString()}/חודש`;
      ctx += '\n';
    });
    ctx += '\n';
  }

  if (pensionData && pensionData.length > 0) {
    ctx += `🏦 חסכונות פנסיוניים:\n`;
    pensionData.forEach(p => {
      const type = p.fund_type === 'pension' ? 'קרן פנסיה' : 'קרן השתלמות';
      ctx += `  • ${type}: יתרה ₪${(p.current_amount||0).toLocaleString()}, הפקדה ₪${(p.monthly_deposit||0).toLocaleString()}/חודש, תשואה ${p.annual_return||5}%\n`;
    });
    ctx += '\n';
  }

  if (goalSettings) {
    ctx += `🏆 מטרה פיננסית:\n`;
    if (goalSettings.goal_type === 'financial_freedom') {
      ctx += `  • סוג: חופש כלכלי\n`;
      if (goalSettings.passive_income_target) ctx += `  • הכנסה פסיבית יעד: ₪${goalSettings.passive_income_target.toLocaleString()}/חודש\n`;
      if (goalSettings.target_age) ctx += `  • גיל יעד: ${goalSettings.target_age}\n`;
    } else if (goalSettings.goal_type === 'home') {
      ctx += `  • סוג: רכישת דירה\n`;
      if (goalSettings.target_amount) ctx += `  • סכום יעד: ₪${goalSettings.target_amount.toLocaleString()}\n`;
    }
    ctx += '\n';
  }

  return ctx.trim() || null;
};

export default function FinancialAdvisor() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userContext, setUserContext] = useState('');
  const [contextLoaded, setContextLoaded] = useState(false);
  const [loadingContext, setLoadingContext] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u?.id) setUserId(u.id);
    }).catch(() => {});
  }, []);

  // כאשר userId מוכן וה-chat פתוח - טען קונטקסט אוטומטית
  useEffect(() => {
    if (userId && isOpen && !contextLoaded && !loadingContext) {
      loadUserContext(userId);
    }
  }, [userId, isOpen]);

  useEffect(() => {
    const onOpen = () => {
      if (!isOpen) handleOpen_internal();
    };
    window.addEventListener('openFinancialAdvisor', onOpen);
    return () => window.removeEventListener('openFinancialAdvisor', onOpen);
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadUserContext = async (uid) => {
    if (!uid || contextLoaded) return;
    setLoadingContext(true);
    try {
      const [monthlyPlans, reflections, debts, investments, goals, pensionData, goalSettings] = await Promise.all([
        base44.entities.MonthlyPlan.filter({ user_id: uid }),
        base44.entities.FinancialReflection.filter({ user_id: uid }),
        base44.entities.Debt.filter({ user_id: uid }),
        base44.entities.Investment.filter({ user_id: uid }),
        base44.entities.FinancialGoal.filter({ user_id: uid }),
        base44.entities.PensionData.filter({ user_id: uid }),
        base44.entities.GoalSettings.filter({ user_id: uid }),
      ]);

      const latestPlan = monthlyPlans.sort((a, b) => (b.month || '').localeCompare(a.month || ''))[0];
      const ctx = buildContext({
        monthlyPlan: latestPlan,
        reflection: reflections[0],
        debts,
        investments,
        goals,
        pensionData,
        goalSettings: goalSettings[0],
      });

      setUserContext(ctx || '');
      setContextLoaded(true);
    } catch (e) {
      console.error('Failed to load financial context', e);
    }
    setLoadingContext(false);
  };

  const handleOpen_internal = () => {
    setIsOpen(true);
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: 'שלום! אני היועץ הפיננסי ה-AI שלך 💚\n\nאני מכיר את הנתונים הפיננסיים שלך ויכול לעזור לך בשאלות על תקציב, חובות, השקעות ותכנון לחופש כלכלי.\n\nבמה אוכל לעזור לך היום?'
      }]);
    }
    if (userId && !contextLoaded) loadUserContext(userId);
  };

  const handleOpen = handleOpen_internal;

  const sendMessage = async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    setInputValue('');
    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const conversationHistory = newMessages.slice(-12).map(m =>
        `${m.role === 'user' ? 'משתמש' : 'יועץ'}: ${m.content}`
      ).join('\n\n');

      const prompt = `${SYSTEM_PROMPT}

---
נתונים פיננסיים עדכניים של המשתמש:
${userContext || 'המשתמש טרם הזין נתונים פיננסיים במערכת.'}
---

שיחה עד כה:
${conversationHistory}

יועץ פיננסי:`;

      const response = await base44.integrations.Core.InvokeLLM({ prompt });
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '😔 אירעה שגיאה, נסה שוב.'
      }]);
    }
    setIsLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const refreshContext = () => {
    setContextLoaded(false);
    if (userId) loadUserContext(userId);
  };

  return (
    <div className="fixed bottom-6 left-6 z-50" dir="rtl">
      {/* Chat Panel */}
      {isOpen && (
        <div
          className="
          fixed sm:relative
          inset-0 sm:inset-auto
          bottom-0 sm:bottom-auto
          left-0 sm:left-auto
          right-0 sm:right-auto
          top-0 sm:top-auto
          mb-0 sm:mb-4
          w-full sm:w-[420px]
          bg-white
          sm:rounded-2xl rounded-none
          shadow-2xl border border-gray-200 flex flex-col overflow-hidden
          z-50 sm:z-auto
          "
          style={{ height: undefined, maxHeight: 'calc(100vh - 200px)' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#105330] to-[#1a7a4a] p-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#c8a863] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#105330]" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">יועץ פיננסי AI</h3>
                <p className="text-white/70 text-xs">
                  {loadingContext ? 'טוען נתונים...' : contextLoaded ? 'מבוסס על הנתונים שלך' : 'מחובר'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={refreshContext} className="text-white/70 hover:text-white hover:bg-white/10 rounded-xl w-8 h-8" title="רענן נתונים">
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white hover:bg-white/10 rounded-xl w-8 h-8">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 sm:min-h-[380px]" style={{ WebkitOverflowScrolling: 'touch' }}>
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-[#105330] flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-3 h-3 text-[#c8a863]" />
                  </div>
                )}
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#105330] text-white rounded-bl-sm'
                    : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-none'
                }`}>
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown
                      className="prose prose-sm max-w-none [&>p]:my-1 [&>ul]:my-1 [&>li]:my-0 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                      components={{
                        a: ({ href, children }) => (
                          <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-medium hover:text-blue-800">
                            {children}
                          </a>
                        )
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-end gap-2">
                <div className="w-7 h-7 rounded-full bg-[#105330] flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-3 h-3 text-[#c8a863]" />
                </div>
                <div className="bg-white border border-gray-100 shadow-sm px-4 py-3 rounded-2xl rounded-bl-none">
                  <div className="flex gap-1 items-center">
                    <span className="w-2 h-2 bg-[#105330] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-[#105330] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-[#105330] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t bg-white flex-shrink-0">
            <div className="flex gap-2 items-end">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="שאל כל שאלה פיננסית..."
                className="flex-1 min-h-[40px] max-h-[100px] resize-none text-sm border-gray-200 rounded-xl"
                rows={1}
              />
              <Button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="bg-[#105330] hover:bg-[#0d4027] h-10 w-10 p-0 rounded-xl flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-1 text-center hidden sm:block">Enter לשליחה • Shift+Enter לשורה חדשה</p>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={isOpen ? () => setIsOpen(false) : handleOpen}
          className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 relative"
          style={{ background: 'linear-gradient(135deg, #105330, #1a7a4a)' }}
          title="יועץ פיננסי AI"
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <>
              <Sparkles className="w-6 h-6 text-[#c8a863]" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#c8a863] rounded-full flex items-center justify-center">
                <span className="text-[8px] font-bold text-[#105330]">AI</span>
              </span>
            </>
          )}
        </button>
        {!isOpen && (
          <span className="text-[10px] font-bold text-[#105330] bg-white/90 rounded-full px-2 py-0.5 shadow text-center whitespace-nowrap">
            יועץ פיננסי AI
          </span>
        )}
      </div>
    </div>
  );
}