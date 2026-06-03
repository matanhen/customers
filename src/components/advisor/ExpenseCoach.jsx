import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bot, Plus, Trash2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EXPENSE_CATEGORIES, ALL_EXPENSE_ITEMS } from '../financial/expenseCategories';

export default function ExpenseCoach() {
  const [open, setOpen] = useState(false);
  const [naturalInput, setNaturalInput] = useState('');
  const [parsedRule, setParsedRule] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [manualKeyword, setManualKeyword] = useState('');
  const [manualItem, setManualItem] = useState('');
  const [manualCategory, setManualCategory] = useState('');
  const queryClient = useQueryClient();

  const { data: mappings = [] } = useQuery({
    queryKey: ['expenseMappings'],
    queryFn: () => base44.entities.ExpenseMapping.list('-created_date', 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ExpenseMapping.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseMappings'] });
      setNaturalInput('');
      setParsedRule(null);
      setManualKeyword('');
      setManualItem('');
      setManualCategory('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ExpenseMapping.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenseMappings'] }),
  });

  const parseNaturalLanguage = async () => {
    if (!naturalInput.trim()) return;
    setParsing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are helping classify expense keywords for an Israeli personal finance app.
The user wrote: "${naturalInput}"

Extract:
1. The keyword/vendor name that should be recognized (e.g. "סונול", "שופרסל")
2. The target expense item from this list: ${ALL_EXPENSE_ITEMS.join(', ')}
3. The category key it belongs to

Available categories and items:
${EXPENSE_CATEGORIES.map(c => `${c.key}: ${c.items.join(', ')}`).join('\n')}

Respond with JSON only:
{
  "keyword": "the keyword",
  "target_item": "exact item name from list",
  "target_category": "category key"
}`,
        response_json_schema: {
          type: 'object',
          properties: {
            keyword: { type: 'string' },
            target_item: { type: 'string' },
            target_category: { type: 'string' },
          },
        },
      });
      setParsedRule(result);
    } catch (e) {
      console.error(e);
    }
    setParsing(false);
  };

  const saveRule = (keyword, target_item, target_category) => {
    if (!keyword || !target_item || !target_category) return;
    createMutation.mutate({ keyword: keyword.trim(), target_item, target_category });
  };

  // When manual category changes, reset item
  const handleManualCategoryChange = (catKey) => {
    setManualCategory(catKey);
    setManualItem('');
  };

  const manualCatItems = EXPENSE_CATEGORIES.find(c => c.key === manualCategory)?.items || [];

  return (
    <Card className="border-0 shadow-xl mb-6 overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-[#105330] via-[#c8a863] to-[#105330]" />
      <CardHeader
        className="cursor-pointer hover:bg-slate-50 transition-colors pb-3"
        onClick={() => setOpen(o => !o)}
      >
        <CardTitle className="flex items-center justify-between text-[#105330]">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            מאמן הוצאות – כללי סיווג חכם
            <span className="text-xs bg-[#105330]/10 text-[#105330] px-2 py-0.5 rounded-full font-normal">
              {mappings.length} כללים
            </span>
          </div>
          {open ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </CardTitle>
      </CardHeader>

      {open && (
        <CardContent className="space-y-6">
          {/* Natural language input */}
          <div className="bg-gradient-to-br from-[#105330]/5 to-[#c8a863]/5 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-[#105330] font-semibold text-sm">
              <Sparkles className="w-4 h-4" />
              הוסף כלל בשפה טבעית
            </div>
            <p className="text-xs text-slate-500">לדוגמה: "מעכשיו כל פעם שרשום סונול, תדע לשייך את זה לדלק"</p>
            <div className="flex gap-2">
              <Input
                value={naturalInput}
                onChange={e => setNaturalInput(e.target.value)}
                placeholder='כתוב משפט בעברית...'
                className="flex-1"
                onKeyDown={e => e.key === 'Enter' && parseNaturalLanguage()}
              />
              <Button
                onClick={parseNaturalLanguage}
                disabled={parsing || !naturalInput.trim()}
                className="bg-[#105330] hover:bg-[#0d4027] whitespace-nowrap"
              >
                {parsing ? 'מנתח...' : 'נתח'}
              </Button>
            </div>

            {parsedRule && (
              <div className="bg-white rounded-xl p-3 border border-[#c8a863]/40 space-y-2">
                <p className="text-xs text-slate-500 font-semibold">הבנתי – הכלל הוא:</p>
                <div className="flex flex-wrap gap-2 items-center text-sm">
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-mono">{parsedRule.keyword}</span>
                  <span className="text-slate-400">→</span>
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg">{parsedRule.target_item}</span>
                  <span className="text-slate-400 text-xs">({parsedRule.target_category})</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="bg-[#105330] hover:bg-[#0d4027]" onClick={() => saveRule(parsedRule.keyword, parsedRule.target_item, parsedRule.target_category)}>
                    שמור כלל
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setParsedRule(null)}>ביטול</Button>
                </div>
              </div>
            )}
          </div>

          {/* Manual rule */}
          <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-700">הוסף כלל ידני</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">מילת מפתח / שם ספק</Label>
                <Input value={manualKeyword} onChange={e => setManualKeyword(e.target.value)} placeholder="לדוגמה: סונול" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">קטגוריה</Label>
                <Select value={manualCategory} onValueChange={handleManualCategoryChange}>
                  <SelectTrigger><SelectValue placeholder="בחר קטגוריה" /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">סעיף יעד</Label>
                <Select value={manualItem} onValueChange={setManualItem} disabled={!manualCategory}>
                  <SelectTrigger><SelectValue placeholder="בחר סעיף" /></SelectTrigger>
                  <SelectContent>
                    {manualCatItems.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-[#105330] hover:bg-[#0d4027]"
              disabled={!manualKeyword || !manualItem || !manualCategory || createMutation.isPending}
              onClick={() => saveRule(manualKeyword, manualItem, manualCategory)}
            >
              <Plus className="w-4 h-4 ml-1" />
              הוסף כלל
            </Button>
          </div>

          {/* Existing mappings */}
          {mappings.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">כללים קיימים ({mappings.length})</p>
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {mappings.map(m => (
                  <div key={m.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">{m.keyword}</span>
                      <span className="text-slate-400">→</span>
                      <span className="text-slate-700">{m.target_item}</span>
                      <span className="text-slate-400 text-xs">({m.target_category})</span>
                    </div>
                    <button onClick={() => deleteMutation.mutate(m.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}