import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Upload, Loader2, Check, AlertCircle, FileText, ChevronDown, ChevronUp } from 'lucide-react';

const FIXED_EXPENSES = [
  'ביטוחי רכב','טסט','משכנתא','ביטוח משכנתא','שכירות','מנויים',
  'ביטוחים (ללא רכב)','ועד בית','ארנונה','החזר הלוואות','הוראות קבע',
];

const VARIABLE_EXPENSES = [
  'מים','חשמל','גז','תספורת וקוסמטיקה','חינוך','חוגים וקייטנות','בריאות',
  'תיקוני רכב','עמלות וריביות בנקים','טיפולי שיניים','אופטיקה','חגים ויהדות',
  'טלפון נייד','סופר פארם','דברים לבית','ביטוח לאומי','מזון','דלק וחניה',
  'תחבורה ציבורית','סיגריות','עוזרת / בייביסיטר','ביט','מזומן','בילויים',
  'בגדים ונעליים','תרומות','התפתחות אישית','חופשה / טיול','בעלי חיים','מתנות ואירועים',
];

const CLASSIFICATION_PROMPT = `אתה מומחה לניתוח פיננסי. קרא את קובץ ה-PDF המצורף שהוא פירוט עסקאות של כרטיס אשראי או חשבון בנק ישראלי.

## משימתך: חלץ את כל ההוצאות מהטבלה/הרשימה שבקובץ.

## חשוב מאוד - זיהוי מבנה הקובץ:
- הקובץ מכיל טבלה עם עמודות כמו: תאריך, בית עסק, סכום חיוב בש"ח
- כל שורה בטבלה = הוצאה אחת
- הסכום נמצא בעמודת "סכום חיוב בש"ח" - קרא אותו בדיוק
- שם ספק נמצא בעמודת "בית עסק"
- אם יש שתי טבלאות (חיובים בישראל + חיובים בחו"ל) - חלץ מ**שתיהן**

## חוקים קריטיים:
- כלול את כל השורות בטבלה - כל שורה היא הוצאה
- אל תכלול הכנסות ואל תכלול סכומי סיכום (כמו "סה"כ")
- אל תכלול העברות בין חשבונות
- סכום תמיד חיובי

## קטגוריות הוצאות קבועות (fixed) - שייך כאן אם ההוצאה חוזרת כל חודש:
- **ביטוחי רכב**: ביטוח חובה, ביטוח מקיף לרכב, כל ביטוח שמוזכר בהקשר של רכב/אוטו/מכונית
- **טסט**: תשלום לטסט, רישיון רכב שנתי
- **משכנתא**: תשלום משכנתא, הלוואת בנק לדיור
- **ביטוח משכנתא**: ביטוח חיים על משכנתא, ביטוח מבנה
- **שכירות**: דמי שכירות, שכר דירה
- **מנויים**: נטפליקס, ספוטיפיי, yes, HOT, Wolt Plus, Amazon Prime, YouTube Premium, iCloud, Google One, כל מנוי חודשי דיגיטלי, חדר כושר, בריכה
- **ביטוחים (ללא רכב)**: מגדל, הראל, כלל, מנורה, הפניקס, ביטוח בריאות פרטי, ביטוח חיים, ביטוח תאונות אישיות
- **ועד בית**: ועד בית, תשלום לבניין
- **ארנונה**: ארנונה, עיריית...
- **החזר הלוואות**: החזר הלוואה, תשלום אשראי, החזר כרטיס אשראי
- **הוראות קבע**: הוראות קבע אחרות שלא שוייכו לעיל

## קטגוריות יתרת הוצאות (variable) - שייך כאן לפי ספק/שם:
- **מים**: תשלום למים, חברת מקורות
- **חשמל**: חברת חשמל, IEC
- **גז**: גז, רסניק, גז ישראל, ליברה גז
- **תספורת וקוסמטיקה**: מספרה, סלון יופי, קוסמטיקה, ציפורניים, במבי, ויקטוריה
- **חינוך**: שכר לימוד, אוניברסיטה, מכללה, בית ספר, גן ילדים, פעוטון
- **חוגים וקייטנות**: חוג כדורגל, חוג מוזיקה, קייטנה, ספורט ילדים
- **בריאות**: בית מרקחת, סופר-פארם רק תרופות, קופת חולים, מרפאה, רופא, ניתוח
- **תיקוני רכב**: מוסך, תיקון רכב, החלפת שמן, טיולי גלגלים
- **עמלות וריביות בנקים**: עמלת ניהול חשבון, ריבית, עמלת העברה, עמלת כרטיס
- **טיפולי שיניים**: שיניים, אורתודנטיה, קליניקת שיניים
- **אופטיקה**: משקפיים, עדשות מגע, אופטיקנה
- **חגים ויהדות**: ספרי תורה, בית כנסת, הכנה לחג, מצות
- **טלפון נייד**: סלקום, פרטנר, HOT מובייל, 012, רמי לוי סלולר, גולן טלקום, סימפל
- **סופר פארם**: סופר-פארם (קניות כלליות, לא תרופות), שופרסל בריאות ויופי
- **דברים לבית**: איקאה, HOME CENTER, ACE, זארה הום, ציוד לבית, כלי בית
- **ביטוח לאומי**: ביטוח לאומי, מס בריאות
- **מזון**: רמי לוי, שופרסל, מגה, ויקטורי, יוחננוף, AM:PM, מינימרקט, סופרמרקט, קאשר, מכולת, אוכל, מסעדה, ארוחה, קפה, פיצה, מקדונלד'ס, בורגר קינג, שווארמה, פלאפל, Wolt, Ten Bis, תן ביס, אורקל, סטיקס, טביל, ממילא, קנט, קינג ג'ורג', פסטה
- **דלק וחניה**: דלק, סונול, פז, כלי שמן, חניה, פנגו, פנגו פארק, עמידר
- **תחבורה ציבורית**: רב קו, אוטובוס, רכבת ישראל, חיפוש תחבורה
- **סיגריות**: סיגריות, טבק
- **עוזרת / בייביסיטר**: בייביסיטר, עוזרת בית, ניקיון
- **ביט**: ביט, העברת ביט (כשלא ברור מה ההוצאה)
- **מזומן**: משיכת מזומן, ATM, כספומט
- **בילויים**: סרט, קולנוע, יס פלאנט, HOT Cinema, קונצרט, כדורגל, אירוע, פאב, בר, כיף
- **בגדים ונעליים**: זארה, H&M, Fox, מנגו, קסטרו, קפיטל, אדידס, נייק, נעליים, ביגוד
- **תרומות**: תרומה, צדקה
- **התפתחות אישית**: קורס, ספר, סדנה, coaching, אימון אישי
- **חופשה / טיול**: מלון, צימר, בוקינג, Airbnb, טיסה, אל-על, ויזות, פארק מים, תיירות
- **בעלי חיים**: וטרינר, אוכל לכלב/חתול, חנות חיות
- **מתנות ואירועים**: מתנה, אירוע, חתונה, בר מצווה, מסיבה
- **התפתחות אישית**: BASE44, קורס, ספר, סדנה, coaching, אימון אישי, פלטפורמות SaaS עסקיות
- **מנויים**: Zoom, Canva, ManyChat, Make.com, ChatGPT, Claude, נטפליקס, ספוטיפיי, iCloud, Apple.com/bill, Google One, YouTube Premium, Amazon Prime, Adobe, Notion, Slack, כל מנוי חודשי דיגיטלי
- **בילויים**: Facebook Ads, פרסום ברשתות חברתיות, Meta Ads, Google Ads (אם נראים כהוצאות אישיות)
- **דברים לבית**: מחסני חשמל, KSP, כלי עבודה, ציוד

## כלל חשוב לאגירה:
כאשר יש כמה עסקאות מאותו ספק/סוג, **שייך לאותה קטגוריה** — המערכת תאגד אוטומטית.

החזר JSON תקין בלבד. category חייב להיות בדיוק כפי שמופיע ברשימות למעלה.`;

export default function PDFReflectionImport({ open, onOpenChange, onApply }) {
  const [step, setStep] = useState('upload');
  const [parsedItems, setParsedItems] = useState([]);
  const [groupedView, setGroupedView] = useState([]);
  const [error, setError] = useState('');
  const [globalMonth, setGlobalMonth] = useState('month1');
  const [expandedGroups, setExpandedGroups] = useState({});
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { setError('יש להעלות קובץ PDF בלבד'); return; }
    setError('');
    setStep('loading');

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: CLASSIFICATION_PROMPT,
        file_urls: [file_url],
        model: 'claude_sonnet_4_6',
        response_json_schema: {
          type: 'object',
          properties: {
            expenses: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  amount: { type: 'number' },
                  expense_type: { type: 'string', enum: ['fixed', 'variable'] },
                  category: { type: 'string' },
                }
              }
            }
          }
        }
      });

      // Group by category and sum amounts
      const grouped = {};
      (result.expenses || []).forEach(exp => {
        if (!exp.amount || exp.amount <= 0) return;
        const cat = exp.category || 'אחר';
        const type = exp.expense_type || 'variable';
        const key = `${type}::${cat}`;
        if (!grouped[key]) {
          grouped[key] = { category: cat, type, total: 0, items: [], confirmed: true, month: 'month1' };
        }
        grouped[key].total += exp.amount;
        grouped[key].items.push({ description: exp.description, amount: exp.amount });
      });

      const groups = Object.values(grouped).sort((a, b) => b.total - a.total);
      setGroupedView(groups);
      setStep('review');
    } catch (err) {
      setError('שגיאה בעיבוד הקובץ. נסה שנית.');
      setStep('upload');
    }
    e.target.value = '';
  };

  const updateGroup = (index, field, value) => {
    setGroupedView(prev => prev.map((g, i) => i === index ? { ...g, [field]: value } : g));
  };

  const applyGlobalMonth = (month) => {
    setGlobalMonth(month);
    setGroupedView(prev => prev.map(g => ({ ...g, month })));
  };

  const handleApply = () => {
    const validItems = [];
    groupedView.filter(g => g.confirmed && g.category && g.month).forEach(g => {
      validItems.push({
        description: g.category,
        amount: Math.round(g.total),
        type: g.type,
        category: g.category,
        month: g.month,
        confirmed: true,
      });
    });
    onApply(validItems);
    handleClose();
  };

  const handleClose = () => {
    setStep('upload');
    setGroupedView([]);
    setParsedItems([]);
    setError('');
    setGlobalMonth('month1');
    setExpandedGroups({});
    onOpenChange(false);
  };

  const confirmedCount = groupedView.filter(g => g.confirmed && g.category && g.month).length;
  const totalAmount = groupedView.filter(g => g.confirmed).reduce((s, g) => s + g.total, 0);

  const typeLabel = (t) => t === 'fixed' ? 'קבועה' : 'משתנה';
  const typeColor = (t) => t === 'fixed' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#105330]" />
            ייבוא הוצאות לשיקוף מקובץ PDF
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4 py-4">
            <div
              className="border-2 border-dashed border-[#105330]/40 rounded-xl p-10 text-center cursor-pointer hover:border-[#105330] hover:bg-[#105330]/5 transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-10 h-10 text-[#105330]/60 mx-auto mb-3" />
              <p className="text-slate-700 font-medium">לחץ להעלאת קובץ PDF</p>
              <p className="text-slate-400 text-sm mt-1">פירוט אשראי, דף בנק או כל מסמך הוצאות</p>
              <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              <p className="font-semibold mb-1">💡 איך זה עובד?</p>
              <p>ה-AI יקרא את הקובץ, יזהה ויסווג כל הוצאה בדיוק גבוה לקטגוריה הנכונה, ויאגד הוצאות מאותה קטגוריה. לכל קבוצה תוכל לבחור לאיזה חודש בשיקוף (1/2/3) היא שייכת.</p>
            </div>
          </div>
        )}

        {step === 'loading' && (
          <div className="py-16 text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-[#105330] mx-auto" />
            <p className="text-slate-700 font-medium text-lg">מנתח ומסווג את ההוצאות...</p>
            <p className="text-slate-400 text-sm">ה-AI קורא את הקובץ ומשייך כל הוצאה לקטגוריה המדויקת</p>
            <p className="text-slate-300 text-xs">התהליך עשוי לקחת עד 30 שניות</p>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div>
                <p className="font-semibold text-emerald-800">זוהו {groupedView.length} קטגוריות הוצאות</p>
                <p className="text-sm text-emerald-600">סה"כ: ₪{Math.round(totalAmount).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-blue-800">כל ההוצאות לחודש:</span>
                <Select value={globalMonth} onValueChange={applyGlobalMonth}>
                  <SelectTrigger className="h-9 w-28 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month1">חודש 1</SelectItem>
                    <SelectItem value="month2">חודש 2</SelectItem>
                    <SelectItem value="month3">חודש 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 max-h-[450px] overflow-y-auto">
              {groupedView.map((group, index) => (
                <div
                  key={index}
                  className={`rounded-xl border transition-all ${group.confirmed ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-50'}`}
                >
                  {/* Group Header */}
                  <div className="flex items-center gap-3 p-3">
                    <button
                      onClick={() => setExpandedGroups(prev => ({ ...prev, [index]: !prev[index] }))}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      {expandedGroups[index] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800 text-sm">{group.category}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor(group.type)}`}>{typeLabel(group.type)}</span>
                        {group.items.length > 1 && (
                          <span className="text-xs text-slate-400">{group.items.length} עסקאות</span>
                        )}
                      </div>
                      <p className="text-base font-bold text-[#105330]">₪{Math.round(group.total).toLocaleString()}</p>
                    </div>

                    {group.confirmed && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Select value={group.month} onValueChange={(v) => updateGroup(index, 'month', v)}>
                          <SelectTrigger className="h-8 w-24 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="month1">חודש 1</SelectItem>
                            <SelectItem value="month2">חודש 2</SelectItem>
                            <SelectItem value="month3">חודש 3</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select
                          value={group.type}
                          onValueChange={(v) => updateGroup(index, 'type', v)}
                        >
                          <SelectTrigger className="h-8 w-24 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">קבועה</SelectItem>
                            <SelectItem value="variable">משתנה</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select
                          value={group.category}
                          onValueChange={(v) => updateGroup(index, 'category', v)}
                        >
                          <SelectTrigger className="h-8 w-36 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-[220px]">
                            <SelectItem value="_fixed_header" disabled className="font-bold text-blue-700 text-xs">— קבועות —</SelectItem>
                            {FIXED_EXPENSES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                            <SelectItem value="_var_header" disabled className="font-bold text-purple-700 text-xs">— משתנות —</SelectItem>
                            {VARIABLE_EXPENSES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <Button
                      variant={group.confirmed ? 'outline' : 'ghost'}
                      size="sm"
                      onClick={() => updateGroup(index, 'confirmed', !group.confirmed)}
                      className={group.confirmed ? 'text-red-500 border-red-200 hover:bg-red-50 text-xs px-2 shrink-0' : 'text-slate-400 text-xs px-2 shrink-0'}
                    >
                      {group.confirmed ? 'הסר' : 'הוסף'}
                    </Button>
                  </div>

                  {/* Expanded transactions */}
                  {expandedGroups[index] && (
                    <div className="px-4 pb-3 pt-0 border-t border-slate-100">
                      <div className="space-y-1 mt-2">
                        {group.items.map((item, ii) => (
                          <div key={ii} className="flex justify-between items-center text-xs text-slate-500 py-0.5">
                            <span className="truncate max-w-xs">{item.description}</span>
                            <span className="font-medium text-slate-600 shrink-0 mr-2">₪{item.amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" onClick={() => { setStep('upload'); setGroupedView([]); }}>
                העלה קובץ אחר
              </Button>
              <Button
                onClick={handleApply}
                disabled={confirmedCount === 0}
                className="bg-[#105330] hover:bg-[#0d4027]"
              >
                <Check className="w-4 h-4 ml-1" />
                אשר ויישם ({confirmedCount} קטגוריות — ₪{Math.round(groupedView.filter(g=>g.confirmed).reduce((s,g)=>s+g.total,0)).toLocaleString()})
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}