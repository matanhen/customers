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

---
📚 ידע מקצועי שחובה להשתמש בו:

🏦 קרן ביטחון וחיסכון חלומות:
- קרן ביטחון = 3 חודשי מחיה של המשתמש (חשב לפי הוצאות החודשיות שלו מהנתונים).
- חיסכון חלומות = לפי היעדים הפיננסיים של המשתמש.
- את שניהם תמיד ממליצים לשים בקרן כספית (ולא בחשבון עובר ושב רגיל).
- איך לבחור קרן כספית: כל הקרנות הכספיות די זהות ואין הבדל משמעותי ביניהן. ממליצים להיכנס לאתר "פאנדר" (ניתן למצוא בגוגל), לעבור לקטגוריית קרנות כספיות, ולבחור את הקרן עם דמי הניהול הנמוכים ביותר. בלחיצה על הקרן הספציפית מוצג מספר הקרן - את המספר הזה מזינים באפליקציית שוק ההון של הבנק וקונים בסכום הרצוי.
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
- לעולם אל תמליץ על מניות ספציפיות - אי אפשר להכות את המדד לאורך זמן.
- המלץ תמיד על קרנות סל מחקות מדדים (קנה את כל השוק, והמניה הנכונה תהיה בתוכו).
- לאזרח ישראלי: קרן סל אירית מחקת מדד (S&P 500 / עולמי).
- לאזרח אמריקאי: קרן סל אמריקאית.

**איפה להשקיע - בית השקעות ישראלי הוא האפשרות הטובה ביותר:**
- בנק: הגרוע ביותר - עמלות גבוהות מאוד.
- קופת גמל להשקעה: גם יקר ולא מומלץ.
- בית השקעות ישראלי: הטוב ביותר - עמלות נמוכות, ללא עמלות מט"ח, והם מדווחים לרשות המיסים עבורך (25% מס רווחי הון).
- ברוקר זר (אמריקאי): עמלות מט"ח כפולות (בקנייה ובמכירה), דיווח מס עצמי, מס עיזבון, עמלות מינימום גבוהות - לא מומלץ.
- בבית השקעות ישראלי: עמלת קנייה ~0.07% (מינימום 2-5 ₪) לעומת מעל 20 ₪ בברוקר זר.

תמיד המלץ לפתוח תיק השקעות דרך ההטבה הבאה וכתוב את הקישור כקישור markdown כחול: [לחץ כאן לפתיחת תיק השקעות עם הטבה](https://matanhen.com/invest)

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
    const incomeValues = Object.values(incomes).filter(v => v > 0);
    if (incomeValues.length > 0) {
      const avgIncome = incomeValues.reduce((a, b) => a + b, 0) / incomeValues.length;
      const maxIncome = Math.max(...incomeValues);
      const minIncome = Math.min(...incomeValues);
      ctx += `💰 שיקוף פיננסי (${incomeValues.length} חודשים אחרונים):\n`;
      ctx += `  • ממוצע הכנסה: ₪${Math.round(avgIncome).toLocaleString()}\n`;
      ctx += `  • טווח: ₪${minIncome.toLocaleString()} - ₪${maxIncome.toLocaleString()}\n\n`;
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
    base44.auth.me().then(u => setUserId(u?.id)).catch(() => {});
  }, []);

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

  const handleOpen = () => {
    setIsOpen(true);
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: 'שלום! אני היועץ הפיננסי ה-AI שלך 💚\n\nאני מכיר את הנתונים הפיננסיים שלך ויכול לעזור לך בשאלות על תקציב, חובות, השקעות ותכנון לחופש כלכלי.\n\nבמה אוכל לעזור לך היום?'
      }]);
    }
    if (userId) loadUserContext(userId);
  };

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
          className="mb-4 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ height: '540px' }}
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
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
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
            <p className="text-xs text-gray-400 mt-1 text-center">Enter לשליחה • Shift+Enter לשורה חדשה</p>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
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
    </div>
  );
}