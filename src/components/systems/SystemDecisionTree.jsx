import React, { useState } from 'react';
import { CheckCircle, XCircle, RotateCcw, ChevronLeft } from 'lucide-react';

// Each node: id, question, context, yes -> next node id, no -> "repeat" or node id
const TREE = {
  start: {
    id: 'start',
    stage: 1,
    stageLabel: 'שלב 1 – תזרים חיובי',
    emoji: '💚',
    question: 'האם בסוף כל חודש נשאר לך כסף (הכנסה > הוצאות)?',
    context: 'כדי להתקדם לכל שלב אחר, חייבים קודם שהכנסות יהיו גבוהות יותר מהוצאות. אם לא – צריך להקטין הוצאות או להגדיל הכנסות.',
    yes: 'no_bad_debts',
    no: 'fix_cashflow',
  },
  fix_cashflow: {
    id: 'fix_cashflow',
    isAction: true,
    emoji: '⚠️',
    title: 'יש עבודה לעשות!',
    action: 'צריך ליצור תזרים חיובי לפני הכל',
    steps: [
      'ערוך רשימת כל ההוצאות שלך',
      'מצא 3 הוצאות שניתן לקצץ מיד',
      'שקול מקורות הכנסה נוספים',
      'הגדר יעד: לסיים את החודש ב-+500₪ לפחות',
    ],
    back: 'start',
  },
  no_bad_debts: {
    id: 'no_bad_debts',
    stage: 2,
    stageLabel: 'שלב 2 – ללא חובות רעים',
    emoji: '🚫',
    question: 'האם אין לך חובות רעים? (הלוואות, אוברדראפט, חוב בכרטיס אשראי)',
    context: 'חובות רעים הם חובות בריבית גבוהה שמוציאים ממך כסף כל חודש. חייבים לסגור אותם לפני שמתחילים לחסוך.',
    yes: 'emergency_fund',
    no: 'fix_debts',
  },
  fix_debts: {
    id: 'fix_debts',
    isAction: true,
    emoji: '⚠️',
    title: 'קודם לסגור חובות!',
    action: 'יש לסגור את כל החובות הרעים לפני שממשיכים',
    steps: [
      'רשום את כל החובות שלך עם הריביות שלהם',
      'התחל לכסות קודם את החוב עם הריבית הגבוהה ביותר (שיטת Avalanche)',
      'הפנה לפחות 20% מהמשכורת לכיסוי חובות',
      'אל תיקח הלוואות חדשות עד שכולם סגורים',
    ],
    back: 'no_bad_debts',
  },
  emergency_fund: {
    id: 'emergency_fund',
    stage: 3,
    stageLabel: 'שלב 3 – קרן ביטחון',
    emoji: '🛡️',
    question: 'האם יש לך קרן ביטחון של לפחות 3 חודשי הוצאות?',
    context: 'קרן ביטחון היא כרית בטחון שתגן עליך אם תפסיד עבודה, יהיה חירום רפואי או הוצאה בלתי צפויה. ללא זה – כל אירוע ישלח אותך חזרה לחובות.',
    yes: 'investing',
    no: 'fix_emergency',
  },
  fix_emergency: {
    id: 'fix_emergency',
    isAction: true,
    emoji: '⚠️',
    title: 'בונים קרן ביטחון!',
    action: 'לפני השקעות – חייבים 3 חודשי מחיה בצד',
    steps: [
      'חשב כמה עולה לך חודש (שכירות + אוכל + הכרחי)',
      'הכפל ב-3 – זה היעד שלך לקרן הביטחון',
      'פתח חשבון נפרד ייעודי רק לקרן הביטחון',
      'הפנה מידי חודש סכום קבוע עד שמגיעים ליעד',
    ],
    back: 'emergency_fund',
  },
  investing: {
    id: 'investing',
    stage: 4,
    stageLabel: 'שלב 4 – השקעות פאסיביות',
    emoji: '📈',
    question: 'האם אתה משקיע בקביעות בשוק ההון (תיק השקעות, קרנות סל)?',
    context: 'אחרי שהבסיס יציב – הכסף צריך לעבוד בשבילך. השקעה פאסיבית ארוכת טווח היא הדרך המוכחת לצמיחת עושר.',
    yes: 'real_estate',
    no: 'fix_investing',
  },
  fix_investing: {
    id: 'fix_investing',
    isAction: true,
    emoji: '⚠️',
    title: 'הגיע הזמן להשקיע!',
    action: 'פתח תיק השקעות והתחל להשקיע פאסיבית',
    steps: [
      'בחר בית השקעות (מיטב, אלטשולר, IBI ועוד)',
      'פתח חשבון מסחר עצמאי',
      'החלט על הקצאה: מניות עולמיות (S&P500 / MSCI World)',
      'הגדר הוראת קבע חודשית – גם 200₪ מספיק להתחיל',
    ],
    back: 'investing',
  },
  real_estate: {
    id: 'real_estate',
    stage: 5,
    stageLabel: 'שלב 5 – דירה להשקעה',
    emoji: '🏠',
    question: 'האם יש לך דירה ראשונה להשקעה (מניבה שכירות)?',
    context: 'דירה להשקעה היא נכס שמייצר הכנסה פאסיבית חודשית. זהו אחד הצעדים המשמעותיים ביותר לבניית עושר לטווח ארוך.',
    yes: 'completed',
    no: 'fix_real_estate',
  },
  fix_real_estate: {
    id: 'fix_real_estate',
    isAction: true,
    emoji: '⚠️',
    title: 'בונים לקניית דירה!',
    action: 'תכנן ופעל לרכישת הדירה הראשונה להשקעה',
    steps: [
      'הגדר יעד הון עצמי נדרש (בדרך כלל 25-30% מערך הנכס)',
      'בנה תוכנית חיסכון ייעודית לרכישה',
      'למד על אזורים עם פוטנציאל תשואה גבוה',
      'התייעץ עם יועץ משכנתאות לפני שמתחילים לחפש',
    ],
    back: 'real_estate',
  },
  completed: {
    id: 'completed',
    isCompleted: true,
  },
};

const STAGE_COLORS = {
  1: 'from-emerald-500 to-teal-500',
  2: 'from-blue-500 to-indigo-500',
  3: 'from-orange-500 to-amber-500',
  4: 'from-purple-500 to-violet-500',
  5: 'from-rose-500 to-pink-500',
};

export default function SystemDecisionTree() {
  const [currentId, setCurrentId] = useState('start');
  const [history, setHistory] = useState([]);

  const current = TREE[currentId];

  const goTo = (id) => {
    setHistory(prev => [...prev, currentId]);
    setCurrentId(id);
  };

  const goBack = () => {
    const prev = history[history.length - 1];
    if (prev) {
      setHistory(h => h.slice(0, -1));
      setCurrentId(prev);
    }
  };

  const reset = () => {
    setHistory([]);
    setCurrentId('start');
  };

  if (current.isCompleted) {
    return (
      <div>
        <div className="relative mb-8 rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-700 to-indigo-800" />
          <div className="relative px-8 py-10 text-center">
            <div className="text-5xl mb-3">🌳</div>
            <h1 className="text-3xl font-black text-white mb-2">תגלה מה אתה צריך לעשות עכשיו</h1>
          </div>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-3xl p-10 text-center shadow-xl">
          <div className="text-7xl mb-6">🏆🌟</div>
          <h2 className="text-3xl font-black text-amber-700 mb-3">מדהים! עברת את כל 5 השלבים!</h2>
          <p className="text-amber-600 text-lg mb-8 leading-relaxed">
            השגת תזרים חיובי, סגרת חובות, בנית קרן ביטחון,<br />
            משקיע בקביעות ויש לך דירה להשקעה.<br />
            <strong>אתה בדרך לחופש כלכלי מלא! 🚀</strong>
          </p>
          <button
            onClick={reset}
            className="flex items-center gap-2 mx-auto bg-amber-500 hover:bg-amber-600 text-white font-bold px-8 py-4 rounded-2xl shadow-lg transition-all"
          >
            <RotateCcw className="w-5 h-5" />
            התחל מחדש
          </button>
        </div>
      </div>
    );
  }

  if (current.isAction) {
    return (
      <div>
        <div className="relative mb-8 rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-700 to-indigo-800" />
          <div className="relative px-8 py-10 text-center">
            <div className="text-5xl mb-3">🌳</div>
            <h1 className="text-3xl font-black text-white mb-2">תגלה מה אתה צריך לעשות עכשיו</h1>
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200 rounded-3xl p-8 shadow-xl">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">{current.emoji}</div>
            <h2 className="text-2xl font-black text-orange-700">{current.title}</h2>
            <p className="text-orange-600 mt-2 font-medium">{current.action}</p>
          </div>
          <div className="space-y-3 mb-8">
            {current.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3 bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex-shrink-0 w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-black">{i + 1}</div>
                <p className="text-slate-700 font-medium">{step}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={goBack}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 rounded-2xl transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
              חזרה לשאלה
            </button>
            <button
              onClick={reset}
              className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 font-medium px-5 py-4 rounded-2xl transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              התחל מחדש
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Question node
  const stageColor = STAGE_COLORS[current.stage] || 'from-slate-500 to-slate-700';

  // Progress: how many stages done (based on history going through question nodes)
  const stagesDone = current.stage - 1;

  return (
    <div>
      <div className="relative mb-8 rounded-3xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-700 to-indigo-800" />
        <div className="relative px-8 py-10 text-center">
          <div className="text-5xl mb-3">🌳</div>
          <h1 className="text-3xl font-black text-white mb-2">תגלה מה אתה צריך לעשות עכשיו</h1>
          <p className="text-white/70">ענה על השאלות וגלה בדיוק מה הצעד הבא שלך</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-6 border border-slate-100">
        <div className="flex justify-between text-xs text-slate-500 mb-2">
          <span>התקדמות</span>
          <span>{stagesDone}/5 שלבים</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${stageColor} rounded-full transition-all duration-500`}
            style={{ width: `${(stagesDone / 5) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className={`flex flex-col items-center gap-1`}>
              <div className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center ${i < current.stage ? 'bg-emerald-500 text-white' : i === current.stage ? `bg-gradient-to-r ${stageColor} text-white` : 'bg-slate-100 text-slate-400'}`}>
                {i < current.stage ? '✓' : i}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Question Card */}
      <div className={`bg-gradient-to-br ${stageColor} rounded-3xl p-1 shadow-xl mb-6`}>
        <div className="bg-white rounded-[22px] p-7">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{current.emoji}</span>
            <span className={`text-sm font-bold bg-gradient-to-r ${stageColor} bg-clip-text text-transparent`}>{current.stageLabel}</span>
          </div>
          <h2 className="text-xl lg:text-2xl font-black text-slate-800 mb-4 leading-snug">
            {current.question}
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed bg-slate-50 rounded-xl p-4">
            💡 {current.context}
          </p>
        </div>
      </div>

      {/* Answer Buttons */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <button
          onClick={() => goTo(current.yes)}
          className="flex flex-col items-center gap-3 bg-gradient-to-br from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black py-6 px-4 rounded-3xl shadow-lg hover:scale-[1.03] transition-all duration-200"
        >
          <CheckCircle className="w-8 h-8" />
          <span className="text-lg">כן! ✅</span>
          <span className="text-xs font-medium text-white/80">עברתי את השלב הזה</span>
        </button>
        <button
          onClick={() => goTo(current.no)}
          className="flex flex-col items-center gap-3 bg-gradient-to-br from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-black py-6 px-4 rounded-3xl shadow-lg hover:scale-[1.03] transition-all duration-200"
        >
          <XCircle className="w-8 h-8" />
          <span className="text-lg">לא ❌</span>
          <span className="text-xs font-medium text-white/80">עוד לא הגעתי לשם</span>
        </button>
      </div>

      {/* Back / Reset */}
      <div className="flex gap-3">
        {history.length > 0 && (
          <button
            onClick={goBack}
            className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 font-medium py-3 rounded-2xl transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            שאלה קודמת
          </button>
        )}
        <button
          onClick={reset}
          className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-400 border border-slate-200 px-5 py-3 rounded-2xl transition-all"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}