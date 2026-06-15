import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Upload, Loader2, Check, AlertCircle, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { ALL_EXPENSE_ITEMS } from './expenseCategories';

const buildClassificationPrompt = (mappingNote = '') => `אתה מומחה לניתוח פיננסי. קיבלת רשימת עסקאות שחולצו מפירוט כרטיס אשראי ישראלי.

## משימתך: סווג כל עסקה מהרשימה לסעיף המתאים.

## רשימת הסעיפים האפשריים (השתמש בדיוק בשמות הבאים):
${ALL_EXPENSE_ITEMS.join(', ')}

## התאמות נפוצות:
- סונול/פז/דלק ישראל → דלק וחניה
- שופרסל/רמי לוי/יוחננוף/מגה/ויקטורי → מזון
- Wolt/תן ביס/Ten Bis → מסעדות וקפה
- בוקינג/אל-על/Airbnb/מלון → חופשה / טיול
- זארה/H&M/Fox/נייק/אדידס → בגדים ונעליים
- נטפליקס/ספוטיפיי/yes/HOT/Apple.com/iCloud → מנויים
- סלקום/פרטנר/HOT מובייל/גולן → טלפון נייד
- מגדל/הראל/כלל/מנורה/הפניקס → ביטוחים (ללא רכב)
- בית מרקחת/קופת חולים → ספורט ובריאות
- ביטוח לאומי → ביטוח לאומי${mappingNote}

החזר JSON תקין בלבד. category חייב להיות אחד מהסעיפים ברשימה למעלה.`;

export default function PDFReflectionImport({ open, onOpenChange, onApply }) {
  const [step, setStep] = useState('upload');
  const [groupedView, setGroupedView] = useState([]);
  const [error, setError] = useState('');
  const [globalMonth, setGlobalMonth] = useState('month1');
  const [expandedGroups, setExpandedGroups] = useState({});
  const fileInputRef = useRef(null);

  const { data: expenseMappings = [] } = useQuery({
    queryKey: ['expenseMappings'],
    queryFn: () => base44.entities.ExpenseMapping.list(),
    staleTime: 60000,
  });

  const getPrompt = () => {
    if (!expenseMappings.length) return buildClassificationPrompt();
    const lines = expenseMappings.map(m => `- "${m.keyword}" → ${m.target_item}`).join('\n');
    return buildClassificationPrompt(`\n\n## מיפויים מותאמים אישית (עדיפות גבוהה):\n${lines}`);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // On mobile (iOS/Android), the MIME type can vary — check by extension too
    const isPDF = file.type === 'application/pdf' || file.type === 'application/x-pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPDF) { setError('יש להעלות קובץ PDF בלבד'); return; }
    setError('');
    setStep('loading');

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Step 1: Extract raw transactions from PDF
      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            transactions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  amount: { type: 'number' }
                }
              }
            }
          }
        }
      });

      const rawTransactions = extracted?.output?.transactions || extracted?.output || [];
      const transactionsText = Array.isArray(rawTransactions)
        ? rawTransactions.map(t => `- ${t.description || t.name || JSON.stringify(t)}: ${t.amount || ''}`).join('\n')
        : JSON.stringify(rawTransactions);

      // Step 2: Classify with LLM using custom mappings
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: getPrompt() + `\n\n## רשימת העסקאות שחולצו מהקובץ:\n${transactionsText}\n\nסווג כל עסקה מהרשימה לעיל.`,
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

      // Group by category
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

  const moveItemToCategory = (groupIndex, itemIndex, newCategory, newType) => {
    setGroupedView(prev => {
      const groups = prev.map(g => ({ ...g, items: [...g.items] }));
      const sourceGroup = groups[groupIndex];
      const [movedItem] = sourceGroup.items.splice(itemIndex, 1);
      sourceGroup.total -= movedItem.amount;

      const targetKey = `${newType}::${newCategory}`;
      const existingIdx = groups.findIndex((g, i) => i !== groupIndex && `${g.type}::${g.category}` === targetKey);

      if (existingIdx >= 0) {
        groups[existingIdx].items.push(movedItem);
        groups[existingIdx].total += movedItem.amount;
      } else {
        groups.push({
          category: newCategory,
          type: newType,
          total: movedItem.amount,
          items: [movedItem],
          confirmed: true,
          month: sourceGroup.month || globalMonth,
        });
      }

      return groups.filter(g => g.items.length > 0).sort((a, b) => b.total - a.total);
    });
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
    setError('');
    setGlobalMonth('month1');
    setExpandedGroups({});
    onOpenChange(false);
  };

  const confirmedCount = groupedView.filter(g => g.confirmed && g.category && g.month).length;
  const totalAmount = groupedView.filter(g => g.confirmed).reduce((s, g) => s + g.total, 0);

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
              <input ref={fileInputRef} type="file" accept="application/pdf,.pdf,application/x-pdf" className="hidden" onChange={handleFileChange} />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              <p className="font-semibold mb-1">💡 איך זה עובד?</p>
              <p>ה-AI יקרא את הקובץ, יזהה ויסווג כל הוצאה לקטגוריה הנכונה, ויאגד הוצאות מאותה קטגוריה. לכל קבוצה תוכל לבחור לאיזה חודש בשיקוף (1/2/3) היא שייכת.</p>
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
                <div key={index} className={`rounded-xl border transition-all ${group.confirmed ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
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
                        <Select value={group.category} onValueChange={(v) => updateGroup(index, 'category', v)}>
                          <SelectTrigger className="h-8 w-36 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-[220px]">
                            {ALL_EXPENSE_ITEMS.map(item => (
                              <SelectItem key={item} value={item}>{item}</SelectItem>
                            ))}
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

                  {expandedGroups[index] && (
                    <div className="px-4 pb-3 pt-0 border-t border-slate-100">
                      <p className="text-xs text-slate-400 mt-2 mb-1">לחץ על קטגוריה כדי להעביר עסקה בודדת:</p>
                      <div className="space-y-1.5">
                        {group.items.map((item, ii) => (
                          <div key={ii} className="flex items-center gap-2 text-xs text-slate-500 py-0.5">
                            <span className="truncate flex-1 text-slate-700">{item.description}</span>
                            <span className="font-medium text-slate-600 shrink-0">₪{item.amount.toLocaleString()}</span>
                            {group.items.length > 1 && (
                              <Select
                                value=""
                                onValueChange={(val) => {
                                  const [newType, ...catParts] = val.split('::');
                                  moveItemToCategory(index, ii, catParts.join('::'), newType);
                                }}
                              >
                                <SelectTrigger className="h-7 w-32 text-xs border-dashed border-orange-300 text-orange-600 hover:border-orange-500">
                                  <SelectValue placeholder="העבר ל..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-[220px]">
                                  {ALL_EXPENSE_ITEMS.filter(c => c !== group.category).map(item => (
                                    <SelectItem key={item} value={`variable::${item}`}>{item}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
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
              <Button onClick={handleApply} disabled={confirmedCount === 0} className="bg-[#105330] hover:bg-[#0d4027]">
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