import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const systems = [
  {
    id: 1,
    title: '5 השלבים לחופש כלכלי',
    emoji: '🏆',
    color: 'from-[#105330] to-[#1a7a4a]',
    lightColor: 'bg-emerald-50 border-emerald-200',
    steps: [
      { label: 'גירעון כלכלי', emoji: '🔴', desc: 'הוצאות גדולות מהכנסות – כסף נגמר לפני סוף החודש' },
      { label: 'איזון כלכלי', emoji: '🟡', desc: 'הכנסות = הוצאות – עומדים בקושי, אין חיסכון' },
      { label: 'שליטה כלכלית', emoji: '🟢', desc: 'יש עודף כסף בסוף החודש, מתחילים לחסוך' },
      { label: 'ביטחון כלכלי', emoji: '🔵', desc: 'יש קרן ביטחון, השקעות ואין חובות רעים' },
      { label: 'חופש כלכלי', emoji: '🌟', desc: 'ההכנסות הפאסיביות מכסות את כל ההוצאות!' },
    ],
    extra: {
      title: '5 תת-שלבים (החל משליטה כלכלית)',
      items: [
        { emoji: '💚', text: 'תזרים חיובי – יותר הכנסה מהוצאה בכל חודש' },
        { emoji: '🚫', text: '0 חובות רעים – סגירת הלוואות, אוברדראפט וכרטיסי אשראי' },
        { emoji: '🛡️', text: 'קרן ביטחון – 3-6 חודשי הוצאות בצד' },
        { emoji: '📈', text: 'השקעות בשוק ההון – תיק השקעות שצומח בכל חודש' },
        { emoji: '🏠', text: 'רכישת דירה ראשונה להשקעה – נדל"ן מניב' },
      ]
    }
  },
  {
    id: 2,
    title: '5 שלבים – הצבת מטרות כלכליות',
    emoji: '🎯',
    color: 'from-blue-600 to-indigo-600',
    lightColor: 'bg-blue-50 border-blue-200',
    steps: [
      { label: 'מה המטרה?', emoji: '🤔', desc: 'תגדיר בדיוק מה אתה רוצה – רכב, חופשה, דירה, חיסכון?' },
      { label: 'מתי?', emoji: '📅', desc: 'קבע תאריך יעד – בעוד כמה חודשים/שנים תרצה להגיע לשם?' },
      { label: 'כמה עולה המטרה?', emoji: '💰', desc: 'חשב את המחיר המלא של המטרה בשקלים' },
      { label: 'חיסכון חודשי?', emoji: '🗓️', desc: 'עלות המטרה ÷ מספר החודשים = כמה לחסוך כל חודש' },
      { label: 'איפה לשים את הכסף?', emoji: '🏦', desc: 'קרן כספית, חיסכון בנקאי, או חשבון ייעודי – עד שמגיעים למטרה' },
    ]
  },
  {
    id: 3,
    title: '5 שלבים – ניהול כסף',
    emoji: '💳',
    color: 'from-purple-600 to-pink-600',
    lightColor: 'bg-purple-50 border-purple-200',
    steps: [
      { label: 'קבלת משכורת + הגדרת יעד חיסכון', emoji: '💵', desc: 'ברגע שהכסף נכנס, מחליטים כמה חוסכים החודש לפי המטרות' },
      { label: 'העברה לחשבון חופש', emoji: '→🔓', desc: 'הוראת קבע או העברה ידנית לחשבון חופש כלכלי' },
      { label: 'העברה לתיק השקעות', emoji: '→📈', desc: 'הוראת קבע לתיק ההשקעות – כסף שעובד בשבילך' },
      { label: 'חלוקה לקרנות כספיות', emoji: '📊', desc: 'החיסכון הנותר מתחלק לקרנות – קרן ביטחון, חלומות ועוד' },
      { label: 'כל היתרה = הוצאות', emoji: '🛒', desc: 'מה שנשאר אחרי כל ההעברות – זה הכסף להוצאות השוטפות' },
    ]
  },
  {
    id: 4,
    title: '5 שלבים – מדדים',
    emoji: '📊',
    color: 'from-orange-500 to-amber-500',
    lightColor: 'bg-orange-50 border-orange-200',
    steps: [
      { label: 'הצבת יעד חיסכון לחודש הקרוב', emoji: '🎯', desc: 'בתחילת כל חודש מחליטים כמה חוסכים החודש' },
      { label: 'סיכום הוצאות שבועי', emoji: '📆', desc: 'פעם בשבוע בודקים כמה הוצאנו ואם אנחנו במסלול' },
      { label: 'סיכום חודשי', emoji: '📋', desc: 'בסוף החודש מסכמים הכנסות, הוצאות וחיסכון בפועל' },
      { label: 'העברות', emoji: '↔️', desc: 'מוודאים שבוצעו ההעברות לקרן ביטחון, השקעות וחיסול חובות' },
      { label: 'הצבת יעד חדש לחודש הבא', emoji: '🔄', desc: 'לומדים מהחודש שעבר ומציבים יעד ריאלי לחודש הבא' },
    ]
  },
  {
    id: 5,
    title: '5 שלבים – השקעות שוק ההון',
    emoji: '📈',
    color: 'from-teal-600 to-cyan-600',
    lightColor: 'bg-teal-50 border-teal-200',
    steps: [
      { label: 'מטרת ההשקעה', emoji: '🏁', desc: 'למה אתה משקיע? פנסיה? חופש כלכלי? רכישת נכס?' },
      { label: 'הבנת רמת הסיכון', emoji: '⚖️', desc: 'כמה ירידות בשוק אתה יכול לסבול מבלי לפדות את הכסף?' },
      { label: 'בניית תמהיל תיק', emoji: '🧩', desc: 'תיק פשוט ומפוזר – מניות עולמיות, אגח, ועוד' },
      { label: 'פתיחת תיק השקעות', emoji: '🖊️', desc: 'בחירת בית השקעות ופתיחת חשבון מסחר עצמאי' },
      { label: 'רכישת קרן הסל הראשונה', emoji: '🚀', desc: 'לרכוש ETF ולפעול לפי אסטרטגיה ארוכת טווח + איזון תיק' },
    ]
  },
  {
    id: 6,
    title: '5 שלבים – הגדלת הכנסות',
    emoji: '💼',
    color: 'from-rose-600 to-red-600',
    lightColor: 'bg-rose-50 border-rose-200',
    steps: [
      { label: 'הקמת עסק', emoji: '🏗️', desc: 'מחליטים להקים מקור הכנסה נוסף – פרילנס, עסק, מוצר דיגיטלי' },
      { label: 'מציאת רעיון', emoji: '💡', desc: 'מוצאים רעיון שמתחברים אליו ושיש לו ביקוש בשוק' },
      { label: 'התנסות בחינם', emoji: '🎁', desc: 'נותנים את השירות בחינם לכמה אנשים – מקבלים פידבק וביטחון' },
      { label: 'לתת שירות בתשלום', emoji: '💲', desc: 'עוברים לגבות כסף – גם מחיר קטן מתחילה לבנות הכנסה' },
      { label: 'דיוק הקהל + פיתוח עסקי', emoji: '🎯', desc: 'מבינים מי הלקוח האידיאלי ומשפרים – לצפות בפורטל הדיגיטלי' },
    ]
  },
  {
    id: 7,
    title: '5 שלבים – שינוי אמונות מגבילות',
    emoji: '🧠',
    color: 'from-violet-600 to-purple-700',
    lightColor: 'bg-violet-50 border-violet-200',
    steps: [
      { label: 'האם האמונה נכונה לגבי כולם?', emoji: '🌍', desc: 'אם הרבה אנשים הצליחו – האמונה שלך לא מוחלטת' },
      { label: 'מאיפה לקחת את האמונה?', emoji: '🔍', desc: 'מי אמר לך את זה? האם לאותו אדם יש את התוצאות שאתה רוצה?' },
      { label: 'מי תהיה בלי האמונה?', emoji: '🦋', desc: 'דמיין את חייך ללא האמונה המגבילה הזו – איך הם נראים?' },
      { label: 'היית קונה את האמונה הזו?', emoji: '🏪', desc: 'בחנות אמונות – האם היית בוחר לקנות אמונה זו? כנראה שלא!' },
      { label: 'מהי האמונה החדשה שלך?', emoji: '✨', desc: 'כתוב אמונה חדשה, חזקה. חפש הוכחות שהיא נכונה – מאנשים ומחקרים' },
    ]
  },
];

function SystemCard({ system }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-3xl border-2 ${system.lightColor} overflow-hidden transition-all duration-300`}>
      <button className="w-full text-right" onClick={() => setOpen(!open)}>
        <div className={`bg-gradient-to-r ${system.color} p-6 flex items-center justify-between`}>
          <div className="flex items-center gap-4">
            <span className="text-4xl">{system.emoji}</span>
            <h2 className="text-xl lg:text-2xl font-black text-white">{system.title}</h2>
          </div>
          <div className="p-2 bg-white/20 rounded-xl">
            {open ? <ChevronUp className="w-5 h-5 text-white" /> : <ChevronDown className="w-5 h-5 text-white" />}
          </div>
        </div>
      </button>
      {open && (
        <div className="p-6 space-y-4">
          <div className="grid gap-3">
            {system.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-4 bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-slate-700 to-slate-800 text-white rounded-full flex items-center justify-center text-sm font-black">{i + 1}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{step.emoji}</span>
                    <span className="font-bold text-slate-800 text-base">{step.label}</span>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
          {system.extra && (
            <div className="mt-4 bg-white rounded-2xl p-5 shadow-sm border-2 border-dashed border-slate-200">
              <h3 className="font-black text-slate-700 text-lg mb-4">➕ {system.extra.title}</h3>
              <div className="space-y-3">
                {system.extra.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                    <span className="text-xl">{item.emoji}</span>
                    <span className="text-sm font-medium text-slate-700">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function System5Steps() {
  return (
    <div>
      <div className="relative mb-8 rounded-3xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#105330] via-[#0d4027] to-[#105330]" />
        <div className="relative px-8 py-10 text-center">
          <div className="text-5xl mb-3">🏆</div>
          <h1 className="text-3xl font-black text-white mb-2">סיסטם 5 שלבים</h1>
          <p className="text-white/80">כל מה שצריך לדעת – צעד אחר צעד, ברור כשמש</p>
        </div>
      </div>
      <div className="space-y-5">
        {systems.map((system) => (
          <SystemCard key={system.id} system={system} />
        ))}
      </div>
    </div>
  );
}