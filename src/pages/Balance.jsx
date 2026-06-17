import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Building2, Car, Wallet, TrendingUp, Coins, CreditCard, Home, Landmark, Lock, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import LoanRefinanceSimulator from '../components/balance/LoanRefinanceSimulator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ASSET_CATEGORIES = [
  { key: 'cash', label: 'מזומנים', icon: Wallet },
  { key: 'real_estate', label: 'נדל"ן', icon: Building2 },
  { key: 'vehicles', label: 'רכבים', icon: Car },
  { key: 'stocks', label: 'שוק ההון', icon: TrendingUp },
  { key: 'other', label: 'אחר', icon: Coins },
];

const DEFAULT_ASSETS = [
  { id: 'a_cash1', name: 'עובר ושב (גבר)', category: 'cash', value: 0, monthly_income: 0 },
  { id: 'a_cash2', name: 'עובר ושב (אישה)', category: 'cash', value: 0, monthly_income: 0 },
  { id: 'a_cash3', name: 'פיקדון בבנק', category: 'cash', value: 0, monthly_income: 0 },
  { id: 'a_cash4', name: 'קרן כספית', category: 'cash', value: 0, monthly_income: 0 },
  { id: 'a_veh1', name: 'רכב (גבר)', category: 'vehicles', value: 0, monthly_income: 0 },
  { id: 'a_veh2', name: 'רכב (אישה)', category: 'vehicles', value: 0, monthly_income: 0 },
  { id: 'a_stk1', name: 'תיק השקעות עצמאי', category: 'stocks', value: 0, monthly_income: 0 },
  { id: 'a_stk2', name: 'קופת גמל להשקעה', category: 'stocks', value: 0, monthly_income: 0 },
];

const LIABILITY_CATEGORIES = [
  { key: 'mortgage', label: 'משכנתא', icon: Home },
  { key: 'loan', label: 'הלוואות', icon: Landmark },
  { key: 'credit_card', label: 'כרטיסי אשראי', icon: CreditCard },
  { key: 'other', label: 'אחר', icon: Coins },
];

const EMPTY_ASSET = { name: '', category: 'cash', value: '', monthly_income: '' };
const EMPTY_LIABILITY = { name: '', category: 'mortgage', balance: '', monthly_payment: '', interest_rate: '' };

function formatMonthLabel(yearMonth) {
  const [y, m] = yearMonth.split('-');
  const months = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  return `${months[parseInt(m) - 1]} ${y}`;
}

function nextMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m, 1); // m is 1-indexed but JS month is 0-indexed, so m becomes next month
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function prevMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function currentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function ItemRow({ item, onEdit, onDelete, isLiability }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${hovered ? 'bg-slate-50' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-slate-700 text-sm font-medium truncate">{item.name}</span>
        {!isLiability && item.monthly_income > 0 && (
          <span className="text-xs text-emerald-600 whitespace-nowrap">(תזרים: ₪{Number(item.monthly_income).toLocaleString()}/חודש)</span>
        )}
        {isLiability && item.monthly_payment > 0 && (
          <span className="text-xs text-slate-500 whitespace-nowrap">(₪{Number(item.monthly_payment).toLocaleString()}/חודש)</span>
        )}
        {isLiability && item.interest_rate > 0 && (
          <span className="text-xs text-rose-500 whitespace-nowrap">{item.interest_rate}%</span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`font-bold text-sm ${isLiability ? 'text-rose-600' : 'text-slate-800'}`}>
          ₪{Number(isLiability ? item.balance : item.value).toLocaleString()}
        </span>
        {hovered && (
          <>
            <button onClick={() => onEdit(item)} className="text-slate-400 hover:text-blue-500 p-1"><Pencil className="w-3.5 h-3.5" /></button>
            <button onClick={() => onDelete(item.id)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
          </>
        )}
      </div>
    </div>
  );
}

function ItemForm({ item, isLiability, onSave, onCancel }) {
  const [form, setForm] = useState(item || (isLiability ? EMPTY_LIABILITY : EMPTY_ASSET));
  const categories = isLiability ? LIABILITY_CATEGORIES : ASSET_CATEGORIES;

  return (
    <div className="space-y-4 py-2" dir="rtl">
      <div className="space-y-1">
        <Label>שם</Label>
        <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
          placeholder={isLiability ? 'לדוגמה: משכנתא בנק לאומי' : 'לדוגמה: דירה ברחוב הרצל'} />
      </div>
      <div className="space-y-1">
        <Label>קטגוריה</Label>
        <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{categories.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {isLiability ? (
        <>
          <div className="space-y-1">
            <Label>יתרת חוב</Label>
            <p className="text-xs text-slate-400">הסכום שנותר לשלם</p>
            <Input type="number" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} placeholder="100000" dir="ltr" />
          </div>
          <div className="space-y-1">
            <Label>תשלום חודשי</Label>
            <p className="text-xs text-slate-400">כמה משלמים כל חודש</p>
            <Input type="number" value={form.monthly_payment} onChange={e => setForm({ ...form, monthly_payment: e.target.value })} placeholder="3000" dir="ltr" />
          </div>
          <div className="space-y-1">
            <Label>ריבית שנתית (%)</Label>
            <p className="text-xs text-slate-400">אחוז הריבית השנתית</p>
            <Input type="number" step="0.1" value={form.interest_rate} onChange={e => setForm({ ...form, interest_rate: e.target.value })} placeholder="5.5" dir="ltr" />
          </div>
        </>
      ) : (
        <>
          <div className="space-y-1">
            <Label>שווי נוכחי</Label>
            <p className="text-xs text-slate-400">הערך הנוכחי של הנכס בשקלים</p>
            <Input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder="500000" dir="ltr" />
          </div>
          <div className="space-y-1">
            <Label>תזרים חודשי (אופציונלי)</Label>
            <p className="text-xs text-slate-400">הכנסה חודשית מהנכס, לדוגמה שכירות</p>
            <Input type="number" value={form.monthly_income} onChange={e => setForm({ ...form, monthly_income: e.target.value })} placeholder="0" dir="ltr" />
          </div>
        </>
      )}
      <div className="flex gap-2 pt-2">
        <Button onClick={() => onSave(form)} className="flex-1 bg-[#105330] hover:bg-[#0d4027]">שמור</Button>
        <Button onClick={onCancel} variant="outline" className="flex-1">ביטול</Button>
      </div>
    </div>
  );
}

export default function Balance() {
  const [user, setUser] = useState(null);
  const [viewingClientId, setViewingClientId] = useState(null);
  const [assetDialog, setAssetDialog] = useState(null);
  const [liabilityDialog, setLiabilityDialog] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr());
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    try {
      const c = JSON.parse(sessionStorage.getItem('viewingClient') || '{}');
      if (c.id) setViewingClientId(c.id);
    } catch {}
  }, []);

  const userId = viewingClientId || user?.id;

  // Fetch balance record for selected month
  const { data: monthData, isLoading: isBalanceLoading } = useQuery({
    queryKey: ['monthlyBalance', userId, selectedMonth],
    queryFn: async () => {
      if (!userId) return null;
      const results = await base44.entities.MonthlyBalance.filter({ user_id: userId, month: selectedMonth });
      return results[0] || null;
    },
    enabled: !!userId,
    staleTime: 0,
  });

  // Fetch previous month data for auto-carry
  const prevMonthStr = prevMonth(selectedMonth);
  const { data: prevMonthData } = useQuery({
    queryKey: ['monthlyBalance', userId, prevMonthStr],
    queryFn: async () => {
      if (!userId) return null;
      const results = await base44.entities.MonthlyBalance.filter({ user_id: userId, month: prevMonthStr });
      return results[0] || null;
    },
    enabled: !!userId && !monthData, // only fetch if current month has no data
    staleTime: 0,
  });

  // Legacy fallback: if MonthlyBalance is empty, try old FinancialPlan data
  const { data: legacyPlan } = useQuery({
    queryKey: ['balance_plan', userId],
    queryFn: async () => {
      if (!userId) return null;
      const results = await base44.entities.FinancialPlan.filter({ user_id: userId, plan_type: 'balance_sheet' });
      return results[0] || null;
    },
    enabled: !!userId && !monthData && !isBalanceLoading,
    staleTime: 0,
  });

  // One-time migration: if legacy data exists but no MonthlyBalance for current month
  useEffect(() => {
    if (legacyPlan && userId && !monthData && !isBalanceLoading && selectedMonth === currentMonthStr()) {
      base44.entities.MonthlyBalance.create({
        user_id: userId,
        month: selectedMonth,
        assets: legacyPlan.assets || { items: [] },
        liabilities: legacyPlan.liabilities || { items: [] },
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['monthlyBalance', userId, selectedMonth] });
      }).catch(() => {});
    }
  }, [legacyPlan, userId, monthData, isBalanceLoading, selectedMonth]);

  // Determine assets and liabilities: use current month data, or auto-carry from previous, or legacy, or defaults
  const carryFromPrev = !monthData && !isBalanceLoading && prevMonthData;
  const legacyAssets = legacyPlan?.assets?.items;
  const legacyLiabilities = legacyPlan?.liabilities?.items;
  const rawAssets = monthData?.assets?.items
    || (carryFromPrev ? prevMonthData.assets?.items : undefined)
    || legacyAssets;
  const assets = rawAssets !== undefined ? rawAssets : DEFAULT_ASSETS;
  const liabilities = monthData?.liabilities?.items
    || (carryFromPrev ? prevMonthData.liabilities?.items : undefined)
    || legacyLiabilities
    || [];

  const { data: pensionData = [] } = useQuery({
    queryKey: ['pensionData', userId],
    queryFn: () => base44.entities.PensionData.filter({ user_id: userId }),
    enabled: !!userId,
  });

  const totalAssets = assets.reduce((s, a) => s + (Number(a.value) || 0), 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + (Number(l.balance) || 0), 0);

  const pensionTotal = pensionData.reduce((s, p) => s + (p.current_amount || 0), 0);
  const pensionByType = pensionData.reduce((acc, p) => {
    const label = p.fund_type === 'pension' ? 'פנסיה' : p.fund_type === 'keren_hishtalmut' ? 'קרן השתלמות' : 'קופת גמל';
    const genderLabel = p.gender === 'male' ? 'גבר' : 'אישה';
    const key = `${label} (${genderLabel})`;
    acc[key] = (acc[key] || 0) + (p.current_amount || 0);
    return acc;
  }, {});

  const netWorth = totalAssets + pensionTotal - totalLiabilities;
  const totalMonthlyPayment = liabilities.reduce((s, l) => s + (Number(l.monthly_payment) || 0), 0);

  // Auto-create record if data is carried from previous month
  useEffect(() => {
    if (carryFromPrev && userId && prevMonthData) {
      base44.entities.MonthlyBalance.create({
        user_id: userId,
        month: selectedMonth,
        assets: prevMonthData.assets,
        liabilities: prevMonthData.liabilities,
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['monthlyBalance', userId, selectedMonth] });
      }).catch(() => {});
    }
  }, [carryFromPrev]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = { user_id: userId, month: selectedMonth, ...data };
      if (monthData?.id) return base44.entities.MonthlyBalance.update(monthData.id, payload);
      return base44.entities.MonthlyBalance.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyBalance', userId, selectedMonth] });
      // Also invalidate prev month since it could now be a valid carry source
      queryClient.invalidateQueries({ queryKey: ['monthlyBalance', userId, nextMonth(selectedMonth)] });
    },
  });

  const saveAsset = (form) => {
    const isEdit = assetDialog && assetDialog !== 'add';
    const newItems = isEdit
      ? assets.map(a => a.id === assetDialog.id ? { ...form, id: assetDialog.id } : a)
      : [...assets, { ...form, id: `a_${Date.now()}` }];
    saveMutation.mutate({ assets: { items: newItems }, liabilities: { items: liabilities } });
    setAssetDialog(null);
  };

  const deleteAsset = (id) => {
    const newItems = assets.filter(a => a.id !== id);
    saveMutation.mutate({ assets: { items: newItems }, liabilities: { items: liabilities } });
  };

  const saveLiability = (form) => {
    const isEdit = liabilityDialog && liabilityDialog !== 'add';
    const newItems = isEdit
      ? liabilities.map(l => l.id === liabilityDialog.id ? { ...form, id: liabilityDialog.id } : l)
      : [...liabilities, { ...form, id: `l_${Date.now()}` }];
    saveMutation.mutate({ assets: { items: assets }, liabilities: { items: newItems } });
    setLiabilityDialog(null);
  };

  const deleteLiability = (id) => {
    const newItems = liabilities.filter(l => l.id !== id);
    saveMutation.mutate({ assets: { items: assets }, liabilities: { items: newItems } });
  };

  const groupByCategory = (items, categories) => {
    const grouped = {};
    categories.forEach(c => { grouped[c.key] = []; });
    items.forEach(item => {
      const key = item.category || categories[0].key;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
    return grouped;
  };

  const assetsByCategory = groupByCategory(assets, ASSET_CATEGORIES);
  const liabilitiesByCategory = groupByCategory(liabilities, LIABILITY_CATEGORIES);

  const isNewMonth = !monthData && !isBalanceLoading && !carryFromPrev;

  return (
    <div className="max-w-6xl mx-auto" dir="rtl">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-[#105330]">מאזן – איפה הכסף</h1>
        <p className="text-[#105330]/70 text-sm mt-1">נכסים מול התחייבויות</p>

        {/* Month Navigator */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={() => setSelectedMonth(prevMonth(selectedMonth))}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 hover:border-[#105330]/30 transition-all"
          >
            <ChevronRight className="w-5 h-5 text-[#105330]" />
          </button>
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm min-w-[160px] justify-center">
            <Calendar className="w-4 h-4 text-[#105330]/60" />
            <span className="text-lg font-bold text-[#105330]">{formatMonthLabel(selectedMonth)}</span>
            {carryFromPrev && <span className="text-xs text-amber-500">(העתקה אוטומטית)</span>}
            {isNewMonth && <span className="text-xs text-slate-400">(חדש)</span>}
          </div>
          <button
            onClick={() => setSelectedMonth(nextMonth(selectedMonth))}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 hover:border-[#105330]/30 transition-all"
          >
            <ChevronLeft className="w-5 h-5 text-[#105330]" />
          </button>
          <button
            onClick={() => setSelectedMonth(currentMonthStr())}
            className="px-3 py-2 text-sm font-medium text-[#105330] bg-[#105330]/5 rounded-xl hover:bg-[#105330]/10 transition-all"
          >
            החודש
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="h-full border-r-4 border-[#105330]">
            <CardContent className="p-5">
              <p className="text-sm text-slate-500 mb-1">סה"כ נכסים</p>
              <p className="text-2xl font-bold text-emerald-600">₪{(totalAssets + pensionTotal).toLocaleString()}</p>
              {pensionTotal > 0 && <p className="text-xs text-slate-400 mt-1">כולל פנסיוני: ₪{pensionTotal.toLocaleString()}</p>}
            </CardContent>
          </div>
        </Card>
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="h-full border-r-4 border-rose-500">
            <CardContent className="p-5">
              <p className="text-sm text-slate-500 mb-1">סה"כ התחייבויות</p>
              <p className="text-2xl font-bold text-rose-600">₪{totalLiabilities.toLocaleString()}</p>
              {totalMonthlyPayment > 0 && <p className="text-xs text-slate-400 mt-1">החזר חודשי: ₪{totalMonthlyPayment.toLocaleString()}</p>}
            </CardContent>
          </div>
        </Card>
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className={`h-full border-r-4 ${netWorth >= 0 ? 'border-[#c8a863]' : 'border-rose-400'}`}>
            <CardContent className="p-5">
              <p className="text-sm text-slate-500 mb-1">הון נקי</p>
              <p className={`text-2xl font-bold ${netWorth >= 0 ? 'text-[#105330]' : 'text-rose-600'}`}>
                ₪{netWorth.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400 mt-1">נכסים – התחייבויות</p>
            </CardContent>
          </div>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#105330]">נכסים</CardTitle>
              <Button size="sm" className="bg-[#105330] hover:bg-[#0d4027]" onClick={() => setAssetDialog('add')}>
                <Plus className="w-4 h-4 ml-1" />הוסף נכס
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {assets.length === 0 && pensionTotal === 0 && <p className="text-slate-400 text-sm text-center py-4">אין נכסים עדיין</p>}
            {ASSET_CATEGORIES.map(cat => {
              const catItems = assetsByCategory[cat.key] || [];
              if (catItems.length === 0) return null;
              const Icon = cat.icon;
              return (
                <div key={cat.key}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{cat.label}</span>
                  </div>
                  <div className="space-y-0.5">
                    {catItems.map(item => (
                      <ItemRow key={item.id} item={item} isLiability={false}
                        onEdit={setAssetDialog} onDelete={deleteAsset} />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Pension - read only */}
            {pensionTotal > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Landmark className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">פנסיוני וקרנות</span>
                  <span className="text-xs text-slate-400 flex items-center gap-1"><Lock className="w-3 h-3" />לצפייה בלבד</span>
                </div>
                <div className="space-y-0.5">
                  {Object.entries(pensionByType).map(([label, value]) => value > 0 && (
                    <div key={label} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50/80">
                      <span className="text-slate-600 text-sm">{label}</span>
                      <span className="font-bold text-sm text-slate-800">₪{value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Liabilities */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-rose-600">התחייבויות</CardTitle>
              <Button size="sm" variant="destructive" onClick={() => setLiabilityDialog('add')}>
                <Plus className="w-4 h-4 ml-1" />הוסף התחייבות
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {liabilities.length === 0 && <p className="text-slate-400 text-sm text-center py-4">אין התחייבויות עדיין</p>}
            {LIABILITY_CATEGORIES.map(cat => {
              const catItems = liabilitiesByCategory[cat.key] || [];
              if (catItems.length === 0) return null;
              const Icon = cat.icon;
              return (
                <div key={cat.key}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{cat.label}</span>
                  </div>
                  <div className="space-y-0.5">
                    {catItems.map(item => (
                      <ItemRow key={item.id} item={item} isLiability={true}
                        onEdit={setLiabilityDialog} onDelete={deleteLiability} />
                    ))}
                  </div>
                </div>
              );
            })}
            <LoanRefinanceSimulator liabilities={liabilities} />
          </CardContent>
        </Card>
      </div>

      {/* Asset Dialog */}
      <Dialog open={!!assetDialog} onOpenChange={o => !o && setAssetDialog(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{assetDialog === 'add' ? 'הוסף נכס' : 'עריכת נכס'}</DialogTitle>
          </DialogHeader>
          <ItemForm item={assetDialog !== 'add' ? assetDialog : null} isLiability={false}
            onSave={saveAsset} onCancel={() => setAssetDialog(null)} />
        </DialogContent>
      </Dialog>

      {/* Liability Dialog */}
      <Dialog open={!!liabilityDialog} onOpenChange={o => !o && setLiabilityDialog(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{liabilityDialog === 'add' ? 'הוסף התחייבות' : 'עריכת התחייבות'}</DialogTitle>
          </DialogHeader>
          <ItemForm item={liabilityDialog !== 'add' ? liabilityDialog : null} isLiability={true}
            onSave={saveLiability} onCancel={() => setLiabilityDialog(null)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}