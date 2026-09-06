import React, { useState } from 'react';
import { Plus, Trash2, Check, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from './financialPlanSteps';

export default function PlanActionItems({ actions = [], onChange, editable, isClient }) {
  const [newAction, setNewAction] = useState({ name: '', amount: '', due_date: '', note: '' });

  const toggleComplete = (id) => {
    onChange(actions.map(a => a.id === id ? { ...a, completed: !a.completed } : a));
  };

  const deleteAction = (id) => {
    onChange(actions.filter(a => a.id !== id));
  };

  const addAction = () => {
    if (!newAction.name.trim()) return;
    const action = {
      id: `act_${Date.now()}`,
      name: newAction.name.trim(),
      amount: Number(newAction.amount) || 0,
      completed: false,
      due_date: newAction.due_date || '',
      note: newAction.note || '',
    };
    onChange([...actions, action]);
    setNewAction({ name: '', amount: '', due_date: '', note: '' });
  };

  const completedCount = actions.filter(a => a.completed).length;
  const totalSavings = actions.filter(a => a.completed).reduce((s, a) => s + (a.amount || 0), 0);

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#105330]">תוכנית פעולה</CardTitle>
          {actions.length > 0 && (
            <div className="text-sm text-slate-500">
              {completedCount}/{actions.length} הושלמו · חיסכון {formatCurrency(totalSavings)}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.length === 0 && (
          <p className="text-slate-400 text-sm text-center py-4">אין פעולות עדיין</p>
        )}
        {actions.map(action => (
          <div
            key={action.id}
            className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
              action.completed ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200'
            }`}
          >
            <button
              onClick={() => toggleComplete(action.id)}
              disabled={!editable && !isClient}
              className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                action.completed
                  ? 'bg-[#105330] border-[#105330]'
                  : 'border-slate-300 hover:border-[#105330]'
              } ${(!editable && !isClient) ? 'cursor-default' : 'cursor-pointer'}`}
            >
              {action.completed && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={`font-medium ${action.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                  {action.name}
                </span>
                {action.amount > 0 && (
                  <span className="text-sm font-bold text-[#105330] whitespace-nowrap">
                    {formatCurrency(action.amount)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                {action.due_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {action.due_date}
                  </span>
                )}
                {action.note && <span className="truncate">{action.note}</span>}
              </div>
            </div>
            {editable && (
              <button
                onClick={() => deleteAction(action.id)}
                className="text-slate-300 hover:text-red-500 p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}

        {editable && (
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">שם הפעולה</Label>
                <Input
                  value={newAction.name}
                  onChange={e => setNewAction({ ...newAction, name: e.target.value })}
                  placeholder="לדוגמה: ביטול מנוי"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">סכום משוער (₪)</Label>
                <Input
                  type="number"
                  value={newAction.amount}
                  onChange={e => setNewAction({ ...newAction, amount: e.target.value })}
                  placeholder="0"
                  className="text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">תאריך יעד</Label>
                <Input
                  type="date"
                  value={newAction.due_date}
                  onChange={e => setNewAction({ ...newAction, due_date: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">הערה</Label>
                <Input
                  value={newAction.note}
                  onChange={e => setNewAction({ ...newAction, note: e.target.value })}
                  placeholder="הערת יועץ"
                  className="text-sm"
                />
              </div>
            </div>
            <Button
              onClick={addAction}
              disabled={!newAction.name.trim()}
              size="sm"
              className="bg-[#105330] hover:bg-[#0d4027] w-full"
            >
              <Plus className="w-4 h-4 ml-1" />
              הוסף פעולה
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}