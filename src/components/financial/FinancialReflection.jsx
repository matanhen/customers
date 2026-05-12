import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  TrendingUp, TrendingDown, ChevronDown, ChevronUp,
  DollarSign, Receipt, FileText, Save, Check
} from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import PDFReflectionImport from './PDFReflectionImport';

const FIXED_EXPENSES = [
  'ביטוחי רכב','טסט','משכנתא','ביטוח משכנתא','שכירות',
  'מנויים','ביטוחים (ללא רכב)','ועד בית','ארנונה','החזר הלוואות','הוראות קבע',
];

const VARIABLE_EXPENSES = [
  'מים','חשמל','גז','תספורת וקוסמטיקה','חינוך','חוגים וקייטנות','בריאות',
  'תיקוני רכב','עמלות וריביות בנקים','טיפולי שיניים','אופטיקה','חגים ויהדות',
  'טלפון נייד','סופר פארם','דברים לבית','ביטוח לאומי','מזון','דלק וחניה',
  'תחבורה ציבורית','סיגריות','עוזרת / בייביסיטר','ביט','מזומן','בילויים',
  'בגדים ונעליים','תרומות','התפתחות אישית','חופשה / טיול','בעלי חיים','מתנות ואירועים',
];

export default function FinancialReflection({ userId }) {
  const [incomes, setIncomes] = useState({ month1: 0, month2: 0, month3: 0, month4: 0, month5: 0, month6: 0 });
  const [fixedExpenses, setFixedExpenses] = useState({});
  const [variableExpenses, setVariableExpenses] = useState({});
  const [incomeDisplays, setIncomeDisplays] = useState({});
  const [fixedDisplays, setFixedDisplays] = useState({});
  const [variableDisplays, setVariableDisplays] = useState({});
  const [openSections, setOpenSections] = useState({ income: true, fixed: false, variable: false });
  const [creditCardTotal, setCreditCardTotal] = useState(0);
  const [creditCardDisplay, setCreditCardDisplay] = useState('');
  const [showPDFImportDialog, setShowPDFImportDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Reset dataLoaded when userId changes (e.g. advisor switching clients)
  const prevUserIdRef = useRef(userId);
  useEffect(() => {
    if (prevUserIdRef.current !== userId) {
      prevUserIdRef.current = userId;
      setDataLoaded(false);
    }
  }, [userId]);


  
  const queryClient = useQueryClient();
  const autoSaveTimer = useRef(null);
  // Keep a ref to the current reflection id so saveMutation can always access latest
  const reflectionIdRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, [userId]);

  const isAdvisorOrAdmin = currentUser?.user_type === 'advisor' || currentUser?.user_type === 'admin';
  const isViewingOther = !!currentUser && currentUser.id !== userId;
  const viewingClientEmail = (() => {
    try { return JSON.parse(sessionStorage.getItem('viewingClient') || '{}').email || null; } catch { return null; }
  })();

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

  // Load data from DB into state on initial load and when userId changes
  useEffect(() => {
    if (reflectionLoading) return;
    if (dataLoaded) return;

    const inc = reflection?.incomes || { month1: 0, month2: 0, month3: 0, month4: 0, month5: 0, month6: 0 };
    const fixed = reflection?.fixed_expenses || {};
    const variable = reflection?.variable_expenses || {};
    const cc = reflection?.credit_card_total || 0;

    reflectionIdRef.current = reflection?.id || null;

    setIncomes(inc);
    setFixedExpenses(fixed);
    setVariableExpenses(variable);
    setCreditCardTotal(cc);
    setCreditCardDisplay(cc > 0 ? String(cc) : '');

    // Init display strings
    const incDisp = {};
    Object.keys(inc).forEach(k => { incDisp[k] = inc[k] > 0 ? String(inc[k]) : ''; });
    setIncomeDisplays(incDisp);

    const fixDisp = {};
    Object.keys(fixed).forEach(cat => {
      fixDisp[cat] = {};
      ['month1','month2','month3'].forEach(m => { fixDisp[cat][m] = fixed[cat]?.[m] > 0 ? String(fixed[cat][m]) : ''; });
    });
    setFixedDisplays(fixDisp);

    const varDisp = {};
    Object.keys(variable).forEach(cat => {
      varDisp[cat] = {};
      ['month1','month2','month3'].forEach(m => { varDisp[cat][m] = variable[cat]?.[m] > 0 ? String(variable[cat][m]) : ''; });
    });
    setVariableDisplays(varDisp);

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
    onSuccess: (savedRecord) => {
      if (savedRecord?.id) {
        reflectionIdRef.current = savedRecord.id;
        queryClient.setQueryData(['financialReflection', userId], savedRecord);
      }
    },
  });

  // Single auto-save trigger — always uses latest state via closure over the actual state vars
  const triggerAutoSave = useCallback((latestData) => {
    if (!dataLoaded) return;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveMutation.mutate(latestData);
    }, 1000);
  }, [dataLoaded, saveMutation]);

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const calculateIncomeAverage = () => {
    const months = ['month1', 'month2', 'month3', 'month4', 'month5', 'month6'];
    const total = months.reduce((sum, m) => sum + (incomes[m] || 0), 0);
    return Math.round(total / 6);
  };

  const calculateExpenseAverage = (category, type) => {
    const expenses = type === 'fixed' ? fixedExpenses : variableExpenses;
    const categoryData = expenses[category] || {};
    const total = ['month1','month2','month3'].reduce((sum, m) => sum + (categoryData[m] || 0), 0);
    return Math.round(total / 3);
  };

  const getTotalFixedAverage = () => FIXED_EXPENSES.reduce((sum, cat) => sum + calculateExpenseAverage(cat, 'fixed'), 0);
  const getTotalVariableAverage = () => VARIABLE_EXPENSES.reduce((sum, cat) => sum + calculateExpenseAverage(cat, 'variable'), 0);

  const incomeAverage = calculateIncomeAverage();
  const fixedAverage = getTotalFixedAverage();
  const variableAverage = getTotalVariableAverage();
  const totalExpenseAverage = fixedAverage + variableAverage;
  const cashFlowAverage = incomeAverage - totalExpenseAverage;

  const handleIncomeChange = (monthKey, rawValue) => {
    const num = parseFloat(rawValue) || 0;
    const nextIncomes = { ...incomes, [monthKey]: num };
    setIncomeDisplays(prev => ({ ...prev, [monthKey]: rawValue }));
    setIncomes(nextIncomes);
    triggerAutoSave({
      incomes: nextIncomes,
      fixed_expenses: fixedExpenses,
      variable_expenses: variableExpenses,
      credit_card_total: creditCardTotal,
    });
  };

  const updateExpense = (category, month, rawValue, type) => {
    const num = parseFloat(rawValue) || 0;
    if (type === 'fixed') {
      const nextFixed = { ...fixedExpenses, [category]: { ...(fixedExpenses[category] || {}), [month]: num } };
      setFixedDisplays(prev => ({ ...prev, [category]: { ...(prev[category] || {}), [month]: rawValue } }));
      setFixedExpenses(nextFixed);
      triggerAutoSave({
        incomes,
        fixed_expenses: nextFixed,
        variable_expenses: variableExpenses,
        credit_card_total: creditCardTotal,
      });
    } else {
      const nextVariable = { ...variableExpenses, [category]: { ...(variableExpenses[category] || {}), [month]: num } };
      setVariableDisplays(prev => ({ ...prev, [category]: { ...(prev[category] || {}), [month]: rawValue } }));
      setVariableExpenses(nextVariable);
      triggerAutoSave({
        incomes,
        fixed_expenses: fixedExpenses,
        variable_expenses: nextVariable,
        credit_card_total: creditCardTotal,
      });
    }
  };

  if (reflectionLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-48" />
        </div>
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
    <div className="space-y-6">
      {(!isViewingOther || isAdvisorOrAdmin) && (
        <div className="flex justify-end items-center gap-3">
          <Button
            onClick={() => setShowPDFImportDialog(true)}
            variant="outline"
            className="border-red-400 text-red-600 hover:bg-red-50"
          >
            <FileText className="w-4 h-4 ml-2" />
            ייבוא מ-PDF
          </Button>
          <Button
            onClick={() => {
              saveMutation.mutate({
                incomes,
                fixed_expenses: fixedExpenses,
                variable_expenses: variableExpenses,
                credit_card_total: creditCardTotal,
              }, {
                onSuccess: () => {
                  setSaveSuccess(true);
                  setTimeout(() => setSaveSuccess(false), 2000);
                }
              });
            }}
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
          <p className="text-amber-800 font-medium">אתה צופה בנתוני לקוח - ניתן לראות בלבד, לא לערוך</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-xl shadow-emerald-100/50 bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-emerald-500/10">
                <DollarSign className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-emerald-600 font-medium">ממוצע הכנסות</p>
                <p className="text-2xl font-bold text-emerald-700">₪{incomeAverage.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl shadow-rose-100/50 bg-gradient-to-br from-rose-50 to-pink-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-rose-500/10">
                <Receipt className="w-8 h-8 text-rose-600" />
              </div>
              <div>
                <p className="text-sm text-rose-600 font-medium">ממוצע הוצאות</p>
                <p className="text-2xl font-bold text-rose-700">₪{totalExpenseAverage.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-0 shadow-xl ${cashFlowAverage >= 0 ? 'shadow-indigo-100/50 bg-gradient-to-br from-indigo-50 to-purple-50' : 'shadow-red-100/50 bg-gradient-to-br from-red-50 to-orange-50'}`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${cashFlowAverage >= 0 ? 'bg-indigo-500/10' : 'bg-red-500/10'}`}>
                {cashFlowAverage >= 0 ? <TrendingUp className="w-8 h-8 text-indigo-600" /> : <TrendingDown className="w-8 h-8 text-red-600" />}
              </div>
              <div>
                <p className={`text-sm font-medium ${cashFlowAverage >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>תזרים ממוצע</p>
                <p className={`text-2xl font-bold ${cashFlowAverage >= 0 ? 'text-indigo-700' : 'text-red-700'}`}>
                  ₪{cashFlowAverage.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Income Section */}
      <Collapsible open={openSections.income} onOpenChange={() => toggleSection('income')}>
        <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white/80 backdrop-blur-sm overflow-hidden">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-slate-50/50 transition-colors border-b border-slate-100">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className="text-slate-800">הכנסות - 6 חודשים אחרונים</span>
                </span>
                {openSections.income ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[1, 2, 3, 4, 5, 6].map((month) => (
                  <div key={month} className="space-y-2">
                    <Label className="text-slate-500 text-sm">חודש {month}</Label>
                    <Input
                      type="number"
                      value={incomeDisplays[`month${month}`] ?? ''}
                      onChange={(e) => handleIncomeChange(`month${month}`, e.target.value)}
                      placeholder="סכום"
                      className="border-slate-200"
                      disabled={isViewingOther && !isAdvisorOrAdmin}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200/50">
                <p className="font-semibold text-emerald-700">ממוצע הכנסות: ₪{incomeAverage.toLocaleString()}</p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Fixed Expenses Section */}
      <Collapsible open={openSections.fixed} onOpenChange={() => toggleSection('fixed')}>
        <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white/80 backdrop-blur-sm overflow-hidden">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-slate-50/50 transition-colors border-b border-slate-100">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10">
                    <Receipt className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-slate-800">הוצאות קבועות - 3 חודשים אחרונים</span>
                </span>
                {openSections.fixed ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {FIXED_EXPENSES.map((category) => {
                  const avg = calculateExpenseAverage(category, 'fixed');
                  return (
                    <div key={category} className="grid grid-cols-5 gap-4 items-center p-3 bg-slate-50/50 rounded-xl">
                      <Label className="col-span-2 font-medium text-slate-700">{category}</Label>
                      {[1, 2, 3].map((month) => (
                        <Input
                          key={month}
                          type="number"
                          value={fixedDisplays[category]?.[`month${month}`] ?? ''}
                          onChange={(e) => updateExpense(category, `month${month}`, e.target.value, 'fixed')}
                          placeholder={`חודש ${month}`}
                          className="border-slate-200"
                          disabled={isViewingOther && !isAdvisorOrAdmin}
                        />
                      ))}
                      <p className="text-sm font-semibold text-blue-600">ממוצע: ₪{avg.toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/50">
                <p className="font-semibold text-blue-700">סה״כ ממוצע הוצאות קבועות: ₪{fixedAverage.toLocaleString()}</p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Variable Expenses Section */}
      <Collapsible open={openSections.variable} onOpenChange={() => toggleSection('variable')}>
        <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white/80 backdrop-blur-sm overflow-hidden">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-slate-50/50 transition-colors border-b border-slate-100">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-500/10">
                    <Receipt className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-slate-800">יתרת הוצאות - 3 חודשים אחרונים</span>
                </span>
                {openSections.variable ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-6">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {VARIABLE_EXPENSES.map((category) => {
                  const avg = calculateExpenseAverage(category, 'variable');
                  return (
                    <div key={category} className="grid grid-cols-5 gap-4 items-center p-3 bg-slate-50/50 rounded-xl">
                      <Label className="col-span-2 font-medium text-slate-700">{category}</Label>
                      {[1, 2, 3].map((month) => (
                        <Input
                          key={month}
                          type="number"
                          value={variableDisplays[category]?.[`month${month}`] ?? ''}
                          onChange={(e) => updateExpense(category, `month${month}`, e.target.value, 'variable')}
                          placeholder={`חודש ${month}`}
                          className="border-slate-200"
                          disabled={isViewingOther && !isAdvisorOrAdmin}
                        />
                      ))}
                      <p className="text-sm font-semibold text-purple-600">ממוצע: ₪{avg.toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-200/50">
                <p className="font-semibold text-purple-700">סה״כ ממוצע יתרת הוצאות: ₪{variableAverage.toLocaleString()}</p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Credit Card Total */}
      <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white/80 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-xl bg-orange-500/10 shrink-0">
              <Receipt className="w-5 h-5 text-orange-600" />
            </div>
            <Label className="text-slate-700 font-semibold text-base whitespace-nowrap">סך הכל חיוב אשראי נוכחי</Label>
            <div className="flex-1 max-w-xs">
              <Input
                type="text"
                inputMode="numeric"
                value={creditCardDisplay}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  const num = parseInt(raw, 10) || 0;
                  setCreditCardTotal(num);
                  setCreditCardDisplay(raw);
                  triggerAutoSave({
                    incomes,
                    fixed_expenses: fixedExpenses,
                    variable_expenses: variableExpenses,
                    credit_card_total: num,
                  });
                }}
                placeholder="₪ הזן סכום"
                className="border-orange-200 focus-visible:ring-orange-400 text-left"
                disabled={isViewingOther && !isAdvisorOrAdmin}
                dir="ltr"
              />
            </div>
            <p className="text-xs text-slate-400 hidden md:block">* מספר לצורך בהירות בלבד, לא נכלל בחישובים</p>
          </div>
        </CardContent>
      </Card>

      {/* Averages Bar Chart */}
      {(incomeAverage > 0 || totalExpenseAverage > 0) && (
        <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-slate-800">
              <div className="p-2 rounded-xl bg-indigo-500/10">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
              </div>
              סיכום ממוצעים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={[
                { name: 'ממוצע הכנסות', ערך: incomeAverage },
                { name: 'ממוצע הוצאות', ערך: totalExpenseAverage },
                { name: 'ממוצע תזרים', ערך: cashFlowAverage },
              ]} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#64748b' }} />
                <YAxis tickFormatter={(v) => `₪${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip formatter={(value) => [`₪${value.toLocaleString()}`, 'סכום']} contentStyle={{ direction: 'rtl', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                <ReferenceLine y={0} stroke="#94a3b8" />
                <Bar dataKey="ערך" radius={[6, 6, 0, 0]}>
                  {[
                    { fill: '#10b981' },
                    { fill: '#f43f5e' },
                    { fill: cashFlowAverage >= 0 ? '#6366f1' : '#ef4444' },
                  ].map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
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
          let nextFixed = { ...fixedExpenses };
          let nextVariable = { ...variableExpenses };
          items.forEach(item => {
            if (item.type === 'fixed') {
              nextFixed = { ...nextFixed, [item.category]: { ...(nextFixed[item.category] || {}), [item.month]: (nextFixed[item.category]?.[item.month] || 0) + item.amount } };
            } else {
              nextVariable = { ...nextVariable, [item.category]: { ...(nextVariable[item.category] || {}), [item.month]: (nextVariable[item.category]?.[item.month] || 0) + item.amount } };
            }
          });
          setFixedExpenses(nextFixed);
          setVariableExpenses(nextVariable);
          saveMutation.mutate({
            incomes,
            fixed_expenses: nextFixed,
            variable_expenses: nextVariable,
            credit_card_total: creditCardTotal,
          });
        }}
      />
    </div>
  );
}