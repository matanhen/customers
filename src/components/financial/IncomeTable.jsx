import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MONTHS = ['month1','month2','month3','month4','month5','month6'];
const MONTH_LABELS = ['חודש 1','חודש 2','חודש 3','חודש 4','חודש 5','חודש 6'];

const DEFAULT_ROWS = [
  { id: 'income_male', name: 'הכנסות (גבר)', category: 'personal', locked: false },
  { id: 'income_female', name: 'הכנסות (אישה)', category: 'personal', locked: false },
];

export default function IncomeTable({ rows, onChange, pensionMaleMonthly = 0, pensionFemaleMonthly = 0, disabled = false }) {
  const [newRowName, setNewRowName] = useState('');
  const [newRowCategory, setNewRowCategory] = useState('personal');

  const activeRows = rows && rows.length > 0 ? rows : DEFAULT_ROWS.map(r => ({
    ...r,
    ...Object.fromEntries(MONTHS.map(m => [m, 0])),
  }));

  const updateCell = (rowId, month, value) => {
    const updated = activeRows.map(r =>
      r.id === rowId ? { ...r, [month]: parseFloat(value) || 0 } : r
    );
    onChange(updated);
  };

  const updateName = (rowId, name) => {
    const updated = activeRows.map(r => r.id === rowId ? { ...r, name } : r);
    onChange(updated);
  };

  const addRow = () => {
    if (!newRowName.trim()) return;
    const newRow = {
      id: `row_${Date.now()}`,
      name: newRowName.trim(),
      category: newRowCategory,
      ...Object.fromEntries(MONTHS.map(m => [m, 0])),
    };
    onChange([...activeRows, newRow]);
    setNewRowName('');
  };

  const deleteRow = (rowId) => {
    onChange(activeRows.filter(r => r.id !== rowId));
  };

  const getRowAvg = (row) => Math.round(MONTHS.reduce((s, m) => s + (row[m] || 0), 0) / 6);

  const personalRows = activeRows.filter(r => r.category === 'personal');
  const investmentRows = activeRows.filter(r => r.category === 'investment');

  const personalTotal = personalRows.reduce((s, r) => s + getRowAvg(r), 0);
  const investmentTotal = investmentRows.reduce((s, r) => s + getRowAvg(r), 0);
  const pensionTotal = pensionMaleMonthly + pensionFemaleMonthly;
  const netTotal = personalTotal + investmentTotal;
  const grandTotal = netTotal + pensionTotal;

  const renderSection = (sectionRows, label, color) => (
    <div className="mb-6">
      <div className={`px-4 py-2 rounded-t-lg font-bold text-white text-sm ${color}`}>{label}</div>
      <div className="border border-slate-200 rounded-b-lg overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-right px-3 py-2 font-semibold text-slate-600 w-40">מקור הכנסה</th>
              {MONTH_LABELS.map((l, i) => (
                <th key={i} className="text-center px-2 py-2 font-semibold text-slate-600">{l}</th>
              ))}
              <th className="text-center px-2 py-2 font-semibold text-slate-600">ממוצע</th>
              {!disabled && <th className="w-8"></th>}
            </tr>
          </thead>
          <tbody>
            {sectionRows.map((row, idx) => (
              <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                <td className="px-3 py-1.5">
                  <Input
                    value={row.name}
                    onChange={e => updateName(row.id, e.target.value)}
                    className="h-8 text-xs border-slate-200 min-w-[100px]"
                    disabled={disabled}
                    dir="rtl"
                  />
                </td>
                {MONTHS.map(m => (
                  <td key={m} className="px-1 py-1.5">
                    <Input
                      type="number"
                      value={row[m] || ''}
                      onChange={e => updateCell(row.id, m, e.target.value)}
                      className="h-8 text-xs text-center border-slate-200 w-20"
                      placeholder="0"
                      disabled={disabled}
                      dir="ltr"
                    />
                  </td>
                ))}
                <td className="px-2 py-1.5 text-center font-semibold text-emerald-700">
                  ₪{getRowAvg(row).toLocaleString()}
                </td>
                {!disabled && (
                  <td className="px-1">
                    <button onClick={() => deleteRow(row.id)} className="text-slate-300 hover:text-red-400 transition-colors p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white/80" dir="rtl">
      <CardHeader className="pb-3">
        <CardTitle className="text-slate-800 text-lg">טבלת הכנסות - 6 חודשים אחרונים</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {renderSection(personalRows, 'הכנסות מיגיעה אישית', 'bg-emerald-600')}
        {renderSection(investmentRows, 'תזרים מהשקעות', 'bg-teal-600')}

        {/* Pension row (read-only) */}
        {pensionTotal > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
            <span className="text-blue-700 font-semibold text-sm">הפרשות פנסיוניות (אוטומטי מנתוני הפנסיה)</span>
            <span className="text-blue-700 font-bold">₪{pensionTotal.toLocaleString()} / חודש</span>
          </div>
        )}

        {/* Summary */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-1">
          <div className="flex justify-between text-sm text-slate-600">
            <span>סה"כ הכנסות נטו (ללא פנסיוני):</span>
            <span className="font-bold text-emerald-700">₪{netTotal.toLocaleString()}</span>
          </div>
          {pensionTotal > 0 && (
            <div className="flex justify-between text-sm text-slate-600">
              <span>סה"כ כולל הפרשות פנסיוניות:</span>
              <span className="font-bold text-emerald-700">₪{grandTotal.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Add Row */}
        {!disabled && (
          <div className="flex gap-2 pt-2 flex-wrap">
            <Input
              value={newRowName}
              onChange={e => setNewRowName(e.target.value)}
              placeholder="שם מקור הכנסה"
              className="flex-1 min-w-[160px]"
              onKeyDown={e => e.key === 'Enter' && addRow()}
              dir="rtl"
            />
            <Select value={newRowCategory} onValueChange={setNewRowCategory}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">יגיעה אישית</SelectItem>
                <SelectItem value="investment">תזרים מהשקעות</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={addRow} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-4 h-4 ml-1" />הוסף שורה
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}