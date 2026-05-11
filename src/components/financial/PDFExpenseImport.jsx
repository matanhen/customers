import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Upload, Loader2, Check, AlertCircle, FileText, ChevronDown, ChevronUp } from 'lucide-react';

const FIXED_EXPENSE_CATEGORIES = [
  'ביטוחי רכב','טסט','משכנתא','ביטוח משכנתא','שכירות','מנויים',
  'ביטוחים (ללא רכב)','ועד בית','ארנונה','החזר הלוואות','הוראות קבע'
];

const VARIABLE_EXPENSE_CATEGORIES = [
  'מים','חשמל','גז','תספורת וקוסמטיקה','חינוך','חוגים וקייטנות','בריאות',
  'תיקוני רכב','עמלות וריביות בנקים','טיפולי שיניים','אופטיקה','חגים ויהדות',
  'טלפון נייד','סופר פארם','דברים לבית','ביטוח לאומי','מזון','דלק וחניה',
  'תחבורה ציבורית','סיגריות','עוזרת / בייביסיטר','ביט','מזומן','בילויים',
  'בגדים ונעליים','תרומות','התפתחות אישית','חופשה / טיול','בעלי חיים','מתנות ואירועים'
];

const CLASSIFICATION_PROMPT = `אתה מומחה לניתוח פיננסי של משקי בית ישראליים. קרא את קובץ ה-PDF המצורף (פירוט עסקאות בנק/אשראי) וחלץ את כל ההוצאות.

## חוקים קריטיים:
- כלול רק הוצאות, לא הכנסות ולא העברות בין חשבונות
- אל תכלול עסקאות זיכוי (החזרים), אלא אם הן מופיעות במינוס
- סכום תמיד חיובי
- כל עסקה עם שם ספק ברור היא הוצאה

## קטגוריות הוצאות קבועות (fixed) - חוזרות כל חודש:
- **ביטוחי רכב**: ביטוח חובה, ביטוח מקיף לרכב, ביטוח בהקשר של רכב/אוטו/מכונית
- **טסט**: תשלום לטסט, רישיון רכב שנתי
- **משכנתא**: תשלום משכנתא, הלוואת בנק לדיור
- **ביטוח משכנתא**: ביטוח חיים על משכנתא, ביטוח מבנה
- **שכירות**: דמי שכירות, שכר דירה
- **מנויים**: נטפליקס, ספוטיפיי, yes, HOT, Wolt Plus, Amazon Prime, YouTube Premium, iCloud, Google One, מנוי חודשי דיגיטלי, חדר כושר, בריכה
- **ביטוחים (ללא רכב)**: מגדל, הראל, כלל, מנורה, הפניקס, ביטוח בריאות פרטי, ביטוח חיים
- **ועד בית**: ועד בית, תשלום לבניין
- **ארנונה**: ארנונה, עיריית...
- **החזר הלוואות**: החזר הלוואה, תשלום אשראי, החזר כרטיס
- **הוראות קבע**: הוראות קבע אחרות

## קטגוריות יתרת הוצאות (variable):
- **מים**: תשלום למים, חברת מקורות
- **חשמל**: חברת חשמל, IEC
- **גז**: גז, רסניק, גז ישראל, ליברה גז
- **תספורת וקוסמטיקה**: מספרה, סלון יופי, קוסמטיקה, ציפורניים
- **חינוך**: שכר לימוד, אוניברסיטה, מכללה, בית ספר, גן ילדים, פעוטון
- **חוגים וקייטנות**: חוג כדורגל, חוג מוזיקה, קייטנה, ספורט ילדים
- **בריאות**: בית מרקחת, קופת חולים, מרפאה, רופא, ניתוח (לא סופר-פארם קוסמטיקה)
- **תיקוני רכב**: מוסך, תיקון רכב, החלפת שמן, החלפת גלגלים
- **עמלות וריביות בנקים**: עמלת ניהול חשבון, ריבית, עמלת העברה
- **טיפולי שיניים**: שיניים, אורתודנטיה, קליניקת שיניים
- **אופטיקה**: משקפיים, עדשות מגע, אופטיקנה
- **חגים ויהדות**: ספרי תורה, בית כנסת, הכנה לחג, מצות
- **טלפון נייד**: סלקום, פרטנר, HOT מובייל, 012, רמי לוי סלולר, גולן טלקום, סימפל
- **סופר פארם**: סופר-פארם (קניות כלליות שאינן תרופות)
- **דברים לבית**: איקאה, HOME CENTER, ACE, זארה הום, ציוד לבית
- **ביטוח לאומי**: ביטוח לאומי, מס בריאות
- **מזון**: רמי לוי, שופרסל, מגה, ויקטורי, יוחננוף, AM:PM, סופרמרקט, מסעדה, קפה, פיצה, מקדונלד'ס, בורגר קינג, שווארמה, Wolt, Ten Bis, תן ביס, אוכל
- **דלק וחניה**: דלק, סונול, פז, כלי שמן, חניה, פנגו
- **תחבורה ציבורית**: רב קו, אוטובוס, רכבת ישראל
- **סיגריות**: סיגריות, טבק
- **עוזרת / בייביסיטר**: בייביסיטר, עוזרת בית, ניקיון
- **ביט**: ביט, העברת ביט (כשלא ברור מה ההוצאה)
- **מזומן**: משיכת מזומן, ATM, כספומט
- **בילויים**: סרט, קולנוע, קונצרט, כדורגל, אירוע, פאב, בר
- **בגדים ונעליים**: זארה, H&M, Fox, מנגו, קסטרו, אדידס, נייק, נעליים, ביגוד
- **תרומות**: תרומה, צדקה
- **התפתחות אישית**: קורס, ספר, סדנה, coaching, אימון אישי
- **חופשה / טיול**: מלון, צימר, בוקינג, Airbnb, טיסה, אל-על, פארק מים
- **בעלי חיים**: וטרינר, אוכל לכלב/חתול, חנות חיות
- **מתנות ואירועים**: מתנה, חתונה, בר מצווה, מסיבה

אם הוצאה לא מתאימה לאף קטגוריה — סמן expense_type כ-custom.
החזר JSON תקין בלבד. category חייב להיות בדיוק כפי שמופיע ברשימות.`;

export default function PDFExpenseImport({ open, onOpenChange, onApply }) {
  const [step, setStep] = useState('upload');
  const [groupedView, setGroupedView] = useState([]);
  const [error, setError] = useState('');
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
                  expense_type: { type: 'string', enum: ['fixed', 'variable', 'custom'] },
                  category: { type: 'string' },
                  custom_name: { type: 'string' }
                }
              }
            }
          }
        }
      });

      // Group by category and sum
      const grouped = {};
      (result.expenses || []).forEach(exp => {
        if (!exp.amount || exp.amount <= 0) return;
        const isCustom = exp.expense_type === 'custom';
        const type = isCustom ? 'variable' : (exp.expense_type || 'variable');
        const cat = isCustom ? '' : (exp.category || '');
        const customName = isCustom ? (exp.custom_name || exp.description || '') : '';
        const key = isCustom ? `custom::${customName}` : `${type}::${cat}`;

        if (!grouped[key]) {
          grouped[key] = { category: cat, type, total: 0, items: [], confirmed: true, isCustom, customName };
        }
        grouped[key].total += exp.amount;
        grouped[key].items.push({ description: exp.description, amount: exp.amount });
      });

      setGroupedView(Object.values(grouped).sort((a, b) => b.total - a.total));
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

  const handleApply = () => {
    const validItems = groupedView
      .filter(g => g.confirmed && g.amount !== 0 && (g.isCustom ? g.customName : g.category))
      .map(g => ({
        description: g.isCustom ? g.customName : g.category,
        amount: Math.round(g.total),
        type: g.type,
        category: g.isCustom ? g.customName : g.category,
        isCustom: g.isCustom,
        customName: g.customName,
        confirmed: true,
      }));
    onApply(validItems);
    handleClose();
  };

  const handleClose = () => {
    setStep('upload');
    setGroupedView([]);
    setError('');
    setExpandedGroups({});
    onOpenChange(false);
  };

  const confirmedCount = groupedView.filter(g => g.confirmed && (g.isCustom ? g.customName : g.category)).length;
  const totalAmount = groupedView.filter(g => g.confirmed).reduce((s, g) => s + g.total, 0);
  const typeColor = (t) => t === 'fixed' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700';
  const typeLabel = (t) => t === 'fixed' ? 'קבועה' : 'משתנה';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#105330]" />
            ייבוא הוצאות מקובץ PDF
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
              <p>ה-AI יקרא את הקובץ, יזהה כל הוצאה בדיוק גבוה, ויאגד אותן לפי קטגוריות. תוכל לעבור על הפילוח ולשנות לפני האישור.</p>
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
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <p className="font-semibold text-emerald-800">זוהו {groupedView.length} קטגוריות הוצאות</p>
              <p className="text-sm text-emerald-600">סה"כ: ₪{Math.round(totalAmount).toLocaleString()}</p>
            </div>

            <div className="space-y-2 max-h-[450px] overflow-y-auto">
              {groupedView.map((group, index) => (
                <div
                  key={index}
                  className={`rounded-xl border transition-all ${group.confirmed ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-50'}`}
                >
                  <div className="flex items-center gap-3 p-3">
                    <button
                      onClick={() => setExpandedGroups(prev => ({ ...prev, [index]: !prev[index] }))}
                      className="text-slate-400 hover:text-slate-600 shrink-0"
                    >
                      {expandedGroups[index] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800 text-sm">
                          {group.isCustom ? (group.customName || 'הוצאה לא מסווגת') : group.category}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor(group.type)}`}>{typeLabel(group.type)}</span>
                        {group.isCustom && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">לא מסווג</span>}
                        {group.items.length > 1 && <span className="text-xs text-slate-400">{group.items.length} עסקאות</span>}
                      </div>
                      <p className="text-base font-bold text-[#105330]">₪{Math.round(group.total).toLocaleString()}</p>
                    </div>

                    {group.confirmed && (
                      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        <Select value={group.type} onValueChange={(v) => updateGroup(index, 'type', v)}>
                          <SelectTrigger className="h-8 w-24 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">קבועה</SelectItem>
                            <SelectItem value="variable">משתנה</SelectItem>
                          </SelectContent>
                        </Select>
                        {group.isCustom ? (
                          <Input
                            value={group.customName}
                            onChange={(e) => updateGroup(index, 'customName', e.target.value)}
                            placeholder="שם הוצאה"
                            className="h-8 text-xs w-36"
                          />
                        ) : (
                          <Select value={group.category} onValueChange={(v) => updateGroup(index, 'category', v)}>
                            <SelectTrigger className="h-8 w-36 text-xs">
                              <SelectValue placeholder="קטגוריה" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[220px]">
                              <SelectItem value="_f" disabled className="font-bold text-blue-700 text-xs">— קבועות —</SelectItem>
                              {FIXED_EXPENSE_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                              <SelectItem value="_v" disabled className="font-bold text-purple-700 text-xs">— משתנות —</SelectItem>
                              {VARIABLE_EXPENSE_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
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