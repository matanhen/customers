import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Target, FileDown, Loader2, ChevronDown, ChevronUp, Edit3, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FinancialJourney from './FinancialJourney';
import PlanActionItems from './PlanActionItems';
import PlanSituation from './PlanSituation';
import { exportPlanToPDF } from './planPDFExport';
import { FINANCIAL_STEPS, getStepValue, getStepTarget, getStepGap, formatCurrency } from './financialPlanSteps';

const MONTHS = ['month1','month2','month3','month4','month5','month6'];

function currentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function calcSituation(reflection, monthBalance, latestPlan, investments) {
  const missing = [];

  // Income from reflection
  let income = 0;
  if (reflection) {
    const rows = (reflection.income_rows || []).filter(r => r?.id !== 'pension_male' && r?.id !== 'pension_female');
    if (rows.length === 0 && !reflection.incomes) missing.push('הכנסות בשיקוף הפיננסי');
    income = Math.round(rows.reduce((s, r) => s + MONTHS.reduce((a, m) => a + (r[m] || 0), 0) / 6, 0));
  } else {
    missing.push('שיקוף פיננסי — הכנסות');
  }

  // Expenses from reflection
  let totalExpenses = 0;
  if (reflection?.expenses && typeof reflection.expenses === 'object' && !Array.isArray(reflection.expenses)) {
    totalExpenses = Math.round(
      Object.values(reflection.expenses).reduce((s, catData) => {
        if (!catData || typeof catData !== 'object') return s;
        return s + Object.values(catData).reduce((cs, itemData) => {
          if (!itemData || typeof itemData !== 'object') return cs;
          return cs + ['month1','month2','month3'].reduce((a, m) => a + (itemData[m] || 0), 0) / 3;
        }, 0);
      }, 0)
    );
  } else {
    if (!reflection) missing.push('שיקוף פיננסי — הוצאות');
  }

  const cashFlow = income - totalExpenses;
  const checkingBalance = reflection?.checking_account_balance != null ? Number(reflection.checking_account_balance) : 0;
  if (!reflection || reflection.checking_account_balance == null) missing.push('יתרת עו"ש בשיקוף הפיננסי');

  // Balance data
  let totalAssets = 0, totalLiabilities = 0, passiveIncome = 0;
  if (monthBalance) {
    const assets = monthBalance.assets?.items || [];
    const liabilities = monthBalance.liabilities?.items || [];
    totalAssets = assets.reduce((s, a) => s + (Number(a.value) || 0), 0);
    totalLiabilities = liabilities.reduce((s, l) => s + (Number(l.balance) || 0), 0);
    passiveIncome = assets.reduce((s, a) => s + (Number(a.monthly_income) || 0), 0)
      - liabilities.reduce((s, l) => s + (Number(l.monthly_payment) || 0), 0);
  } else {
    missing.push('מאזן — נכסים והתחייבויות');
  }

  const netWorth = totalAssets - totalLiabilities;
  const emergencyFund = latestPlan?.emergency_fund_current || 0;
  const hasInvestments = (investments || []).length > 0;

  return {
    income, totalExpenses, cashFlow, checkingBalance,
    totalAssets, totalLiabilities, passiveIncome, netWorth,
    emergencyFund, hasInvestments,
    essentialExpenses: totalExpenses,
    monthlyExpenses: totalExpenses,
    missing,
  };
}

export default function FinancialPlan({ userId }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [planData, setPlanData] = useState(null);
  const [planId, setPlanId] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showStepSelector, setShowStepSelector] = useState(false);
  const [showPersonalGoal, setShowPersonalGoal] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const autoSaveTimer = useRef(null);
  const pendingDataRef = useRef(null);
  const planIdRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, [userId]);

  const isAdvisorOrAdmin = currentUser?.user_type === 'advisor' || currentUser?.user_type === 'admin';
  const isViewingOther = !!currentUser && currentUser.id !== userId;
  const viewingClientEmail = (() => {
    try { return JSON.parse(sessionStorage.getItem('viewingClient') || '{}').email || null; } catch { return null; }
  })();

  // Fetch existing data
  const { data: reflection } = useQuery({
    queryKey: ['financialReflection', userId, isViewingOther, isAdvisorOrAdmin],
    queryFn: async () => {
      if (isViewingOther && isAdvisorOrAdmin) {
        const r = await base44.functions.invoke('getClientData', { clientUserId: userId, clientEmail: viewingClientEmail, entityName: 'FinancialReflection' });
        return r.data.data[0];
      }
      const results = await base44.entities.FinancialReflection.filter({ user_id: userId });
      return results[0];
    },
    enabled: !!userId && !!currentUser,
    staleTime: 30000,
  });

  const { data: monthBalance } = useQuery({
    queryKey: ['monthlyBalance', userId, currentMonthStr()],
    queryFn: async () => {
      if (isViewingOther && isAdvisorOrAdmin) {
        const r = await base44.functions.invoke('getClientData', { clientUserId: userId, clientEmail: viewingClientEmail, entityName: 'MonthlyBalance' });
        return (r.data.data || []).find(m => m.month === currentMonthStr());
      }
      const results = await base44.entities.MonthlyBalance.filter({ user_id: userId, month: currentMonthStr() });
      return results[0];
    },
    enabled: !!userId && !!currentUser,
    staleTime: 30000,
  });

  const { data: monthlyPlans } = useQuery({
    queryKey: ['monthlyPlans', userId, isViewingOther, isAdvisorOrAdmin],
    queryFn: async () => {
      if (isViewingOther && isAdvisorOrAdmin) {
        const r = await base44.functions.invoke('getClientData', { clientUserId: userId, clientEmail: viewingClientEmail, entityName: 'MonthlyPlan' });
        return r.data.data || [];
      }
      return base44.entities.MonthlyPlan.filter({ user_id: userId });
    },
    enabled: !!userId && !!currentUser,
    staleTime: 30000,
  });

  const { data: investments } = useQuery({
    queryKey: ['investments', userId, isViewingOther, isAdvisorOrAdmin],
    queryFn: async () => {
      if (isViewingOther && isAdvisorOrAdmin) {
        const r = await base44.functions.invoke('getClientData', { clientUserId: userId, clientEmail: viewingClientEmail, entityName: 'Investment' });
        return r.data.data || [];
      }
      return base44.entities.Investment.filter({ user_id: userId });
    },
    enabled: !!userId && !!currentUser,
    staleTime: 30000,
  });

  const { data: existingPlan } = useQuery({
    queryKey: ['financialPlanData', userId, isViewingOther, isAdvisorOrAdmin],
    queryFn: async () => {
      if (isViewingOther && isAdvisorOrAdmin) {
        const r = await base44.functions.invoke('getClientData', { clientUserId: userId, clientEmail: viewingClientEmail, entityName: 'FinancialPlanData' });
        return r.data.data[0];
      }
      const results = await base44.entities.FinancialPlanData.filter({ user_id: userId });
      return results[0];
    },
    enabled: !!userId && !!currentUser,
    staleTime: 0,
  });

  useEffect(() => {
    if (existingPlan && !dataLoaded) {
      setPlanData(existingPlan);
      setPlanId(existingPlan.id);
      planIdRef.current = existingPlan.id;
      setDataLoaded(true);
    } else if (!existingPlan && !!userId && !!currentUser && !dataLoaded) {
      // Auto-create default plan
      const defaultPlan = {
        user_id: userId, client_name: '', main_goal: '', current_step: 1,
        step_targets: {}, actions: [], personal_goal_name: '', personal_goal_amount: 0,
        personal_goal_date: '', personal_goal_monthly: 0, personal_goal_note: '', advisor_notes: '',
      };
      const create = async () => {
        try {
          let created;
          if (isViewingOther && isAdvisorOrAdmin) {
            const r = await base44.functions.invoke('saveClientData', { entityName: 'FinancialPlanData', clientUserId: userId, data: defaultPlan, recordId: null });
            created = r.data;
          } else {
            created = await base44.entities.FinancialPlanData.create(defaultPlan);
          }
          setPlanData(created);
          setPlanId(created.id);
          planIdRef.current = created.id;
          queryClient.setQueryData(['financialPlanData', userId, isViewingOther, isAdvisorOrAdmin], created);
        } catch (e) { console.error('Failed to create plan', e); }
        setDataLoaded(true);
      };
      create();
    }
  }, [existingPlan, userId, currentUser, dataLoaded]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data, user_id: userId };
      if (isViewingOther && isAdvisorOrAdmin) {
        const r = await base44.functions.invoke('saveClientData', { entityName: 'FinancialPlanData', clientUserId: userId, data: payload, recordId: planIdRef.current || null });
        if (r.data?.id) planIdRef.current = r.data.id;
        return r.data;
      }
      if (planIdRef.current) {
        return base44.entities.FinancialPlanData.update(planIdRef.current, payload);
      }
      const created = await base44.entities.FinancialPlanData.create(payload);
      planIdRef.current = created.id;
      return created;
    },
    onSuccess: (result) => {
      if (result?.id) {
        queryClient.setQueryData(['financialPlanData', userId, isViewingOther, isAdvisorOrAdmin], result);
      }
    },
  });

  const saveMutationRef = useRef(saveMutation);
  useEffect(() => { saveMutationRef.current = saveMutation; }, [saveMutation]);

  const triggerAutoSave = useCallback((newData) => {
    pendingDataRef.current = newData;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (pendingDataRef.current) {
        saveMutationRef.current.mutate(pendingDataRef.current);
        pendingDataRef.current = null;
      }
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

  const update = (updates) => {
    if (!planData) return;
    const newData = { ...planData, ...updates };
    setPlanData(newData);
    triggerAutoSave(newData);
  };

  const situation = calcSituation(reflection, monthBalance,
    (monthlyPlans || []).sort((a, b) => (b.month || '').localeCompare(a.month || ''))[0],
    investments || []);

  if (!planData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#105330] animate-spin" />
      </div>
    );
  }

  const currentStep = planData.current_step || 1;
  const currentStepInfo = FINANCIAL_STEPS.find(s => s.id === currentStep) || FINANCIAL_STEPS[0];
  const stepGap = getStepGap(currentStep, situation, planData.step_targets);
  const stepValue = getStepValue(currentStep, situation);
  const stepTarget = getStepTarget(currentStep, situation, planData.step_targets);

  const handleExport = async () => {
    setExporting(true);
    try {
      let logoUrl = null;
      try {
        const logoRes = await base44.functions.invoke('getSiteLogo', {});
        logoUrl = logoRes?.data?.logo_url || logoRes?.logo_url || null;
      } catch (e) {}
      await exportPlanToPDF({ planData, situation, currentStep, logoUrl });
    } catch (e) {
      console.error('PDF export failed', e);
      alert('שגיאה ביצירת הקובץ. נסה שוב.');
    }
    setExporting(false);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            {isAdvisorOrAdmin ? (
              <Input
                value={planData.client_name || ''}
                onChange={e => update({ client_name: e.target.value })}
                placeholder="שם הלקוח"
                className="text-2xl font-bold text-[#105330] border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            ) : (
              <h1 className="text-2xl font-bold text-[#105330]">
                התוכנית הפיננסית של {planData.client_name || 'הלקוח'}
              </h1>
            )}
          </div>
          <Button
            onClick={handleExport}
            disabled={exporting}
            className="bg-[#105330] hover:bg-[#0d4027] flex-shrink-0"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <FileDown className="w-4 h-4 ml-2" />}
            {exporting ? 'מייצר...' : 'צור את התוכנית הפיננסית שלי'}
          </Button>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <Target className="w-5 h-5 text-[#c8a863] flex-shrink-0" />
          {isAdvisorOrAdmin ? (
            <Input
              value={planData.main_goal || ''}
              onChange={e => update({ main_goal: e.target.value })}
              placeholder="המטרה המרכזית של הלקוח"
              className="text-base text-slate-600 border-0 px-0 focus-visible:ring-0"
            />
          ) : (
            <p className="text-base text-slate-600">
              <span className="font-medium text-slate-500">המטרה המרכזית: </span>
              {planData.main_goal || 'טרם הוגדרה'}
            </p>
          )}
        </div>
      </div>

      {/* Current Situation */}
      <PlanSituation situation={situation} missingData={situation.missing || []} />

      {/* Next Goal */}
      <div className="bg-gradient-to-l from-[#105330] to-[#0d4027] rounded-3xl shadow-xl p-6 md:p-8 text-white">
        <p className="text-sm text-white/60 mb-1">היעד הבא שלך</p>
        <h2 className="text-2xl font-bold mb-4">{currentStepInfo.label}</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-white/50 mb-1">היעד</p>
            <p className="text-xl font-bold text-[#c8a863]">
              {currentStepInfo.unit ? formatCurrency(stepTarget) : 'פתיחת תיק'}
            </p>
          </div>
          <div>
            <p className="text-xs text-white/50 mb-1">המצב היום</p>
            <p className="text-xl font-bold">
              {currentStepInfo.unit ? formatCurrency(stepValue) : stepValue ? 'פתוח' : 'לא פתוח'}
            </p>
          </div>
          <div>
            <p className="text-xs text-white/50 mb-1">הפער</p>
            <p className="text-xl font-bold text-[#c8a863]">
              {stepGap > 0 ? formatCurrency(stepGap) : '✓ הושלם'}
            </p>
          </div>
        </div>
        {stepGap > 0 && (
          <p className="mt-4 text-sm text-white/70">
            נשאר לך לסגור פער של <span className="font-bold text-[#c8a863]">{formatCurrency(stepGap)}</span>
          </p>
        )}
      </div>

      {/* Step Selector (advisor) */}
      {isAdvisorOrAdmin && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <button
              onClick={() => setShowStepSelector(!showStepSelector)}
              className="flex items-center justify-between w-full"
            >
              <span className="font-bold text-[#105330]">בחירת שלב נוכחי — שלב {currentStep}: {currentStepInfo.label}</span>
              {showStepSelector ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            {showStepSelector && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                {FINANCIAL_STEPS.map(step => (
                  <button
                    key={step.id}
                    onClick={() => { update({ current_step: step.id }); setShowStepSelector(false); }}
                    className={`text-right p-3 rounded-xl border-2 transition-all ${
                      step.id === currentStep
                        ? 'border-[#105330] bg-[#105330]/5'
                        : 'border-slate-100 hover:border-[#105330]/30'
                    }`}
                  >
                    <span className="font-bold text-sm text-[#105330]">שלב {step.id}</span>
                    <p className="text-sm text-slate-600">{step.label}</p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Journey */}
      <Card className="border-0 shadow-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-[#105330]">המסלול הפיננסי</CardTitle>
        </CardHeader>
        <CardContent>
          <FinancialJourney
            situation={situation}
            currentStep={currentStep}
            stepTargets={planData.step_targets}
            onStepClick={(id) => isAdvisorOrAdmin && update({ current_step: id })}
            editable={isAdvisorOrAdmin}
          />
        </CardContent>
      </Card>

      {/* Action Items */}
      <PlanActionItems
        actions={planData.actions || []}
        onChange={(actions) => update({ actions })}
        editable={isAdvisorOrAdmin}
        isClient={!isAdvisorOrAdmin}
      />

      {/* Personal Goal */}
      <Card className="border-0 shadow-xl">
        <CardHeader className="pb-3">
          <button
            onClick={() => isAdvisorOrAdmin && setShowPersonalGoal(!showPersonalGoal)}
            className="flex items-center justify-between w-full"
          >
            <CardTitle className="text-[#105330]">המטרה האישית</CardTitle>
            {isAdvisorOrAdmin && (showPersonalGoal ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />)}
          </button>
        </CardHeader>
        <CardContent>
          {planData.personal_goal_name && !showPersonalGoal ? (
            <div className="space-y-1">
              <p className="font-bold text-slate-800">{planData.personal_goal_name}</p>
              {planData.personal_goal_amount > 0 && <p className="text-sm text-slate-500">סכום יעד: {formatCurrency(planData.personal_goal_amount)}</p>}
              {planData.personal_goal_date && <p className="text-sm text-slate-500">תאריך יעד: {planData.personal_goal_date}</p>}
              {planData.personal_goal_monthly > 0 && <p className="text-sm text-slate-500">יעד חודשי: {formatCurrency(planData.personal_goal_monthly)}</p>}
              {planData.personal_goal_note && <p className="text-sm text-slate-400 mt-2">{planData.personal_goal_note}</p>}
            </div>
          ) : isAdvisorOrAdmin && showPersonalGoal ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">שם המטרה</Label>
                <Input value={planData.personal_goal_name || ''} onChange={e => update({ personal_goal_name: e.target.value })} placeholder="המטרה האישית הגדולה" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">סכום יעד (₪)</Label>
                  <Input type="number" value={planData.personal_goal_amount || ''} onChange={e => update({ personal_goal_amount: Number(e.target.value) || 0 })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">תאריך יעד</Label>
                  <Input type="date" value={planData.personal_goal_date || ''} onChange={e => update({ personal_goal_date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">יעד חודשי (₪)</Label>
                <Input type="number" value={planData.personal_goal_monthly || ''} onChange={e => update({ personal_goal_monthly: Number(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">הערת יועץ</Label>
                <Textarea value={planData.personal_goal_note || ''} onChange={e => update({ personal_goal_note: e.target.value })} rows={2} />
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-sm">טרם הוגדרה מטרה אישית</p>
          )}
        </CardContent>
      </Card>

      {/* Advisor Notes */}
      {isAdvisorOrAdmin && (
        <Card className="border-0 shadow-xl">
          <CardHeader className="pb-3">
            <button onClick={() => setShowNotes(!showNotes)} className="flex items-center justify-between w-full">
              <CardTitle className="text-[#105330]">הערות יועץ</CardTitle>
              {showNotes ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
          </CardHeader>
          {showNotes && (
            <CardContent>
              <Textarea
                value={planData.advisor_notes || ''}
                onChange={e => update({ advisor_notes: e.target.value })}
                placeholder="הערות אישיות על הלקוח..."
                rows={4}
              />
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}