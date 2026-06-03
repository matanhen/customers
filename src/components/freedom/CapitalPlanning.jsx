import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

const PLAN_KEYS = [
  { key: 'baseline', label: 'אם נשארים ככה', color: '#6b7280' },
  { key: 'plan_a', label: 'תכנון א׳', color: '#10b981' },
  { key: 'plan_b', label: 'תכנון ב׳', color: '#3b82f6' },
  { key: 'plan_c', label: 'תכנון ג׳', color: '#f59e0b' },
];

const CATEGORIES = [
  { key: 'pension', label: 'פנסיה' },
  { key: 'real_estate', label: 'נדל"ן' },
  { key: 'stock_market', label: 'שוק ההון' },
  { key: 'cash', label: 'מזומן' },
  { key: 'other', label: 'אחר' },
];

const EMPTY_FORM = {
  investment_name: '',
  investment_category: 'stock_market',
  current_balance: '',
  monthly_deposit: '',
  monthly_withdrawal: '',
  annual_return: '4',
  management_fee: '0',
  deposit_fee: '0',
  cash_flow: '',
};

function formatMoney(v) {
  if (v >= 1_000_000) return `₪${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₪${(v / 1_000).toFixed(0)}K`;
  return `₪${Math.round(v).toLocaleString()}`;
}

function calcProjection(items, years = 30) {
  const result = [];
  let bal = items.reduce((s, i) => s + (Number(i.current_balance) || 0), 0);

  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      items.forEach(item => {
        const monthlyNet = ((Number(item.annual_return) || 0) - (Number(item.management_fee) || 0)) / 100 / 12;
        const deposit = (Number(item.monthly_deposit) || 0) * (1 - (Number(item.deposit_fee) || 0) / 100);
        const withdrawal = Number(item.monthly_withdrawal) || 0;
        const cashFlow = Number(item.cash_flow) || 0;
        bal = bal * (1 + monthlyNet) + deposit - withdrawal + cashFlow;
      });
    }
    result.push({ year: y, yearsFromNow: y, total: Math.max(0, Math.round(bal)) });
  }
  return result;
}

function PlanTab({ planKey, userId, planLabel, planColor }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ['finplan_items', userId, planKey],
    queryFn: () => base44.entities.FinancialPlanItem.filter({ user_id: userId, plan_key: planKey }),
    enabled: !!userId,
  });

  const createMutation = useMutation({
    mutationFn: data => base44.entities.FinancialPlanItem.create({ ...data, user_id: userId, plan_key: planKey }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['finplan_items', userId, planKey] }); setShowForm(false); setEditItem(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FinancialPlanItem.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['finplan_items', userId, planKey] }); setShowForm(false); setEditItem(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.FinancialPlanItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finplan_items', userId, planKey] }),
  });

  const handleSave = () => {
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const projection = useMemo(() => calcProjection(items), [items]);
  const totalBalance = items.reduce((s, i) => s + (Number(i.current_balance) || 0), 0);
  const totalDeposit = items.reduce((s, i) => s + (Number(i.monthly_deposit) || 0), 0);
  const val10 = projection.find(p => p.year === 10)?.total || 0;
  const val20 = projection.find(p => p.year === 20)?.total || 0;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'מאזן נוכחי', value: formatMoney(totalBalance), color: 'text-slate-800' },
          { label: 'הפקדה חודשית', value: `₪${totalDeposit.toLocaleString()}`, color: 'text-emerald-700' },
          { label: 'ערך בעוד 10 שנה', value: formatMoney(val10), color: 'text-blue-700' },
          { label: 'ערך בעוד 20 שנה', value: formatMoney(val20), color: 'text-purple-700' },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-md">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Area Chart */}
      {projection.length > 0 && (
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={projection}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" tickFormatter={v => `שנה ${v}`} tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={formatMoney} tick={{ fontSize: 10 }} />
                <Tooltip formatter={v => formatMoney(v)} labelFormatter={v => `שנה ${v}`} />
                <Area type="monotone" dataKey="total" stroke={planColor} fill={planColor + '30'} name={planLabel} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Investments list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-700">השקעות בתוכנית זו</h3>
          <Button size="sm" className="bg-[#105330] hover:bg-[#0d4027]" onClick={() => { setForm(EMPTY_FORM); setEditItem(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 ml-1" />הוסף השקעה
          </Button>
        </div>
        {items.length === 0 && <p className="text-slate-400 text-sm py-4 text-center">אין השקעות עדיין</p>}
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between bg-white border border-slate-100 rounded-lg px-4 py-3 hover:bg-slate-50 transition-colors">
            <div>
              <span className="font-medium text-slate-800">{item.investment_name}</span>
              <span className="text-xs text-slate-400 mr-2">{CATEGORIES.find(c => c.key === item.investment_category)?.label}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-slate-700 font-semibold">₪{Number(item.current_balance).toLocaleString()}</span>
              <span className="text-xs text-emerald-600">{item.annual_return}% תשואה</span>
              <button onClick={() => { setEditItem(item); setForm({ ...item }); setShowForm(true); }} className="text-slate-400 hover:text-blue-500 p-1"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => deleteMutation.mutate(item.id)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={o => !o && setShowForm(false)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? 'עריכת השקעה' : 'הוסף השקעה'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>שם ההשקעה</Label>
              <Input value={form.investment_name} onChange={e => setForm({ ...form, investment_name: e.target.value })} placeholder="לדוגמה: תיק מניות" />
            </div>
            <div className="space-y-1">
              <Label>קטגוריה</Label>
              <Select value={form.investment_category} onValueChange={v => setForm({ ...form, investment_category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>מאזן נוכחי</Label>
                <p className="text-xs text-slate-400">כמה כסף יש כרגע</p>
                <Input type="number" value={form.current_balance} onChange={e => setForm({ ...form, current_balance: e.target.value })} placeholder="0" dir="ltr" />
              </div>
              <div className="space-y-1">
                <Label>הפקדה חודשית</Label>
                <p className="text-xs text-slate-400">כמה מפקידים בחודש</p>
                <Input type="number" value={form.monthly_deposit} onChange={e => setForm({ ...form, monthly_deposit: e.target.value })} placeholder="0" dir="ltr" />
              </div>
              <div className="space-y-1">
                <Label>תשואה שנתית %</Label>
                <p className="text-xs text-slate-400">ריבית/תשואה שנתית</p>
                <Input type="number" step="0.1" value={form.annual_return} onChange={e => setForm({ ...form, annual_return: e.target.value })} placeholder="4" dir="ltr" />
              </div>
              <div className="space-y-1">
                <Label>דמי ניהול שנתיים %</Label>
                <p className="text-xs text-slate-400">עמלה שנתית</p>
                <Input type="number" step="0.01" value={form.management_fee} onChange={e => setForm({ ...form, management_fee: e.target.value })} placeholder="0" dir="ltr" />
              </div>
              <div className="space-y-1">
                <Label>משיכה חודשית</Label>
                <p className="text-xs text-slate-400">כמה מושכים בחודש</p>
                <Input type="number" value={form.monthly_withdrawal} onChange={e => setForm({ ...form, monthly_withdrawal: e.target.value })} placeholder="0" dir="ltr" />
              </div>
              <div className="space-y-1">
                <Label>תזרים/דיבידנד חודשי</Label>
                <p className="text-xs text-slate-400">הכנסה חודשית מהנכס</p>
                <Input type="number" value={form.cash_flow} onChange={e => setForm({ ...form, cash_flow: e.target.value })} placeholder="0" dir="ltr" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} className="flex-1 bg-[#105330] hover:bg-[#0d4027]">שמור</Button>
              <Button onClick={() => setShowForm(false)} variant="outline" className="flex-1">ביטול</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CapitalPlanning({ userId }) {
  const [activeTab, setActiveTab] = useState('baseline');

  // Load all plan items for comparison chart - must call hooks at top level
  const q0 = useQuery({ queryKey: ['finplan_items', userId, 'baseline'], queryFn: () => base44.entities.FinancialPlanItem.filter({ user_id: userId, plan_key: 'baseline' }), enabled: !!userId });
  const q1 = useQuery({ queryKey: ['finplan_items', userId, 'plan_a'], queryFn: () => base44.entities.FinancialPlanItem.filter({ user_id: userId, plan_key: 'plan_a' }), enabled: !!userId });
  const q2 = useQuery({ queryKey: ['finplan_items', userId, 'plan_b'], queryFn: () => base44.entities.FinancialPlanItem.filter({ user_id: userId, plan_key: 'plan_b' }), enabled: !!userId });
  const q3 = useQuery({ queryKey: ['finplan_items', userId, 'plan_c'], queryFn: () => base44.entities.FinancialPlanItem.filter({ user_id: userId, plan_key: 'plan_c' }), enabled: !!userId });
  const allQueriesData = [q0.data, q1.data, q2.data, q3.data];

  const comparisonData = useMemo(() => {
    const projections = PLAN_KEYS.map((p, i) => ({
      key: p.key,
      label: p.label,
      color: p.color,
      data: calcProjection(allQueriesData[i] || []),
    }));

    return Array.from({ length: 30 }, (_, i) => {
      const yr = i + 1;
      const row = { year: yr };
      projections.forEach(p => { row[p.key] = p.data.find(d => d.year === yr)?.total || 0; });
      return row;
    });
  }, [q0.data, q1.data, q2.data, q3.data]);

  const milestoneYears = [10, 20, 30];

  return (
    <div className="space-y-8" dir="rtl">
      <div>
        <h2 className="text-2xl font-bold text-[#105330]">תכנון פיננסי עתידי</h2>
        <p className="text-[#105330]/70 text-sm">השווה תרחישים שונים לאורך 30 שנה</p>
      </div>

      {/* Comparison Chart */}
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <TrendingUp className="w-5 h-5 text-[#105330]" />
            השוואת תרחישים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="year" tickFormatter={v => `${v}שנ`} tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={formatMoney} tick={{ fontSize: 10 }} width={60} />
              <Tooltip formatter={(v, name) => [formatMoney(v), PLAN_KEYS.find(p => p.key === name)?.label || name]} labelFormatter={v => `שנה ${v}`} />
              <Legend formatter={name => PLAN_KEYS.find(p => p.key === name)?.label || name} />
              {PLAN_KEYS.map(p => (
                <Line key={p.key} type="monotone" dataKey={p.key} stroke={p.color} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>

          {/* Milestone Table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-right py-2 pr-2 font-semibold text-slate-600">תוכנית</th>
                  {milestoneYears.map(y => <th key={y} className="text-center py-2 font-semibold text-slate-600">שנה {y}</th>)}
                </tr>
              </thead>
              <tbody>
                {PLAN_KEYS.map(p => (
                  <tr key={p.key} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 pr-2">
                      <span className="inline-block w-3 h-3 rounded-full ml-2" style={{ background: p.color }} />
                      <span className="font-medium text-slate-700">{p.label}</span>
                    </td>
                    {milestoneYears.map(y => (
                      <td key={y} className="text-center py-2 font-semibold" style={{ color: p.color }}>
                        {formatMoney(comparisonData.find(d => d.year === y)?.[p.key] || 0)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Plan Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full bg-[#105330]/10 p-1.5 rounded-xl">
          {PLAN_KEYS.map(p => (
            <TabsTrigger key={p.key} value={p.key}
              className={`rounded-lg data-[state=active]:shadow-lg transition-all font-semibold text-xs ${
                activeTab === p.key ? 'text-white' : 'text-slate-700'
              }`}
              style={activeTab === p.key ? { backgroundColor: p.color, color: 'white' } : {}}
            >
              {p.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {PLAN_KEYS.map(p => (
          <TabsContent key={p.key} value={p.key} className="mt-4">
            <PlanTab planKey={p.key} userId={userId} planLabel={p.label} planColor={p.color} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}