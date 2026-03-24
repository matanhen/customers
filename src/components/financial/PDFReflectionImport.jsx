import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Upload, Loader2, Check, AlertCircle, FileText } from 'lucide-react';

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

export default function PDFReflectionImport({ open, onOpenChange, onApply }) {
  const [step, setStep] = useState('upload'); // upload | loading | review
  const [parsedItems, setParsedItems] = useState([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('יש להעלות קובץ PDF בלבד');
      return;
    }
    setError('');
    setStep('loading');

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `אתה מערכת לניתוח הוצאות פיננסיות. קרא את קובץ ה-PDF המצורף (פירוט עסקאות/דף חשבון בנק/אשראי) וחלץ ממנו את כל ההוצאות.

עבור כל הוצאה שאתה מוצא, שייך אותה לאחת מהקטגוריות הבאות:

הוצאות קבועות (fixed): ${FIXED_EXPENSES.join(', ')}

יתרת הוצאות (variable): ${VARIABLE_EXPENSES.join(', ')}

אם הוצאה לא מתאימה - שייך לקטגוריה הכי קרובה.
אל תכלול הכנסות, רק הוצאות.
אל תכלול העברות בין חשבונות.
כל הוצאות בקובץ הן מחודש אחד - שייך הכל לחודש 1 כברירת מחדל.

החזר JSON תקין בלבד.`,
        file_urls: [file_url],
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

      const items = (result.expenses || []).map(exp => ({
        description: exp.description,
        amount: exp.amount,
        type: exp.expense_type || 'variable',
        category: exp.category || '',
        month: 'month1',
        confirmed: true,
      }));

      setParsedItems(items);
      setStep('review');
    } catch (err) {
      setError('שגיאה בעיבוד הקובץ. נסה שנית.');
      setStep('upload');
    }
    e.target.value = '';
  };

  const updateItem = (index, field, value) => {
    setParsedItems(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const handleApply = () => {
    const validItems = parsedItems.filter(i => i.confirmed && i.amount > 0 && i.category && i.month);
    onApply(validItems);
    handleClose();
  };

  const handleClose = () => {
    setStep('upload');
    setParsedItems([]);
    setError('');
    onOpenChange(false);
  };

  const confirmedCount = parsedItems.filter(i => i.confirmed && i.category && i.month).length;

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
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              <p className="font-semibold mb-1">💡 איך זה עובד?</p>
              <p>ה-AI יקרא את הקובץ, יזהה ההוצאות וישייך לקטגוריות. לכל הוצאה תוכל לבחור לאיזה חודש בשיקוף (1/2/3) היא שייכת.</p>
            </div>
          </div>
        )}

        {step === 'loading' && (
          <div className="py-16 text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-[#105330] mx-auto" />
            <p className="text-slate-700 font-medium">מנתח את הקובץ...</p>
            <p className="text-slate-400 text-sm">ה-AI מזהה ומשייך את ההוצאות לקטגוריות</p>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4 py-2">
            <div className="p-3 bg-emerald-50 rounded-lg text-sm text-emerald-800">
              <p className="font-semibold">נמצאו {parsedItems.length} הוצאות. בחר לכל אחת קטגוריה וחודש:</p>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {parsedItems.map((item, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border transition-all ${
                    item.confirmed ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{item.description}</p>
                      <p className="text-lg font-bold text-[#105330]">₪{item.amount.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.confirmed && item.category && <Check className="w-4 h-4 text-emerald-600" />}
                      <Button
                        variant={item.confirmed ? 'outline' : 'ghost'}
                        size="sm"
                        onClick={() => updateItem(index, 'confirmed', !item.confirmed)}
                        className={item.confirmed ? 'text-red-500 border-red-200 hover:bg-red-50 text-xs px-2' : 'text-slate-400 text-xs px-2'}
                      >
                        {item.confirmed ? 'הסר' : 'הוסף'}
                      </Button>
                    </div>
                  </div>

                  {item.confirmed && (
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs mb-1 text-slate-500">סוג</Label>
                        <Select
                          value={item.type}
                          onValueChange={(v) => {
                            updateItem(index, 'type', v);
                            updateItem(index, 'category', '');
                          }}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">קבועה</SelectItem>
                            <SelectItem value="variable">יתרת הוצאות</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs mb-1 text-slate-500">קטגוריה</Label>
                        <Select
                          value={item.category}
                          onValueChange={(v) => updateItem(index, 'category', v)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="בחר" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px]">
                            {(item.type === 'fixed' ? FIXED_EXPENSES : VARIABLE_EXPENSES).map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs mb-1 text-slate-500">חודש בשיקוף</Label>
                        <Select
                          value={item.month}
                          onValueChange={(v) => updateItem(index, 'month', v)}
                        >
                          <SelectTrigger className="h-8 text-sm">
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
                  )}
                </div>
              ))}
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" onClick={() => { setStep('upload'); setParsedItems([]); }}>
                העלה קובץ אחר
              </Button>
              <Button
                onClick={handleApply}
                disabled={confirmedCount === 0}
                className="bg-[#105330] hover:bg-[#0d4027]"
              >
                <Check className="w-4 h-4 ml-1" />
                אשר ויישם ({confirmedCount} הוצאות)
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}