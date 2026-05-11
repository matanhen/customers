import React, { useState, useEffect, useCallback } from 'react';
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
    content: `הנה האמת הכואבת: לא כולם הולכים להתעשר בזכות החוברת הזו או בזכות תהליך כזה או אחר. ולא בגלל שאין כאן מספיק ידע וכלים לגרום לך להגיע לשם, אלא כי זו אמת. לא כולם הולכים ליישם כאן את הכל ולכן לא כולם יממשו את הפוטנציאל של החוברת הזו.

אני כאן כדי לשנות את המפה שלך ולגרום לך לחשוב כמו שצריך לחשוב כדי להשיג את התוצאות שאתה רוצה להשיג, ואתה כאן בשביל ליישם. קח אחריות, אף אחד לא יעשה את זה בשבילך.`,
    questions: [
      { key: 'principles_follow', label: 'האם כיום אתה פועל לפי סדר כל העקרונות? כן או לא?', type: 'text' },
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
• למנף – לייצר מהכסף יותר כסף בעזרת השקעות והכנסות פסיביות לעבר חופש כלכלי`,
    questions: [
      { key: 'score_think', label: 'לחשוב (ציון החשיבה, האמונות וההרגלים הכלכליים שלך) מ-1 עד 10', type: 'rating' },
      { key: 'score_manage', label: 'לנהל (ציון ניהול הכסף שלך) מ-1 עד 10', type: 'rating' },
      { key: 'score_earn', label: 'להרוויח (ציון לפי סכום הכסף שאתה מרוויח) מ-1 עד 10', type: 'rating' },
      { key: 'score_leverage', label: 'למנף (ציון היכולת והידע שלך להשקיע כסף) מ-1 עד 10', type: 'rating' },
    ]
  },
  {
    section_key: 'goals',
    title: 'הגדרת מטרות כלכליות',
    order: 3,
    content: `הרבה אנשים יודעים בעיקר מה הם לא רוצים. אבל השאלה האמיתית היא מה הם כן רוצים? רוב האנשים יענו תשובה של "יותר כסף" או "חופש כלכלי" בלי להבין בכלל מה המשמעות של זה...`,
    questions: [
      { key: 'biggest_goal', label: 'מהי המטרה הכי גדולה שלי?', type: 'textarea' },
      { key: 'goal_reward', label: 'מה אני אוכל להרוויח כשאני אשיג את המטרה שלי?', type: 'textarea' },
      { key: 'goal_price', label: 'מה המחיר שאשלם אם לא אשיג את המטרה שלי לעולם?', type: 'textarea' },
      { key: 'goal_why', label: 'למה כל כך חשוב לי להשיג את המטרה שלי?', type: 'textarea' },
      { key: 'freedom_life', label: 'תאר את חיי החופש הכלכלי שלך בהנחה שכסף לא בעיה עבורך', type: 'textarea' },
      { key: 'freedom_monthly_amount', label: 'מהו הסכום החודשי שלך כדי לחיות את חיי החופש שלך?', type: 'text' },
      { key: 'freedom_list', label: 'בנו את "רשימת החופש" – דברים שאתם רוצים להשיג ולהגשים', type: 'textarea' },
    ]
  },
  {
    section_key: 'beliefs',
    title: 'אמונות',
    order: 4,
    content: `מהי אמונה? תחושת וודאות בנוגע למשהו בחיינו, בין אם זה נכון ובין אם לא.

רוב האמונות שלנו נמצאות בתת המודע והתגבשו מהרגע שנולדנו.

2 סוגים עיקריים:
• אמונה מקדמת – אמונה שמקדמת ומעצימה את האדם
• אמונה מגבילה – אמונה שמגבילה את האדם מלהשיג את המטרות שלו`,
    questions: [
      { key: 'childhood_money_phrases', label: 'רשום את כל המשפטים ששמעת בילדות שלך על כסף (מההורים, החברים, המורים)', type: 'textarea' },
      { key: 'money_is', label: 'כסף הוא ___', type: 'text' },
      { key: 'parents_money', label: 'ההורים שלי חושבים שכסף הוא ___', type: 'text' },
      { key: 'rich_are', label: 'אנשים עשירים הם ___', type: 'text' },
      { key: 'became_rich_because', label: 'אנשים עשירים הפכו לעשירים כי ___', type: 'text' },
      { key: 'if_earn_a_lot', label: 'אם ארוויח הרבה אז ___', type: 'text' },
      { key: 'limiting_beliefs', label: 'רשום כאן את כל האמונות שמונעות ממך להיות חופשי כלכלית', type: 'textarea' },
      { key: 'new_belief', label: 'מהי האמונה החדשה שלי?', type: 'textarea' },
    ]
  },
  {
    section_key: 'habits',
    title: 'הרגלים',
    order: 5,
    content: `"כל שינוי קשה בהתחלה, מסובך באמצע, ונהדר בסופו!"

50% מהפעולות שלנו ביום יום הן הרגלים. לסגל הרגל חדש לוקח בין 21–66 ימים.`,
    questions: [
      { key: 'negative_habits', label: 'רשמו את ההרגלים השליליים שתרצו לשנות', type: 'textarea' },
      { key: 'why_negative', label: 'מדוע הרגלים אלו שליליים?', type: 'textarea' },
      { key: 'why_change', label: 'למה אני רוצה לשנות את ההרגלים האלו?', type: 'textarea' },
      { key: 'habit_change_impact', label: 'כאשר ההרגל ישתנה, איך זה ישפיע על העתיד שלי?', type: 'textarea' },
      { key: 'freedom_stages', label: 'באיזה שלב אתה נמצא היום? (גירעון/איזון/שליטה/ביטחון/חופש)', type: 'text' },
      { key: 'next_stage', label: 'מהו השלב הבא שלך?', type: 'text' },
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
10. להפוך את ניהול הכסף לאוטומטי`,
    questions: [
      { key: 'laws_already_using', label: 'האם אתה משתמש כבר באחד מחוקי הכסף? אם כן, למה?', type: 'textarea' },
      { key: 'laws_disagree', label: 'עם מה מתוך חוקי הכסף אתה לא מסכים? למה?', type: 'textarea' },
      { key: 'favorite_law', label: 'תבחר את החוק המועדף ותאר איך תתחיל ליישם אותו', type: 'textarea' },
      { key: 'small_money_focus', label: 'רשום התמקדות בכסף קטן שהיה לך מהשבוע האחרון', type: 'textarea' },
      { key: 'big_money_focus', label: 'מהו המיקוד שלך החל מהיום (כסף גדול)?', type: 'textarea' },
    ]
  },
  {
    section_key: 'manage',
    title: 'לנהל',
    order: 7,
    content: `שיקוף מצב נוכחי – זוהי נקודת המוצא שלנו. כדי להתחיל לצעוד לעבר המטרות אנחנו חייבים לדעת קודם כל איפה אנחנו נמצאים.`,
    questions: [
      { key: 'saving_currently', label: 'האם כיום אתה חוסך כסף בכל חודש? כן או לא?', type: 'text' },
      { key: 'saving_action', label: 'מה אתה צריך לעשות כדי לחסוך סכום גבוה יותר בחודש הקרוב?', type: 'textarea' },
      { key: 'credit_score', label: 'דירוג אשראי שלי נכון להיום', type: 'text' },
      { key: 'income_split_savings', label: 'חסכונות ___ %', type: 'text' },
      { key: 'income_split_fixed', label: 'הוצאות קבועות ___ %', type: 'text' },
      { key: 'income_split_basic', label: 'הוצאות בסיסיות ___ %', type: 'text' },
      { key: 'income_split_optional', label: 'הוצאות מותרות ___ %', type: 'text' },
    ]
  },
  {
    section_key: 'earn',
    title: 'להרוויח',
    order: 8,
    content: `כמה מקורות הכנסה יש לך? להסתמך על מקור הכנסה אחד בלבד שווה ערך לשבת על כיסא עם רגל אחת.`,
    questions: [
      { key: 'monthly_income', label: 'כמה אני מרוויח היום בחודש?', type: 'text' },
      { key: 'income_sources_count', label: 'כמה מקורות הכנסה יש לי?', type: 'text' },
      { key: 'past_problem_solved', label: 'איזו בעיה הייתה לי בעבר שפתרתי אותה?', type: 'textarea' },
      { key: 'what_i_love', label: 'על מה אתם אוהבים ללמוד / לקרוא? מה עשיתם בזמן הפנוי?', type: 'textarea' },
      { key: 'what_im_good_at', label: 'במה אתם חושבים שאתם טובים / מה אתם עושים טוב יותר מאחרים?', type: 'textarea' },
      { key: 'ideal_occupation', label: 'תארו את הרעיון העסקי / העיסוק האידיאלי שלכם', type: 'textarea' },
    ]
  },
];

const RatingInput = ({ value, onChange }) => (
  <div className="flex gap-2 flex-wrap">
    {[1,2,3,4,5,6,7,8,9,10].map(n => (
      <button
        key={n}
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

    if (contentRecords.length > 0) {
      setSections(contentRecords.sort((a, b) => a.order - b.order));
    }

    if (answerRecords.length > 0) {
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