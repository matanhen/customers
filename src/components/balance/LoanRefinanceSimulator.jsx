import React, { useState } from 'react';
import { Calculator, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function LoanRefinanceSimulator({ liabilities }) {
  const [open, setOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState('all'); // 'all' | loan id
  const [newRate, setNewRate] = useState('');
  const [newMonths, setNewMonths] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const loans = liabilities.filter(l => l.balance > 0);

  // Aggregate: either all loans combined or a single selected loan
  const selectedLoans = selectedMode === 'all' ? loans : loans.filter(l => l.id === selectedMode);
  const selectedLoan = selectedLoans.length === 1 ? selectedLoans[0] : null;
  const combinedBalance = selectedLoans.reduce((s, l) => s + (l.balance || 0), 0);
  const combinedMonthlyPayment = selectedLoans.reduce((s, l) => s + (l.monthly_payment || 0), 0);
  // Use weighted avg interest rate when combining
  const combinedRate = combinedBalance > 0
    ? selectedLoans.reduce((s, l) => s + (l.interest_rate || 0) * (l.balance || 0), 0) / combinedBalance
    : 0;

  const calcMonthlyPayment = (balance, annualRate, months) => {
    const r = annualRate / 100 / 12;
    if (r === 0) return balance / months;
    return (balance * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  };

  const loanBalance = parseFloat(newAmount) || combinedBalance || 0;
  const currentRate = selectedLoan?.interest_rate || combinedRate;
  const currentMonthlyPayment = combinedMonthlyPayment;
  const estimatedCurrentMonths = currentRate > 0 && currentMonthlyPayment > 0
    ? Math.round(Math.log(currentMonthlyPayment / (currentMonthlyPayment - loanBalance * currentRate / 100 / 12)) / Math.log(1 + currentRate / 100 / 12))
    : 0;

  const newRateNum = parseFloat(newRate) || 0;
  const newMonthsNum = parseInt(newMonths) || 0;
  const newMonthlyPayment = newRateNum > 0 && newMonthsNum > 0 && loanBalance > 0
    ? calcMonthlyPayment(loanBalance, newRateNum, newMonthsNum)
    : 0;

  const totalCurrentCost = currentMonthlyPayment * estimatedCurrentMonths;
  const totalNewCost = newMonthlyPayment * newMonthsNum;
  const saving = totalCurrentCost - totalNewCost;
  const monthlyDiff = currentMonthlyPayment - newMonthlyPayment;

  if (loans.length === 0) return null;

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 hover:border-blue-400 transition-colors"
      >
        <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
          <Calculator className="w-4 h-4" />
          סימולציית מחזור הלוואה
        </div>
        <span className="text-blue-400 text-xs">{open ? 'סגור ▲' : 'פתח ▼'}</span>
      </button>

      {open && (
      <div className="mt-3 p-4 bg-white rounded-xl border border-blue-200 space-y-4" dir="rtl">
        {/* Select loan(s) */}
        {loans.length > 1 && (
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-600">בחר הלוואה למחזור</Label>
            <select
              value={selectedMode}
              onChange={e => { setSelectedMode(e.target.value); setNewAmount(''); }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="all">כל ההלוואות ביחד (₪{loans.reduce((s,l)=>s+(l.balance||0),0).toLocaleString()})</option>
              {loans.map(l => (
                <option key={l.id} value={l.id}>{l.name} – ₪{Number(l.balance).toLocaleString()}</option>
              ))}
            </select>
          </div>
        )}

        {/* Current loan summary */}
        <div className="bg-slate-50 rounded-xl p-3 text-sm">
          <p className="font-semibold text-slate-700 mb-2">
            {selectedMode === 'all' && loans.length > 1 ? `נתוני כל ההלוואות (${loans.length})` : 'נתוני הלוואה נוכחית'}
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><p className="text-xs text-slate-400">יתרת חוב</p><p className="font-bold text-slate-700">₪{combinedBalance.toLocaleString()}</p></div>
            <div><p className="text-xs text-slate-400">ריבית ממוצעת</p><p className="font-bold text-slate-700">{combinedRate.toFixed(2)}%</p></div>
            <div><p className="text-xs text-slate-400">החזר חודשי</p><p className="font-bold text-slate-700">₪{combinedMonthlyPayment.toLocaleString()}</p></div>
          </div>
        </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">סכום ההלוואה החדשה</Label>
              <Input
                type="number"
                value={newAmount}
                onChange={e => setNewAmount(e.target.value)}
                placeholder={selectedLoan ? String(selectedLoan.balance) : '100000'}
                dir="ltr"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">ריבית חדשה (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={newRate}
                onChange={e => setNewRate(e.target.value)}
                placeholder="4.5"
                dir="ltr"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">תקופה חדשה (חודשים)</Label>
              <Input
                type="number"
                value={newMonths}
                onChange={e => setNewMonths(e.target.value)}
                placeholder="60"
                dir="ltr"
              />
            </div>
          </div>

          {newMonthlyPayment > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className={`text-center p-3 rounded-xl ${monthlyDiff > 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                <p className="text-xs text-slate-500 mb-1">החזר חודשי חדש</p>
                <p className="text-xl font-black text-slate-800">₪{Math.round(newMonthlyPayment).toLocaleString()}</p>
                {currentMonthlyPayment > 0 && (
                  <p className={`text-xs font-semibold mt-1 ${monthlyDiff > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {monthlyDiff > 0 ? `חיסכון של ₪${Math.round(monthlyDiff).toLocaleString()}/חודש` : `תוספת של ₪${Math.round(-monthlyDiff).toLocaleString()}/חודש`}
                  </p>
                )}
              </div>
              <div className="text-center p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500 mb-1">עלות כוללת חדשה</p>
                <p className="text-xl font-black text-slate-800">₪{Math.round(totalNewCost).toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-1">ריבית: ₪{Math.round(totalNewCost - loanBalance).toLocaleString()}</p>
              </div>
              <div className={`text-center p-3 rounded-xl ${saving > 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
                <p className="text-xs text-slate-500 mb-1">{saving > 0 ? 'חיסכון כולל' : 'עלות נוספת'}</p>
                <div className="flex items-center justify-center gap-1">
                  {saving > 0 ? <TrendingDown className="w-4 h-4 text-emerald-600" /> : <TrendingUp className="w-4 h-4 text-amber-600" />}
                  <p className={`text-xl font-black ${saving > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>₪{Math.round(Math.abs(saving)).toLocaleString()}</p>
                </div>
                <p className="text-xs text-slate-400 mt-1">ביחס להלוואה הנוכחית</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}