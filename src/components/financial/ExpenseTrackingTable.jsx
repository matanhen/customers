import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EXPENSE_CATEGORIES, getItemWeekAmount, setItemWeekAmount, getItemMonthTotal } from './expenseCategories';

/**
 * Like ExpensesTable but for a single month, broken down into 4 financial weeks.
 * expenses = { [catKey]: { [itemName]: number | { week1, week2, week3, week4 } } }
 * selectedWeek: 1-4, which week's amounts are shown/edited
 * onChange(updatedExpenses)
 *
 * Layout: 3 expense categories per row on desktop (1 per row on mobile), each a
 * collapsible card. All categories are collapsed by default.
 */
export default function ExpenseTrackingTable({ expenses = {}, selectedWeek = 1, onChange, disabled = false }) {
  // All categories collapsed by default — user opens a category to add expenses.
  const [expandedCategories, setExpandedCategories] = useState(
    () => Object.fromEntries(EXPENSE_CATEGORIES.map(cat => [cat.key, false]))
  );
  const [newItemName, setNewItemName] = useState({});

  const toggleCategory = (key) => {
    setExpandedCategories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateCell = (catKey, itemName, value) => {
    const currentEntry = (expenses[catKey] || {})[itemName];
    const updated = {
      ...expenses,
      [catKey]: {
        ...(expenses[catKey] || {}),
        [itemName]: setItemWeekAmount(currentEntry, selectedWeek, parseFloat(value) || 0),
      },
    };
    onChange(updated);
  };

  const deleteItem = (catKey, itemName) => {
    const catData = { ...(expenses[catKey] || {}) };
    delete catData[itemName];
    onChange({ ...expenses, [catKey]: catData });
  };

  const addCustomItem = (catKey) => {
    const name = (newItemName[catKey] || '').trim();
    if (!name) return;
    const updated = {
      ...expenses,
      [catKey]: {
        ...(expenses[catKey] || {}),
        [name]: { week1: 0, week2: 0, week3: 0, week4: 0 },
      },
    };
    onChange(updated);
    setNewItemName(prev => ({ ...prev, [catKey]: '' }));
  };

  // Category/grand totals always reflect the FULL month (sum of all 4 weeks)
  const getCategoryTotal = (catKey) => {
    const catData = expenses[catKey] || {};
    return Math.round(Object.values(catData).reduce((s, entry) => s + getItemMonthTotal(entry), 0));
  };

  const grandTotal = EXPENSE_CATEGORIES.reduce((s, cat) => s + getCategoryTotal(cat.key), 0);

  return (
    <Card className="border border-slate-200/70 shadow-xl shadow-slate-200/40 bg-white/90 w-full overflow-hidden" dir="rtl">
      <CardHeader className="pb-3 bg-gradient-to-l from-slate-50 to-transparent border-b border-slate-100">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-slate-800 text-base sm:text-lg">טבלת מעקב הוצאות</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">עריכה עבור שבוע {selectedWeek} - הסכומים מוצגים כסה"כ חודשי</p>
          </div>
          <div className="bg-gradient-to-l from-rose-500 to-rose-400 text-white rounded-full px-4 py-1.5 font-bold text-sm shadow-sm">
            סה"כ לחודש: ₪{grandTotal.toLocaleString()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {EXPENSE_CATEGORIES.map(cat => {
            const isExpanded = expandedCategories[cat.key];
            const catTotal = getCategoryTotal(cat.key);
            const catData = expenses[cat.key] || {};
            const customItems = Object.keys(catData).filter(item => !cat.items.includes(item));

            return (
              <div key={cat.key} className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                <button
                  onClick={() => toggleCategory(cat.key)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-l from-slate-50 to-white hover:from-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />}
                    <span className="font-semibold text-slate-700 text-sm">{cat.label}</span>
                  </div>
                  <span className={`font-bold text-sm flex-shrink-0 ${catTotal > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                    ₪{catTotal.toLocaleString()}
                  </span>
                </button>

                {isExpanded && (
                  <div className="p-2.5 sm:p-3 space-y-2">
                    <div className="w-full overflow-x-auto">
                      <table className="w-full text-sm" style={{ minWidth: 240 }}>
                        <thead>
                          <tr className="text-slate-400 text-[11px] uppercase tracking-wide">
                            <th className="text-right pb-2 font-medium pr-1">סעיף</th>
                            <th className="pb-2 font-medium text-center w-20">שבוע {selectedWeek}</th>
                            <th className="pb-2 font-medium text-center w-20">חודשי</th>
                            {!disabled && <th className="w-8"></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {cat.items.map(item => {
                            const monthTotal = getItemMonthTotal(catData[item]);
                            return (
                              <tr key={item} className="border-t border-slate-100/80">
                                <td className="py-1.5 pr-1 text-slate-600 text-xs">{item}</td>
                                <td className="py-1 px-0.5">
                                  <Input
                                    type="number"
                                    value={getItemWeekAmount(catData[item], selectedWeek) || ''}
                                    onChange={e => updateCell(cat.key, item, e.target.value)}
                                    className="h-7 text-xs text-center border-slate-200 px-1 rounded-md"
                                    placeholder="0"
                                    disabled={disabled}
                                    dir="ltr"
                                  />
                                </td>
                                <td className="py-1 px-0.5 text-center text-xs font-semibold text-slate-600 select-none">
                                  {monthTotal > 0 ? `₪${monthTotal.toLocaleString()}` : '—'}
                                </td>
                                {!disabled && <td className="w-8"></td>}
                              </tr>
                            );
                          })}
                          {customItems.map(item => {
                            const monthTotal = getItemMonthTotal(catData[item]);
                            return (
                              <tr key={item} className="border-t border-slate-100/80 bg-blue-50/40">
                                <td className="py-1.5 pr-1 text-blue-700 text-xs font-medium">{item}</td>
                                <td className="py-1 px-0.5">
                                  <Input
                                    type="number"
                                    value={getItemWeekAmount(catData[item], selectedWeek) || ''}
                                    onChange={e => updateCell(cat.key, item, e.target.value)}
                                    className="h-7 text-xs text-center border-blue-200 px-1 rounded-md"
                                    placeholder="0"
                                    disabled={disabled}
                                    dir="ltr"
                                  />
                                </td>
                                <td className="py-1 px-0.5 text-center text-xs font-semibold text-slate-600 select-none">
                                  {monthTotal > 0 ? `₪${monthTotal.toLocaleString()}` : '—'}
                                </td>
                                {!disabled && (
                                  <td className="w-8">
                                    <button onClick={() => deleteItem(cat.key, item)} className="text-slate-300 hover:text-red-400">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {!disabled && (
                      <div className="flex gap-2 pt-1">
                        <Input
                          value={newItemName[cat.key] || ''}
                          onChange={e => setNewItemName(prev => ({ ...prev, [cat.key]: e.target.value }))}
                          placeholder="הוסף סעיף מותאם..."
                          className="text-xs h-8 rounded-md"
                          onKeyDown={e => e.key === 'Enter' && addCustomItem(cat.key)}
                          dir="rtl"
                        />
                        <Button onClick={() => addCustomItem(cat.key)} size="sm" variant="outline" className="text-xs h-8 flex-shrink-0 rounded-md">
                          <Plus className="w-3 h-3 ml-1" />הוסף
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}