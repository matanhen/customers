import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, Receipt, TrendingUp, TrendingDown, Save, Check, FileText, Image } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import PDFReflectionImport from './PDFReflectionImport';
import ImageCreditImport from './ImageCreditImport';
import IncomeTable from './IncomeTable';
import ExpensesTable from './ExpensesTable';
import FinancialForecast from './FinancialForecast';
import { migrateLegacyExpenses, getDefaultExpenses, EXPENSE_CATEGORIES, ALL_EXPENSE_ITEMS } from './expenseCategories';

const MONTHS = ['month1','month2','month3','month4','month5','month6'];

export default function FinancialReflection({ userId }) {
  const [activeTab, setActiveTab] = useState('income');
  const [incomeRows, setIncomeRows] = useState([]);
  const [expenses, setExpenses] = useState({});
  const [maleAge, setMaleAge] = useState('');
  const [femaleAge, setFemaleAge] = useState('');
  const [checkingBalance, setCheckingBalance] = useState('');
  const [creditCardTotal, setCreditCardTotal] = useState(0);
  const [creditCardDisplay, setCreditCardDisplay] = useState('');
  const [showPDFImportDialog, setShowPDFImportDialog] = useState(false);
  const [showImageImportDialog, setShowImageImportDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const prevUserIdRef = useRef(userId);
  useEffect(() => {
    if (prevUserIdRef.current !== userId) {
      prevUserIdRef.current = userId;
      setDataLoaded(false);
    }
  }, [userId]);

  const queryClient = useQueryClient();
  const autoSaveTimer = useRef(null);
  const reflectionIdRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, [userId]);

  const isAdvisorOrAdmin = currentUser?.user_type === 'advisor' || currentUser?.user_type === 'admin';
  const isViewingOther = !!currentUser && currentUser.id !== userId;
  const viewingClientEmail = (() => {
    try { return JSON.parse(sessionStorage.getItem('viewingClient') || '{}').email || null; } catch { return null; }
  })();

  const { data: pensionData = [] } = useQuery({
    queryKey: ['pensionData', userId],
    queryFn: async () => {
      if (isViewingOther && isAdvisorOrAdmin) {
        const resp = await base44.functions.invoke('getClientData', { clientUserId: userId, clientEmail: viewingClientEmail, entityName: 'PensionData' });
        return resp.data.data || [];
      }
      return base44.entities.PensionData.filter({ user_id: userId });
    },
    enabled: !!userId && !!currentUser,
    staleTime: 60000,
  });

  const pensionMaleMonthly = pensionData
    .filter(p => p.gender === 'male')
    .reduce((s, p) => s + (p.monthly_deposit || 0), 0);
  const pensionFemaleMonthly = pensionData
    .filter(p => p.gender === 'female')
    .reduce((s, p) => s + (p.monthly_deposit || 0), 0);

  const { data: reflection, isLoading: reflectionLoading } = useQuery({
    queryKey: ['financialReflection', userId],
    queryFn: async () => {
      const me = await base44.auth.me();
      const isMeAdvisorOrAdmin = me?.user_type === 'advisor' || me?.user_type === 'admin';
      const isMeViewingOther = !!me && me.id !== userId;
      if (isMeViewingOther && isMeAdvisorOrAdmin) {
        const response = await base44.functions.invoke('getClientData', {
          clientUserId: userId,
          clientEmail: viewingClientEmail,
          entityName: 'FinancialReflection'
        });
        return response.data.data[0] || null;
      }
      const results = await base44.entities.FinancialReflection.filter({ user_id: userId });
      return results[0] || null;
    },
    enabled: !!userId,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (reflectionLoading || dataLoaded) return;

    reflectionIdRef.current = reflection?.id || null;

    if (reflection?.income_rows && reflection.income_rows.length > 0) {
      setIncomeRows(reflection.income_rows);
    } else if (reflection?.incomes) {
      const legacy = reflection.incomes;
      const hasData = MONTHS.some(m => (legacy[m] || 0) > 0);
      if (hasData) {
        setIncomeRows([{
          id: 'income_male',
          name: 'הכנסות (גבר)',
          category: 'personal',
          locked: false,
          ...Object.fromEntries(MONTHS.map(m => [m, legacy[m] || 0])),
        }]);
      }
    }

    if (reflection?.expenses && typeof reflection.expenses === 'object' && !Array.isArray(reflection.expenses) && Object.keys(reflection.expenses).length > 0) {
      setExpenses(reflection.expenses);
    } else if (reflection?.fixed_expenses || reflection?.variable_expenses) {
      const migrated = migrateLegacyExpenses(
        reflection.fixed_expenses || {},
        reflection.variable_expenses || {}
      );
      setExpenses(migrated || {});
    } else {
      // Seed default empty structure for new users
      setExpenses(getDefaultExpenses());
    }

    setMaleAge(reflection?.male_age ? String(reflection.male_age) : '');
    setFemaleAge(reflection?.female_age ? String(reflection.female_age) : '');
    setCheckingBalance(reflection?.checking_account_balance != null ? String(reflection.checking_account_balance) : '');
    const cc = reflection?.credit_card_total || 0;
    setCreditCardTotal(cc);
    setCreditCardDisplay(cc > 0 ? String(cc) : '');

    setDataLoaded(true);
  }, [reflection, reflectionLoading]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = { user_id: userId, ...data };
      if (isViewingOther && isAdvisorOrAdmin) {
        const response = await base44.functions.invoke('saveClientData', {
          entityName: 'FinancialReflection',
          clientUserId: userId,
          data: payload,
          recordId: reflectionIdRef.current || null,
        });
        if (response.data?.id) reflectionIdRef.current = response.data.id;
        return response.data;
      }
      if (reflectionIdRef.current) {
        return base44.entities.FinancialReflection.update(reflectionIdRef.current, payload);
      }
      const created = await base44.entities.FinancialReflection.create(payload);
      reflectionIdRef.current = created.id;
      return created;
    },
    onSuccess: (saved) => {
      if (saved?.id) {
        reflectionIdRef.current = saved.id;
        queryClient.setQueryData(['financialReflection', userId], saved);
      }
    },
  });

  const pendingDataRef = useRef(null);
  const saveMutationRef = useRef(saveMutation);
  const dataLoadedRef = useRef(dataLoaded);
  useEffect(() => { saveMutationRef.current = saveMutation; }, [saveMutation]);
  useEffect(() => { dataLoadedRef.current = dataLoaded; }, [dataLoaded]);

  const triggerAutoSave = useCallback((latestData) => {
    if (!dataLoadedRef.current) return;
    pendingDataRef.current = latestData;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveMutationRef.current.mutate(latestData);
      pendingDataRef.current = null;
    }, 800);
  }, []);

  useEffect(() => {
    return () => {
      if (pendingDataRef.current) {
        clearTimeout(autoSaveTimer.current);
        saveMutationRef.current.mutate(pendingDataRef.current);
      }
    };
  }, []);

  const buildPayload = (overrides = {}) => ({
    income_rows: incomeRows,
    expenses,
    credit_card_total: creditCardTotal,
    male_age: parseInt(maleAge) || null,
    female_age: parseInt(femaleAge) || null,
    checking_account_balance: checkingBalance !== '' ? parseFloat(checkingBalance) : null,
    ...overrides,
  });

  // Calculations - net income excludes pension rows (auto-filled)
  const safeIncomeRows = Array.isArray(incomeRows) ? incomeRows : [];
  const nonPensionRows = safeIncomeRows.filter(r => r?.id !== 'pension_male' && r?.id !== 'pension_female');
  const incomeNet = Math.round(nonPensionRows.reduce((s, r) => {
    return s + (r ? MONTHS.reduce((a, m) => a + (r[m] || 0), 0) / 6 : 0);
  }, 0));
  const incomeTotal = incomeNet + pensionMaleMonthly + pensionFemaleMonthly;

  const safeExpenses = expenses && typeof expenses === 'object' && !Array.isArray(expenses) ? expenses : {};
  const expenseTotalRound = Math.round(
    Object.values(safeExpenses).reduce((s, catData) => {
      if (!catData || typeof catData !== 'object') return s;
      return s + Object.values(catData).reduce((cs, itemData) => {
        if (!itemData || typeof itemData !== 'object') return cs;
        return cs + ['month1','month2','month3'].reduce((a, m) => a + ((itemData[m] || 0)), 0) / 3;
      }, 0);
    }, 0)
  );

  const cashFlow = incomeNet - expenseTotalRound;

  if (reflectionLoading) {
    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Age, Checking Balance & Credit Card */}
      <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white/80">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold">גיל - גבר</Label>
              <Input
                type="number"
                value={maleAge}
                onChange={e => { setMaleAge(e.target.value); triggerAutoSave(buildPayload({ male_age: parseInt(e.target.value) || null })); }}
                placeholder="הזן גיל"
                disabled={isViewingOther && !isAdvisorOrAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold">גיל - אישה</Label>
              <Input
                type="number"
                value={femaleAge}
                onChange={e => { setFemaleAge(e.target.value); triggerAutoSave(buildPayload({ female_age: parseInt(e.target.value) || null })); }}
                placeholder="הזן גיל"
                disabled={isViewingOther && !isAdvisorOrAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold">יתרת עובר ושב נוכחית</Label>
              <Input
                type="number"
                value={checkingBalance}
                onChange={e => { setCheckingBalance(e.target.value); triggerAutoSave(buildPayload({ checking_account_balance: parseFloat(e.target.value) || null })); }}
                placeholder="יכול להיות במינוס, לדוגמה: -5000"
                disabled={isViewingOther && !isAdvisorOrAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold flex items-center gap-1">
                <Receipt className="w-4 h-4 text-orange-500" />
                סך הכל חיוב אשראי נוכחי
              </Label>
              <Input
                type="text" inputMode="numeric" value={creditCardDisplay}
                onChange={e => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  const num = parseInt(raw, 10) || 0;
                  setCreditCardTotal(num); setCreditCardDisplay(raw);
                  triggerAutoSave(buildPayload({ credit_card_total: num }));
                }}
                placeholder="₪ הזן סכום"
                className="border-orange-200 focus-visible:ring-orange-400"
                disabled={isViewingOther && !isAdvisorOrAdmin} dir="ltr"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {(!isViewingOther || isAdvisorOrAdmin) && (
        <div className="flex justify-end items-center gap-3 flex-wrap">
          <Button onClick={() => setShowImageImportDialog(true)} variant="outline" className="border-purple-400 text-purple-600 hover:bg-purple-50">
            <Image className="w-4 h-4 ml-2" />ייבוא מתמונה
          </Button>
          <Button onClick={() => setShowPDFImportDialog(true)} variant="outline" className="border-red-400 text-red-600 hover:bg-red-50">
            <FileText className="w-4 h-4 ml-2" />ייבוא מ-PDF
          </Button>
          <Button
            onClick={() => { saveMutation.mutate(buildPayload(), { onSuccess: () => { setSaveSuccess(true); setTimeout(() => setSaveSuccess(false), 2000); } }); }}
            disabled={saveMutation.isPending}
            className="bg-[#105330] hover:bg-[#0d4027] text-white"
          >
            {saveSuccess ? <Check className="w-4 h-4 ml-2" /> : <Save className="w-4 h-4 ml-2" />}
            {saveMutation.isPending ? 'שומר...' : saveSuccess ? 'נשמר!' : 'שמור נתונים'}
          </Button>
        </div>
      )}

      {isViewingOther && !isAdvisorOrAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-amber-800 font-medium">אתה צופה בנתוני לקוח - ניתן לראות בלבד</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-xl shadow-emerald-100/50 bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-emerald-500/10"><DollarSign className="w-8 h-8 text-emerald-600" /></div>
              <div>
                <p className="text-sm text-emerald-600 font-medium">ממוצע הכנסות נטו</p>
                <p className="text-2xl font-bold text-emerald-700">₪{incomeNet.toLocaleString()}</p>
                {incomeTotal !== incomeNet && <p className="text-xs text-emerald-500">כולל פנסיוני: ₪{incomeTotal.toLocaleString()}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl shadow-rose-100/50 bg-gradient-to-br from-rose-50 to-pink-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-rose-500/10"><Receipt className="w-8 h-8 text-rose-600" /></div>
              <div>
                <p className="text-sm text-rose-600 font-medium">ממוצע הוצאות</p>
                <p className="text-2xl font-bold text-rose-700">₪{expenseTotalRound.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-0 shadow-xl ${cashFlow >= 0 ? 'shadow-indigo-100/50 bg-gradient-to-br from-indigo-50 to-purple-50' : 'shadow-red-100/50 bg-gradient-to-br from-red-50 to-orange-50'}`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${cashFlow >= 0 ? 'bg-indigo-500/10' : 'bg-red-500/10'}`}>
                {cashFlow >= 0 ? <TrendingUp className="w-8 h-8 text-indigo-600" /> : <TrendingDown className="w-8 h-8 text-red-600" />}
              </div>
              <div>
                <p className={`text-sm font-medium ${cashFlow >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>תזרים ממוצע</p>
                <p className={`text-2xl font-bold ${cashFlow >= 0 ? 'text-indigo-700' : 'text-red-700'}`}>₪{cashFlow.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex w-full bg-[#105330]/10 p-1.5 rounded-xl gap-1">
          <TabsTrigger value="income" className="flex-1 rounded-lg data-[state=active]:bg-[#105330] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-semibold text-sm">
            הכנסות
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex-1 rounded-lg data-[state=active]:bg-rose-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-semibold text-sm">
            הוצאות
          </TabsTrigger>
          <TabsTrigger value="forecast" className="flex-1 rounded-lg data-[state=active]:bg-[#c8a863] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-semibold text-sm">
            🚀 תחזית עתיד
          </TabsTrigger>
        </TabsList>
        {/* Remove duplicate chart when in forecast tab */}

        <TabsContent value="income" className="mt-4">
          <IncomeTable
            rows={incomeRows}
            onChange={(rows) => { setIncomeRows(rows); triggerAutoSave(buildPayload({ income_rows: rows })); }}
            pensionMaleMonthly={pensionMaleMonthly}
            pensionFemaleMonthly={pensionFemaleMonthly}
            disabled={isViewingOther && !isAdvisorOrAdmin}
          />
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          <ExpensesTable
            expenses={expenses}
            onChange={(newExpenses) => { setExpenses(newExpenses); triggerAutoSave(buildPayload({ expenses: newExpenses })); }}
            disabled={isViewingOther && !isAdvisorOrAdmin}
          />
        </TabsContent>

        <TabsContent value="forecast" className="mt-4">
          <FinancialForecast
            incomeAverage={incomeNet}
            expenseAverage={expenseTotalRound}
            cashFlowAverage={cashFlow}
            checkingBalance={reflection?.checking_account_balance || 0}
            maleAge={reflection?.male_age}
            femaleAge={reflection?.female_age}
          />
        </TabsContent>
      </Tabs>

      {/* Chart - only on income/expenses tabs */}
      {(incomeNet > 0 || expenseTotalRound > 0) && activeTab !== 'forecast' && (
        <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-slate-800">
              <div className="p-2 rounded-xl bg-indigo-500/10"><TrendingUp className="w-5 h-5 text-indigo-600" /></div>
              סיכום ממוצעים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={[
                { name: 'הכנסות נטו', ערך: incomeNet },
                { name: 'הוצאות', ערך: expenseTotalRound },
                { name: 'תזרים', ערך: cashFlow },
              ]} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tickFormatter={v => `₪${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip formatter={value => [`₪${value.toLocaleString()}`, 'סכום']} contentStyle={{ direction: 'rtl', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                <ReferenceLine y={0} stroke="#94a3b8" />
                <Bar dataKey="ערך" radius={[6, 6, 0, 0]}>
                  {[{ fill: '#10b981' }, { fill: '#f43f5e' }, { fill: cashFlow >= 0 ? '#6366f1' : '#ef4444' }].map((e, i) => (
                    <Cell key={i} fill={e.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <PDFReflectionImport
        open={showPDFImportDialog}
        onOpenChange={setShowPDFImportDialog}
        onApply={(items) => {
          let next = { ...expenses };
          items.forEach(item => {
            let catKey = 'misc';
            for (const cat of EXPENSE_CATEGORIES) {
              if (cat.items.includes(item.category)) { catKey = cat.key; break; }
            }
            const month = item.month || 'month1';
            next = { ...next, [catKey]: { ...(next[catKey] || {}), [item.category]: { ...(next[catKey]?.[item.category] || {}), [month]: (next[catKey]?.[item.category]?.[month] || 0) + item.amount } } };
          });
          setExpenses(next);
          saveMutation.mutate(buildPayload({ expenses: next }));
        }}
      />

      <ImageCreditImport
        open={showImageImportDialog}
        onOpenChange={setShowImageImportDialog}
        mode="reflection"
        onApply={(items) => {
          let next = { ...expenses };
          items.forEach(item => {
            let catKey = 'misc';
            for (const cat of EXPENSE_CATEGORIES) {
              if (cat.items.includes(item.category)) { catKey = cat.key; break; }
            }
            const month = item.month || 'month1';
            next = { ...next, [catKey]: { ...(next[catKey] || {}), [item.category]: { ...(next[catKey]?.[item.category] || {}), [month]: (next[catKey]?.[item.category]?.[month] || 0) + item.amount } } };
          });
          setExpenses(next);
          saveMutation.mutate(buildPayload({ expenses: next }));
        }}
      />
    </div>
  );
}