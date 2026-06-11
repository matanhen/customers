import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EXPENSE_CATEGORIES } from './expenseCategories';

const MONTHS = ['month1','month2','month3'];
const MONTH_LABELS = ['חודש 1','חודש 2','חודש 3'];

export default function ExpensesTable({ expenses = {}, onChange, disabled = false }) {
  // All categories open by default
  const [expandedCategories, setExpandedCategories] = useState(
    () => Object.fromEntries(EXPENSE_CATEGORIES.map(cat => [cat.key, true]))
  );
  const [newItemName, setNewItemName] = useState({});

  const toggleCategory = (key) => {
    setExpandedCategories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateCell = (catKey, itemName, month, value) => {
    const updated = {
      ...expenses,
      [catKey]: {
        ...(expenses[catKey] || {}),
        [itemName]: {
          ...(expenses[catKey]?.[itemName] || {}),
          [month]: parseFloat(value) || 0,
        },
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
        [name]: { month1: 0, month2: 0, month3: 0 },
      },
    };
    onChange(updated);
    setNewItemName(prev => ({ ...prev, [catKey]: '' }));
  };

  // Safely get month data - handle cases where stored value is a plain number (legacy/corrupt)
  const getMonthData = (catKey, itemName) => {
    const val = expenses[catKey]?.[itemName];
    if (!val || typeof val !== 'object') return {};
    return val;
  };

  const getCategoryTotal = (catKey) => {
    const catData = expenses[catKey] || {};
    return Math.round(
      Object.entries(catData).reduce((s, [itemName]) => {
        const monthData = getMonthData(catKey, itemName);
        return s + MONTHS.reduce((a, m) => a + (monthData[m] || 0), 0) / 3;
      }, 0)
    );
  };

  const grandTotal = EXPENSE_CATEGORIES.reduce((s, cat) => s + getCategoryTotal(cat.key), 0);

  // All items for a category: all default items + custom items
  const getCategoryItems = (cat) => {
    const catData = expenses[cat.key] || {};
    const customItems = Object.keys(catData).filter(item => !cat.items.includes(item));
    return [...cat.items, ...customItems];
  };

  return (
    <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white/80 w-full overflow-hidden" dir="rtl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-slate-800 text-base sm:text-lg">טבלת הוצאות - ממוצע 3 חודשים</CardTitle>
          <div className="bg-rose-50 border border-rose-200 rounded-lg px-3 py-1 text-rose-700 font-bold text-sm">
            סה"כ: ₪{grandTotal.toLocaleString()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-2 sm:px-6">
        {EXPENSE_CATEGORIES.map(cat => {
          const isExpanded = expandedCategories[cat.key];
          const catTotal = getCategoryTotal(cat.key);

          return (
            <div key={cat.key} className="border border-slate-200 rounded-xl overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(cat.key)}
                className="w-full flex items-center justify-between px-3 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />}
                  <span className="font-semibold text-slate-700 text-sm">{cat.label}</span>
                </div>
                <span className={`font-bold text-sm flex-shrink-0 ${catTotal > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                  ₪{catTotal.toLocaleString()}
                </span>
              </button>

              {/* Category Content */}
              {isExpanded && (
                <div className="p-2 sm:p-3 space-y-2">
                  <div className="w-full overflow-x-auto -mx-0">
                    <table className="w-full text-sm" style={{ minWidth: 360 }}>
                      <thead>
                        <tr className="text-slate-500 text-xs">
                          <th className="text-right pb-2 font-medium pr-2 w-1/3 min-w-[100px]">סעיף</th>
                          {MONTH_LABELS.map((l, i) => (
                            <th key={i} className="pb-2 font-medium text-center w-[22%]">{l}</th>
                          ))}
                          <th className="pb-2 font-medium text-center w-[14%]">ממוצע</th>
                          {!disabled && <th className="w-8"></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {cat.items.map(item => {
                         const monthData = getMonthData(cat.key, item);
                         const avg = Math.round(MONTHS.reduce((s, m) => s + (monthData[m] || 0), 0) / 3);
                          return (
                            <tr key={item} className="border-t border-slate-100">
                              <td className="py-1 pr-2 text-slate-700 text-xs truncate max-w-[100px]">{item}</td>
                              {MONTHS.map(m => (
                                <td key={m} className="py-1 px-0.5">
                                  <Input
                                    type="number"
                                    value={monthData[m] || ''}
                                    onChange={e => updateCell(cat.key, item, m, e.target.value)}
                                    className="h-7 text-xs text-center border-slate-200 px-1 min-w-[60px]"
                                    placeholder="0"
                                    disabled={disabled}
                                    dir="ltr"
                                  />
                                </td>
                              ))}
                              <td className="px-1 text-center font-semibold text-rose-600 text-xs whitespace-nowrap">
                                {avg > 0 ? `₪${avg.toLocaleString()}` : '-'}
                              </td>
                              {!disabled && <td className="w-8"></td>}
                            </tr>
                          );
                        })}
                        {Object.keys(expenses[cat.key] || {})
                          .filter(item => !cat.items.includes(item))
                          .map(item => {
                            const monthData = getMonthData(cat.key, item);
                              const avg = Math.round(MONTHS.reduce((s, m) => s + (monthData[m] || 0), 0) / 3);
                              return (
                                <tr key={item} className="border-t border-slate-100 bg-blue-50/30">
                                <td className="py-1 pr-2 text-blue-700 text-xs font-medium truncate max-w-[100px]">{item}</td>
                                {MONTHS.map(m => (
                                  <td key={m} className="py-1 px-0.5">
                                    <Input
                                      type="number"
                                      value={monthData[m] || ''}
                                      onChange={e => updateCell(cat.key, item, m, e.target.value)}
                                      className="h-7 text-xs text-center border-blue-200 px-1 min-w-[60px]"
                                      placeholder="0"
                                      disabled={disabled}
                                      dir="ltr"
                                    />
                                  </td>
                                ))}
                                <td className="px-1 text-center font-semibold text-rose-600 text-xs whitespace-nowrap">
                                  {avg > 0 ? `₪${avg.toLocaleString()}` : '-'}
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
                        className="text-xs h-8"
                        onKeyDown={e => e.key === 'Enter' && addCustomItem(cat.key)}
                        dir="rtl"
                      />
                      <Button onClick={() => addCustomItem(cat.key)} size="sm" variant="outline" className="text-xs h-8 flex-shrink-0">
                        <Plus className="w-3 h-3 ml-1" />הוסף
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}