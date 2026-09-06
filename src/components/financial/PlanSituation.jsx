import React from 'react';
import { TrendingUp, TrendingDown, Wallet, Landmark, Building2, Coins } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from './financialPlanSteps';

export default function PlanSituation({ situation, missingData }) {
  const reflectionItems = [
    { label: 'הכנסה חודשית', value: situation.income, icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'הוצאות חודשיות', value: situation.totalExpenses, icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'תזרים חודשי', value: situation.cashFlow, icon: TrendingUp, color: situation.cashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600', bg: situation.cashFlow >= 0 ? 'bg-emerald-50' : 'bg-rose-50' },
    { label: 'מצב עו"ש', value: situation.checkingBalance, icon: Landmark, color: situation.checkingBalance >= 0 ? 'text-[#105330]' : 'text-rose-600', bg: 'bg-slate-50' },
  ];

  const balanceItems = [
    { label: 'סך חובות', value: situation.totalLiabilities, icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'סך נכסים', value: situation.totalAssets, icon: Building2, color: 'text-[#105330]', bg: 'bg-emerald-50' },
    { label: 'הכנסה פסיבית', value: situation.passiveIncome, icon: Coins, color: situation.passiveIncome >= 0 ? 'text-[#c8a863]' : 'text-rose-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold text-[#105330]">המצב שלך היום</h2>
        <span className="text-xs text-slate-400">מתוך השיקוף הפיננסי והמאזן</span>
      </div>

      {missingData.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-amber-700 text-sm font-medium">חסרים נתונים לחישוב מלא:</p>
          <ul className="mt-1 text-sm text-amber-600 list-disc pr-5">
            {missingData.map(m => <li key={m}>{m}</li>)}
          </ul>
        </div>
      )}

      <div>
        <p className="text-xs text-slate-400 mb-2 font-medium">לפי השיקוף הפיננסי</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {reflectionItems.map(item => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="border-0 shadow-md">
                <CardContent className={`p-4 ${item.bg} rounded-xl`}>
                  <Icon className={`w-5 h-5 ${item.color} mb-2`} />
                  <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                  <p className={`text-xl font-bold ${item.color}`}>{formatCurrency(item.value)}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-xs text-slate-400 mb-2 font-medium">לפי המאזן</p>
        <div className="grid grid-cols-3 gap-3">
          {balanceItems.map(item => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="border-0 shadow-md">
                <CardContent className={`p-4 ${item.bg} rounded-xl`}>
                  <Icon className={`w-5 h-5 ${item.color} mb-2`} />
                  <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                  <p className={`text-xl font-bold ${item.color}`}>{formatCurrency(item.value)}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}