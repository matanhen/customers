import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp, Save, CheckCircle2, Pencil } from 'lucide-react';
import WorkbookEditor from './WorkbookEditor';

const ADMIN_EMAIL = 'matanhen.finance@gmail.com';

const DEFAULT_SECTIONS = [
  {
    section_key: 'intro',
    title: 'לפני שנצא לדרך...',
    order: 1,
    content: `הנה האמת הכואבת: לא כולם הולכים להתעשר בזכות החוברת הזו או בזכות תהליך כזה או אחר. ולא בגלל שאין כאן מספיק ידע וכלים לגרום לך להגיע לשם, אלא כי זו אמת. לא כולם הולכים ליישם כאן את הכל ולכן לא כולם יממשו את הפוטנציאל של החוברת הזו...

במה זה כן תלוי? בדבר אחד מרכזי: באיך שאתה מסתכל על הדברים. אני אסביר, ב-NLP קוראים לזה מפה (תפיסת העולם שלך). המפה היא הדרך שבה אתה רואה את המציאות (השטח). המציאות היא מה שקורה בפועל בשטח אבל בגלל שיש לנו פילטרים (אמונות, דעות, רצונות, מחשבות) לכל אחד מאיתנו יש מפה שונה בראש וכל אחד מסתכל על הדברים בצורה אחרת.

כאן אפשר לראות שלכל אחד יש את המפה שלו, אבל מה שקורה בשטח לא באמת שונה. הם פשוט מסתכלים על השטח מזווית אחרת ומקבלים את המציאות כפי שהם חושבים לנכון.

יש רמות שונות של תודעה, כמו שהבן אדם בקומה 3 בבניין לא יכול לראות את הנוף שהבן אדם בקומה ה-50 רואה. אם אתה תהיה מרוכז תמיד באיך להתלונן על יוקר המחיה (מפה), אתה תחפש סיבות למה חרא פה במדינה. אם תהיה מרוכז באיך להצליח למרות יוקר המחיה (מפה) פתאום יופיעו לך מול העיניים המון הזדמנויות.

אני כאן כדי לשנות את המפה שלך ולגרום לך לחשוב כמו שצריך לחשוב כדי להשיג את התוצאות שאתה רוצה להשיג, ואתה כאן בשביל ליישם. קח אחריות, אף אחד לא יעשה את זה בשבילך.

עקרונות להתנהלות כלכלית נכונה – השלבים לפי סדר:
1. הכנסה אקטיבית
2. חיסכון אוטומטי (הוראת קבע)
3. השקעות
4. להשקיע בחזרה את הרווחים של ההשקעות (הכנסות פסיביות)
5. להוציא לאחר מכן את מה שנשאר`,
    questions: [
      { key: 'principles_follow', label: 'האם כיום אתה פועל לפי הסדר של כל העקרונות? כן או לא?', type: 'text' },
      { key: 'principles_missing', label: 'אם לא – מה אתה לא עושה?', type: 'textarea' },
    ]
  },
  {
    section_key: 'freedom_circle',
    title: 'מעגל החופש',
    order: 2,
    content: `מעגל החופש שלי מורכב מ-4 חלקים:
• לחשוב – חשיבה, אמונות והרגלים מקדמים ולא מעכבים
• לנהל – לנהל את הכסף בצורה מושלמת ולחסוך את המקסימום האפשרי
• להרוויח – להרוויח הרבה, אקטיבית בשכר גבוה לשעה
• למנף – לייצר מהכסף יותר כסף בעזרת השקעות והכנסות פסיביות לעבר חופש כלכלי

דרג את הציונים שלך בכל אחד ממרכיבי מעגל החופש: מ-1 (לא טוב) עד 10 (מושלם!)`,
    questions: [
      { key: 'score_think', label: 'לחשוב (ציון החשיבה, האמונות וההרגלים הכלכליים שלך) מ-1 עד 10', type: 'rating' },
      { key: 'score_manage', label: 'לנהל (ציון ניהול הכסף שלך) מ-1 עד 10', type: 'rating' },
      { key: 'score_earn', label: 'להרוויח (ציון לפי סכום הכסף שאתה מרוויח ביחס לכמה שאתה שואף) מ-1 עד 10', type: 'rating' },
      { key: 'score_leverage', label: 'למנף (ציון היכולת והידע שלך להשקיע כסף) מ-1 עד 10', type: 'rating' },
    ]
  },
  {
    section_key: 'goals',
    title: 'הגדרת מטרות כלכליות',
    order: 3,
    content: `הרבה אנשים יודעים בעיקר מה הם לא רוצים. הם לא רוצים לדאוג מכסף, הם לא רוצים להיות במינוס, הם לא רוצים להיות עניים...
אבל השאלה האמיתית היא מה הם כן רוצים? רוב האנשים יענו תשובה של "יותר כסף" או "חופש כלכלי" בלי להבין בכלל מה המשמעות של זה...`,
    questions: [
      { key: 'biggest_goal', label: 'מהי המטרה הכי גדולה שלי?', type: 'textarea' },
      { key: 'goal_reward', label: 'מה אני אוכל להרוויח כשאני אשיג את המטרה שלי?', type: 'textarea' },
      { key: 'goal_price', label: 'מה המחיר שאשלם אם לא אשיג את המטרה שלי לעולם?', type: 'textarea' },
      { key: 'goal_why', label: 'למה כל כך חשוב לי להשיג את המטרה שלי? (להעמיק)', type: 'textarea' },
      { key: 'freedom_life_description', label: 'תאר את חיי החופש הכלכלי שלך בהנחה שכסף לא בעיה עבורך (תיאור חודש אידיאלי ושנה אידיאלית, על מה אתה רוצה להוציא כסף, כמה שעות תעבוד, איפה תעבוד...)', type: 'textarea' },
      { key: 'freedom_monthly_amount', label: 'מהו הסכום החודשי שלך כדי לחיות את חיי החופש שלך?', type: 'text' },
      { key: 'not_done_last_3_years', label: 'מה היית רוצה לעשות עם הכסף שלך לפי חיי החופש, אבל לא עשית אותו בשלוש השנים האחרונות?', type: 'textarea' },
      { key: 'what_to_change', label: 'מה יידרש כדי לשנות את זה?', type: 'textarea' },
      { key: 'no_longer_doing', label: 'תשלים: בחופש הכלכלי שלי אני כבר לא... (מה שאתה עושה היום ותפסיק לעשות)', type: 'textarea' },
      { key: 'freedom_list', label: 'בנה את "רשימת החופש" – דברים שאתה רוצה להשיג ולהגשים (יעדים לטיול, דברים לקנות, אירועים, אנשים לפגוש...)', type: 'textarea' },
      { key: 'goal_plan_detail', label: 'תכנית פעולה ליעד: פירוט יעד', type: 'textarea' },
      { key: 'goal_plan_cost', label: 'עלות היעד', type: 'text' },
      { key: 'goal_plan_time', label: 'זמן להגשמת היעד', type: 'text' },
      { key: 'love_to_spend_on', label: 'מה הם הדברים המובילים שאתה אוהב לבזבז עליהם את הכסף שלך? (דברים שגורמים לך לכיף ואושר)', type: 'textarea' },
      { key: 'buy_time', label: 'מהן שלוש הדרכים שבהן תוכל "לקנות זמן" (לדוגמא: לשלם למנקה כדי לחסוך זמן ניקיון)?', type: 'textarea' },
      { key: 'dream_vacation', label: 'תאר את חופשת החלומות שלך – איפה זה יהיה? מי יהיה שם איתך? איזה זיכרונות היית אוסף?', type: 'textarea' },
    ]
  },
  {
    section_key: 'beliefs',
    title: 'אמונות',
    order: 4,
    content: `מהי אמונה?
תחושת וודאות בנוגע למשהו בחיינו, בין אם זה נכון ובין אם לא.

רוב האמונות שלנו נמצאות בתת המודע והתגבשו מהרגע שנולדנו.

2 סוגים עיקריים של אמונות:
• אמונה מקדמת – אמונה שמקדמת ומעצימה את האדם. לדוגמא: "אני אחראי על החיים שלי ואני יכול להצליח כלכלית בישראל למרות יוקר המחיה"
• אמונה מגבילה – אמונה שמגבילה את האדם מלהשיג את המטרות שלו. לדוגמא: "רק הממשלה יכולה להציל אותי ולעזור לי מבחינה כלכלית ולי אין יכולת בלעדיהם"

איך אמונות נוצרות?
כשתינוק נולד, הוא כמו דף לבן וחלק. הוא נחשף לעולם והסביבה שלו מלמדת אותו ונותנת לו מידע על העולם ועליו. תת המודע זוכר הכל ומתאחסן בתוכו המון מידע ואמונות שנוצרו לנו בעיקר בילדות בגילאי 0-7.

כדי לזהות אמונות אצלנו ואצל אנשים אחרים – בדרך כלל זה יהיה בתוך משפט של "אם.. אז" או: "X = Y"
לדוגמה: "אם יהיו לי הרבה נכסים אז יהיו לי הרבה דאגות" / "כל הגברים בוגדים"

אמונות נפוצות (בדוק באילו אתה מאמין):
• "כסף לא גדל על העצים"
• "יותר כסף יעשה אותי אדם רע יותר"
• "יותר כסף, יותר בעיות / מרבה נכסים מרבה דאגות"
• "השקעות זה הימורים / השקעות זה מפחיד"
• "לגור בשכירות זה לזרוק כסף לפח, עדיף לקנות בית ולגור בו"
• "אני לא טוב במספרים ובכסף"
• "לפתוח עסק זה מסוכן"`,
    questions: [
      { key: 'childhood_money_phrases', label: 'קח כמה דקות כדי לרשום את כל המשפטים ששמעת בילדות שלך על כסף (מההורים, החברים, המורים)', type: 'textarea' },
      { key: 'money_is', label: 'כסף הוא ___', type: 'text' },
      { key: 'parents_money', label: 'ההורים שלי חושבים שכסף הוא ___', type: 'text' },
      { key: 'friends_money', label: 'חברים שלי חושבים שכסף הוא ___', type: 'text' },
      { key: 'rich_are', label: 'אנשים עשירים הם ___', type: 'text' },
      { key: 'parents_rich', label: 'ההורים שלי חושבים שעשירים הם ___', type: 'text' },
      { key: 'friends_rich', label: 'חברים שלי חושבים שעשירים הם ___', type: 'text' },
      { key: 'became_rich_because', label: 'אנשים עשירים הפכו לעשירים כי ___', type: 'text' },
      { key: 'parents_became_rich', label: 'ההורים שלי חושבים שעשירים הפכו לעשירים כי ___', type: 'text' },
      { key: 'friends_became_rich', label: 'חברים שלי חושבים שעשירים הפכו לעשירים כי ___', type: 'text' },
      { key: 'money_turns_to', label: 'הרבה כסף הופך אנשים ל ___', type: 'text' },
      { key: 'to_be_rich_need', label: 'כדי להיות עשיר אני צריך ___', type: 'text' },
      { key: 'if_earn_a_lot', label: 'אם ארוויח הרבה אז ___', type: 'text' },
      { key: 'if_many_assets', label: 'אם יהיו לי הרבה נכסים אז ___', type: 'text' },
      { key: 'common_beliefs_i_have', label: 'מבין האמונות הנפוצות שברשימה למעלה, באילו אתה מאמין או שמעת מהסביבה שלך?', type: 'textarea' },
      { key: 'family_money_phrases', label: 'איזה משפטים שמעת על כסף מהמשפחה שלך?', type: 'textarea' },
      { key: 'guilt_spending', label: 'על מה אתה מרגיש אשם כשאתה מוציא כסף? ולמה?', type: 'textarea' },
      { key: 'important_to_me', label: 'מאיזה מהבאים אתה רוצה יותר? (כמה טיסות לחו"ל בשנה / להרוויח 50,000 ₪ בחודש / לחיות לפי התשוקות / לתת לילדים יותר ממה שהיה לי) ומהי התוכנית שלך להשיג זאת?', type: 'textarea' },
      { key: 'if_people_knew_income', label: 'אם אנשים ידעו כמה אתה מרוויח, איך תרגיש?', type: 'textarea' },
      { key: 'lessons_for_kids', label: 'אילו חמישה שיעורים על כסף היית רוצה לתת לילדים שלך?', type: 'textarea' },
      { key: 'kids_watching', label: 'אם הילדים שלך היו צופים בך, האם הם היו מגלים שאתה מבצע את השיעורים האלה?', type: 'text' },
      { key: 'money_feeling', label: 'כשאני חושב על הכסף שלי אני מרגיש ___', type: 'text' },
      { key: 'want_to_feel', label: 'לעומת זאת אני רוצה להרגיש ___', type: 'text' },
      { key: 'one_action_this_week', label: 'כדי להרגיש כך, הפעולה האחת שאני צריך לעשות השבוע היא ___', type: 'text' },
      { key: 'believe_10x', label: 'רשום סכום כפול 10 ממה שאתה מרוויח – האם אתה מאמין בכל ליבך שאפשרי עבורך להרוויח סכום כזה? כן או לא?', type: 'text' },
      { key: 'limiting_beliefs', label: 'רשום כאן את כל האמונות שמונעות ממך להיות חופשי כלכלית', type: 'textarea' },
      { key: 'belief_true_for_all', label: 'לגבי האמונות המגבילות שרשמת – האם האמונה נכונה לגבי כולם?', type: 'textarea' },
      { key: 'who_gave_belief', label: 'האם האדם שלקחת ממנו את האמונה הזו הוא אדם שאתה רוצה להיות כמוהו?', type: 'textarea' },
      { key: 'who_without_belief', label: 'מי תהיה בלי האמונה הזו?', type: 'textarea' },
      { key: 'belief_store', label: 'אם היית נכנס ל"חנות אמונות" ויכול לבחור שם כל אמונה שתרצה – היית בוחר את האמונה הזו?', type: 'text' },
      { key: 'new_belief', label: 'מהי האמונה החדשה שלי?', type: 'textarea' },
      { key: 'if_no_money_or_opinions', label: 'אם כסף או דעות של אחרים לא ישפיעו עליך, מה תעשה אחרת בחיים שלך?', type: 'textarea' },
      { key: 'last_day_letter', label: 'כתוב מכתב על החיים שהיו לך, כאילו עכשיו זה יומך האחרון. כתוב על החוויות שצברת, תפרט על הדברים שאתה מתחרט שלא עשית...', type: 'textarea' },
      { key: 'do_differently', label: 'חדשות טובות – אתה בחיים! כדי שהמכתב לא יתגשם, מה אתה מתכנן לעשות אחרת ממה שעשית עד היום?', type: 'textarea' },
    ]
  },
  {
    section_key: 'habits',
    title: 'הרגלים',
    order: 5,
    content: `"כל שינוי קשה בהתחלה, מסובך באמצע, ונהדר בסופו!"
כמו אמונות, לכולנו יש הרגלים מקדמים, והרגלים מעכבים.

50% מהפעולות שלנו ביום יום הן הרגלים.
הרגל – פעולה שאנחנו עושים מבלי לחשוב עליה, עושים באופן אוטומטי. לסגל הרגל חדש לוקח בין 21–66 ימים.

הרגל מורכב מ-4 חלקים:
טריגר → חשק → פעולה → גמול

דוגמה: ראיתי קופסת סיגריות → בא לי סיגריה → מעשן → תחושה של רוגע

יש כמה דרכים להיפטר מהרגלים:
• דרך 1 – הימנעות מהטריגר
• דרך 2 – שינוי הפעולה (הטריגר, החשק והגמול יישארו זהים)
• דרך 3 – חיבור להרגל קיים (לקשור הרגל חדש להרגל קיים)

אם תראו לי את לוח השנה שלכם ואת ההוצאות שלכם אני אראה לכם את סדר העדיפויות שלכם.`,
    questions: [
      { key: 'negative_habits', label: 'רשום את ההרגלים השליליים שתרצה לשנות', type: 'textarea' },
      { key: 'why_negative', label: 'מדוע הרגלים אלו שליליים?', type: 'textarea' },
      { key: 'why_change', label: 'למה אני רוצה לשנות את ההרגלים האלו?', type: 'textarea' },
      { key: 'price_if_not_change', label: 'במידה ולא אשנה את ההרגלים האלו, איך זה ישפיע על חיי? איזה מחירים אשלם?', type: 'textarea' },
      { key: 'future_with_habit', label: 'איך העתיד שלי יראה במידה ואמשיך בהרגל הזה?', type: 'textarea' },
      { key: 'feel_if_change', label: 'איך ארגיש במידה ואשנה את ההרגל הזה?', type: 'textarea' },
      { key: 'habit_change_impact', label: 'כאשר ההרגל ישתנה, איך זה ישפיע על העתיד שלי?', type: 'textarea' },
      { key: 'who_without_habits', label: 'איזה בן אדם אני אהיה בלי ההרגלים האלו?', type: 'textarea' },
      { key: 'happiness_increase', label: 'בכמה רמות האושר והסיפוק העצמי שלי יעלו כתוצאה משינוי ההרגלים האלו?', type: 'textarea' },
      { key: 'freedom_stages', label: '5 השלבים לחופש כלכלי: באיזה שלב אתה נמצא היום? (גירעון/איזון/שליטה/ביטחון/חופש)', type: 'text' },
      { key: 'next_stage', label: 'מהו השלב הבא שלך?', type: 'text' },
      { key: 'focus_for_next_stage', label: 'באיזה דברים אתה צריך להתמקד כדי להגיע לשלב הבא?', type: 'textarea' },
      { key: 'actions_for_next_stage', label: 'איזה פעולות אתה צריך לעשות כדי להגיע לשלב הבא?', type: 'textarea' },
    ]
  },
  {
    section_key: 'matan_laws',
    title: 'חוקי הכסף של מתן',
    order: 6,
    content: `1. לא להוציא על מגורים יותר מ-25% מההכנסה
2. לא להוציא יותר מ-50% מההכנסה (חיסכון מינימלי של 50%)
3. לקנות דירה להשקעה ולא למגורים
4. לנהל את הכסף ע"פ תקציב
5. להעלות רמת חיים באופן משמעותי רק לאחר שיש נכס
6. חוק 70/30 בהגדלת הכנסות
7. להוציא בלי רגשות אשם על הדברים שאוהבים, ולקצץ ללא רחמים על הדברים שלא אוהבים
8. להתמקד בכסף הגדול ולא בכסף הקטן
9. יש גבול לכמה אפשר לצמצם, אין גבול לכמה אפשר להרוויח
10. להפוך את ניהול הכסף לאוטומטי

"תתחילו להתמקד בהוצאות הגדולות ולא בהוצאות הקטנות. רוב האנשים מתקדמים בכסף הקטן – לחסוך 10 ₪ על קפה. התחומים שחשוב להתמקד: לא לקחת חובות רעים, לרכוש נכסים ולא התחייבויות."`,
    questions: [
      { key: 'laws_already_using', label: 'האם אתה משתמש כבר באחד מחוקי הכסף שלי? אם כן, למה?', type: 'textarea' },
      { key: 'laws_disagree', label: 'עם מה מתוך חוקי הכסף אתה לא מסכים? למה?', type: 'textarea' },
      { key: 'favorite_law', label: 'תבחר את החוק המועדף ותאר איך תתחיל ליישם אותו בחייך. איך החיים שלך ישתנו?', type: 'textarea' },
      { key: 'expensive_happy_memory', label: 'זכור את הפעם האחרונה שהוצאת על משהו מעל 3,000 ₪ ונהנית מזה. איך זה היה מרגיש אם היית עושה את זה באופן קבוע?', type: 'textarea' },
      { key: 'small_money_focus', label: 'רשום התמקדות בכסף קטן שהיה לך מהשבוע האחרון', type: 'textarea' },
      { key: 'small_money_stop', label: 'מהי ההתמקדות בכסף הקטן שתפסיק לדאוג לגביה מעכשיו?', type: 'text' },
      { key: 'big_money_focus', label: 'מהו המיקוד שלך החל מהיום (כסף גדול)?', type: 'textarea' },
      { key: 'good_for_10_years', label: 'מה הדבר שאתה הולך לעשות השבוע שישתלם לך בעוד 10 שנים?', type: 'textarea' },
      { key: 'do_later_do_now', label: 'רשום את הדברים שאתה רוצה לעשות מתישהו, אולי אפילו מחכה לפנסיה בשביל זה. איזה מהדברים אתה יכול לעשות כבר היום?', type: 'textarea' },
      { key: 'not_part_of_rich_life', label: 'תבחר שלושה תחומים שאתה מוציא עליהם היום כסף, אבל הם לא חלק מחיי העושר שלך', type: 'textarea' },
      { key: 'why_spend_not_important', label: 'למה אתה חושב שאתה מוציא על זה אם זה לא באמת חשוב לך?', type: 'textarea' },
      { key: '500_for_memory', label: 'אם אתה יכול להוציא 500 ₪ כמה פעמים בשנה כדי ליצור זיכרון מדהים, מה היית עושה?', type: 'textarea' },
      { key: 'happy_without_money', label: 'תחשוב על תקופה שהיית ממש מאושר. היית צריך בשביל זה כסף? איפה היית? מה עשית?', type: 'textarea' },
      { key: 'what_makes_happy', label: 'מה משמח אותך היום ועושה אותך מאושר? תרשום כל דבר שעולה לך', type: 'textarea' },
      { key: 'best_vacation', label: 'מה הייתה החופשה הכי טובה שלך? תחשוב ותרשום מה גרם לזה להרגיש ככה', type: 'textarea' },
      { key: 'failure_expectation', label: 'ציפייה לכישלון: אם יהיו אתגרים בדרך להגדלת החיסכון (למשל חבר שמזמין לצאת לאכול כשהגעת לתקרת התקציב) – איך תגיב?', type: 'textarea' },
    ]
  },
  {
    section_key: 'manage',
    title: 'לנהל',
    order: 7,
    content: `שיקוף מצב נוכחי (בעזרת קובץ האקסל)

זוהי נקודת המוצא שלנו. כדי להתחיל לצעוד לעבר המטרות אנחנו חייבים לדעת קודם כל איפה אנחנו נמצאים. בדיוק כמו שעולים על רכב, הוויז מזהה איפה אנחנו נמצאים, אנחנו שמים יעד והוויז מראה לנו את הדרך הכי טובה.

הנתונים ההכרחיים לשיקוף:
• הכנסות – 6 תלושי משכורת
• הוצאות – 3 חודשים אחרונים פירוטי אשראי + פירוטי עובר ושב
• התחייבויות – פירוטים על הלוואות, מינוסים (אפשר להיעזר בת.ז בנקאית)
• נכסים – נכסים נזילים ולא נזילים (מזומנים, נדל"ן, שוק ההון...)

על כל הוצאה שהייתה לנו בנפרד, אנחנו נשאל:
1. האם ההוצאה חיונית ברמה שאם לא הייתי מוציא אותה לא אשרוד את החודש?
2. עד כמה מ-1 עד 10 ההוצאה הזו תורמת לי לרמת החיים ואני אוהב להוציא עליה כסף?
3. האם אני יכול לבטל את ההוצאה הזו לגמרי? לפחות לא בחודש הקרוב?
4. אם אני לא יכול לבטל לגמרי: איך אני כן יכול לצמצם למינימום?

תכנית פעולה חודשית – תקציב:
המלצה: מינימום 50% לחיסכון

החיסכון מחולק כך:
• השקעות
• חיסכון חלומות
• קרן ביטחון`,
    questions: [
      { key: 'saving_currently', label: 'האם כיום אתה חוסך כסף בכל חודש? כן או לא?', type: 'text' },
      { key: 'saving_more_action', label: 'מה אתה צריך לעשות כדי לחסוך סכום גבוה יותר בחודש הקרוב?', type: 'textarea' },
      { key: 'credit_score', label: 'דירוג אשראי שלי נכון להיום (בדוק באפליקציית "קפטן קרדיט")', type: 'text' },
      { key: 'income_split_savings', label: 'חסכונות ___ %', type: 'text' },
      { key: 'income_split_fixed', label: 'הוצאות קבועות ___ %', type: 'text' },
      { key: 'income_split_basic', label: 'הוצאות בסיסיות ___ %', type: 'text' },
      { key: 'income_split_optional', label: 'הוצאות מותרות ___ %', type: 'text' },
      { key: 'savings_split_investments', label: 'השקעות ___ % (מתוך החיסכון)', type: 'text' },
      { key: 'savings_split_dreams', label: 'חיסכון חלומות ___ % (מתוך החיסכון)', type: 'text' },
      { key: 'savings_split_emergency', label: 'קרן ביטחון ___ % (מתוך החיסכון)', type: 'text' },
    ]
  },
  {
    section_key: 'earn',
    title: 'להרוויח',
    order: 8,
    content: `כמה מקורות הכנסה יש לך?
להסתמך על מקור הכנסה אחד בלבד שווה ערך לשבת על כיסא עם רגל אחת. ועדיין רוב אזרחי מדינת ישראל מסתמכים על מקור הכנסה אחד.

המטרה היא לא לעבוד ב-7 עבודות ולקרוא לזה 7 מקורות הכנסה. צריך מקור הכנסה אחד אקטיבי שמכניס יפה לשעה, וכל שאר מקורות ההכנסה צריכים להיות פסיביים.

הגדלת הכנסה כשכיר:
• קידום במקום העבודה
• שינוי תפקיד בעבודה
• מעבר לעבודה אחרת
• משא ומתן על התנאים (מתי בפעם האחרונה ביקשתם העלאה?)
• שעות נוספות
• המלצה: עבודה לפי עמלות (מכירות) או כיוון ההייטק

כדי לזהות איזה עיסוק מתאים לך באופן אישי – 2 מרכיבים עיקריים:
1. מה אני אוהב לעשות?
2. במה אני טוב?`,
    questions: [
      { key: 'monthly_income', label: 'כמה אני מרוויח היום בחודש?', type: 'text' },
      { key: 'income_sources_count', label: 'כמה מקורות הכנסה יש לי?', type: 'text' },
      { key: 'past_problem_solved', label: 'איזו בעיה הייתה לי בעבר שפתרתי אותה?', type: 'textarea' },
      { key: 'love_to_learn', label: 'על מה אתה אוהב ללמוד / לקרוא? מה בדיוק אהבת שם? (בשעות הפנאי, בבית ספר...)', type: 'textarea' },
      { key: 'free_time_activities', label: 'מה אתה עושה בזמן הפנוי שלך?', type: 'textarea' },
      { key: 'time_flies', label: 'מה אתה עושה כשאתה מרגיש שהזמן "עף"? (שאתה יכול לשכוח אפילו לאכול...)', type: 'textarea' },
      { key: 'people_ask_advice', label: 'על מה אנשים מתייעצים איתך / מבקשים ממך עזרה? (הורים, חברים, בית ספר, צבא...)', type: 'textarea' },
      { key: 'happy_period', label: 'היזכר בתקופה שגרמה לך להרגיש מאושר. מה עשית באותה התקופה?', type: 'textarea' },
      { key: 'role_models_jealous', label: 'חשוב על אנשים אחרים / מודלים לחיקוי שלך. מה הם עושים שגורם לך לקנא בהם ולמה?', type: 'textarea' },
      { key: 'past_achievements', label: 'מהם ההישגים שלך מהעבר, על מה אתה גאה לספר שהצלחת?', type: 'textarea' },
      { key: 'what_im_good_at', label: 'במה אתה חושב שאתה טוב / מה אתה עושה טוב יותר מאחרים?', type: 'textarea' },
      { key: 'talk_for_hours', label: 'על מה אתה יכול לדבר עם אנשים במשך שעות בלי להתייעף?', type: 'textarea' },
      { key: 'others_say_good', label: 'במה אנשים שמכירים אותך אומרים שאתה טוב? (אמא, אבא, חבר, מכר)', type: 'textarea' },
      { key: 'how_did_you_do_that', label: 'מה אתה עושה שגורם לאנשים לשאול "איך עשית את זה"?', type: 'textarea' },
      { key: 'if_guaranteed_success', label: 'אם לא היה סיכוי בעולם להיכשל, מה היית עושה? (הצלחה על בטוח)', type: 'textarea' },
      { key: 'excelled_in_school', label: 'באילו מקצועות הצטיינת בלימודים / היית טוב יותר מאחרים?', type: 'textarea' },
      { key: 'learn_fast', label: 'מה אתה לומד ומצליח לקלוט ממש מהר?', type: 'textarea' },
      { key: 'recurring_themes', label: 'עבור על כל התשובות ורשום כאן את התשובות שחזרו על עצמן (תחומים / נושאים שעלו שוב ושוב)', type: 'textarea' },
      { key: 'annual_income_target', label: 'כמה כסף אתה רוצה להכניס בשנה מהעסק שלך?', type: 'text' },
      { key: 'ideal_occupation', label: 'תאר את הרעיון העסקי / העיסוק האידיאלי שלך (שילוב של מה שאתה אוהב ומה שאתה טוב בו)', type: 'textarea' },
    ]
  },
  {
    section_key: 'leverage',
    title: 'למנף',
    order: 9,
    content: `למה בכלל אנחנו צריכים להשקיע?

תכירו את המושג: אינפלציה
שווי השקל שלנו מאבד מערכו מיום ליום. וכל עוד הכסף שלנו יושב בבנק, אנחנו מפסידים כסף.

לדוגמה: אם לפני 20 שנים יכולנו להיכנס לסופר עם 1,000 ₪ ולצאת עם 100 פריטים, היום עם אותו סכום נוכל להכניס לעגלה מקסימום 80 פריטים. מסיבה אחת פשוטה – הכל התייקר.

לכן מי שלא ישקיע את הכסף שלו מבטיח לעצמו חיים לחוצים ומלאי דאגות כלכליות.

אחרי שהבנו שרק חיסכון לא יעשה אתכם חופשיים כלכלית - אפשר להתקדם.

קרן כספית:
• קח את הכסף שמיועד לקרן ביטחון ולחיסכון חלומות
• פתח 2 קרנות כספיות – כל קרן מיועדת לחיסכון מסוים
• ברגע שתצטרך להשתמש בחיסכון, תמשוך את הקרן הכספית – תוך יום עסקים אחד זה אצלך בעו"ש, ובינתיים נהנית מרווחים על הכסף שלך`,
    questions: [
      { key: 'inflation_understanding', label: 'לאחר קריאת ההסבר על אינפלציה – מה תעשה עם החיסכון שלך שנמצא בבנק?', type: 'textarea' },
      { key: 'investment_goals', label: 'מה הם יעדי ההשקעה שלך? (לטווח קצר / בינוני / ארוך)', type: 'textarea' },
      { key: 'risk_tolerance', label: 'מה רמת הסיכון שאתה מוכן לקחת בהשקעות? (נמוכה / בינונית / גבוהה)', type: 'text' },
      { key: 'passive_income_vision', label: 'מהי חזון ההכנסה הפסיבית שלך? כמה אתה רוצה שיכנס לך כל חודש מהשקעות?', type: 'textarea' },
      { key: 'action_plan_leverage', label: 'מהי תכנית הפעולה שלך להתחלת ההשקעות? מה הצעד הראשון?', type: 'textarea' },
    ]
  },
];

const RatingInput = ({ value, onChange }) => (
  <div className="flex gap-2 flex-wrap">
    {[1,2,3,4,5,6,7,8,9,10].map(n => (
      <button
        key={n}
        type="button"
        onClick={() => onChange(String(n))}
        className={`w-9 h-9 rounded-full font-bold text-sm transition-all ${
          value === String(n)
            ? 'bg-[#105330] text-white shadow-lg scale-110'
            : 'bg-white border-2 border-[#105330]/20 text-[#105330] hover:border-[#105330]/60'
        }`}
      >
        {n}
      </button>
    ))}
  </div>
);

export default function WorkbookPage({ userId, viewerEmail }) {
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [answers, setAnswers] = useState({});
  const [answersId, setAnswersId] = useState(null);
  const [expanded, setExpanded] = useState({ intro: true });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  const isAdmin = viewerEmail === ADMIN_EMAIL;

  useEffect(() => {
    if (!userId) return;
    loadData();
  }, [userId]);

  const loadData = async () => {
    const [contentRecords, answerRecords] = await Promise.all([
      base44.entities.WorkbookContent.list('order', 50),
      base44.entities.WorkbookAnswers.filter({ user_id: userId }),
    ]);

    if (contentRecords && contentRecords.length > 0) {
      setSections(contentRecords.sort((a, b) => (a.order || 0) - (b.order || 0)));
    }

    if (answerRecords && answerRecords.length > 0) {
      setAnswers(answerRecords[0].answers || {});
      setAnswersId(answerRecords[0].id);
    }
  };

  const handleAnswer = (key, value) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { user_id: userId, answers };
    if (answersId) {
      await base44.entities.WorkbookAnswers.update(answersId, data);
    } else {
      const created = await base44.entities.WorkbookAnswers.create(data);
      setAnswersId(created.id);
    }
    setSaving(false);
    setSavedAt(new Date());
  };

  const toggleSection = (key) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => {
    const all = {};
    sections.forEach(s => { all[s.section_key] = true; });
    setExpanded(all);
  };

  const filledCount = Object.values(answers).filter(v => v && String(v).trim()).length;
  const totalQuestions = sections.reduce((sum, s) => sum + (s.questions?.length || 0), 0);

  if (showEditor && isAdmin) {
    return (
      <WorkbookEditor
        sections={sections}
        onSave={(updatedSections) => {
          setSections(updatedSections);
          setShowEditor(false);
        }}
        onClose={() => setShowEditor(false)}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4" dir="rtl">
      {/* Sticky Save Bar */}
      <div className="sticky top-20 z-30 flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-lg">
        <div className="flex items-center gap-3">
          {savedAt && (
            <span className="text-xs text-slate-400">
              נשמר ב-{savedAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#105330] hover:bg-[#0d4027] text-white font-bold px-6"
        >
          <Save className="w-4 h-4 ml-2" />
          {saving ? 'שומר...' : savedAt ? 'שמור שוב ✓' : 'שמור תשובות'}
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-[#105330] to-[#1a7a4a] text-white rounded-2xl p-6">
        <div>
          <h1 className="text-2xl font-bold">חוברת עבודה</h1>
          <p className="text-white/75 text-sm mt-1">מלא את שאלות החוברת בקצב שלך</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-2 bg-white/30 rounded-full w-40">
              <div
                className="h-2 bg-white rounded-full transition-all"
                style={{ width: `${totalQuestions ? Math.round((filledCount / totalQuestions) * 100) : 0}%` }}
              />
            </div>
            <span className="text-xs text-white/80">{filledCount}/{totalQuestions} שאלות</span>
          </div>
        </div>
        <div className="flex gap-2 flex-col items-end">
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowEditor(true)}
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 text-xs"
            >
              <Pencil className="w-3 h-3 ml-1" />
              עריכת תוכן
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={expandAll} className="text-white/80 hover:text-white text-xs">
            פתח הכל
          </Button>
        </div>
      </div>

      {/* Sections */}
      {sections.map((section) => {
        const isOpen = !!expanded[section.section_key];
        const sectionAnswered = (section.questions || []).filter(q => answers[q.key]?.trim()).length;
        const sectionTotal = (section.questions || []).length;

        return (
          <div key={section.section_key} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <button
              className="w-full flex items-center justify-between p-5 text-right hover:bg-slate-50 transition-colors"
              onClick={() => toggleSection(section.section_key)}
            >
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <h2 className="font-bold text-[#105330] text-lg">{section.title}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{sectionAnswered}/{sectionTotal} שאלות מולאו</p>
                </div>
                {sectionAnswered === sectionTotal && sectionTotal > 0 && (
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                )}
              </div>
              {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />}
            </button>

            {isOpen && (
              <div className="px-5 pb-5 space-y-5 border-t border-slate-100">
                {section.content && (
                  <div className="mt-4 p-4 bg-[#105330]/5 rounded-xl text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {section.content}
                  </div>
                )}
                {(section.questions || []).map((q) => (
                  <div key={q.key} className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">{q.label}</label>
                    {q.type === 'rating' ? (
                      <RatingInput value={answers[q.key] || ''} onChange={(v) => handleAnswer(q.key, v)} />
                    ) : q.type === 'textarea' ? (
                      <Textarea
                        value={answers[q.key] || ''}
                        onChange={(e) => handleAnswer(q.key, e.target.value)}
                        placeholder="הקלד את תשובתך כאן..."
                        className="min-h-[80px] text-sm resize-none border-slate-200 focus:border-[#105330] focus:ring-[#105330]/20"
                      />
                    ) : (
                      <Input
                        value={answers[q.key] || ''}
                        onChange={(e) => handleAnswer(q.key, e.target.value)}
                        placeholder="תשובה..."
                        className="text-sm border-slate-200 focus:border-[#105330]"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Save button */}
      <div className="flex items-center justify-between py-4">
        {savedAt && (
          <span className="text-xs text-slate-400">
            נשמר ב-{savedAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#105330] hover:bg-[#0d4027] mr-auto"
        >
          <Save className="w-4 h-4 ml-2" />
          {saving ? 'שומר...' : 'שמור תשובות'}
        </Button>
      </div>
    </div>
  );
}