import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subMonths, addMonths } from 'date-fns';
import { he } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, Wallet, Receipt,
  Plus, Trash2, AlertTriangle, CheckCircle,
  Target, Clock, FileText, Image, CreditCard, PenLine
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import PDFExpenseImport from './PDFExpenseImport';
import ImageCreditImport from './ImageCreditImport';
import ExpenseTrackingTable from './ExpenseTrackingTable';
import { EXPENSE_CATEGORIES, ALL_EXPENSE_ITEMS } from './expenseCategories';

export default function ExpenseTracking({ userId }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showPDFImportDialog, setShowPDFImportDialog] = useState(false);
  const [showImageImportDialog, setShowImageImportDialog] = useState(false);
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [manualForm, setManualForm] = useState({ catKey: '', item: '', amount: '' });
  const [currentUser, setCurrentUser] = useState(null);

  // Credit payment form state
  const [creditForm, setCreditForm] = useState({
    category: '',
    total_amount: '',
    total_installments: '',
    paid_installments: '',
  });

  const [trackingData, setTrackingData] = useState({
    actual_income: 0,
    fixed_expenses: {},
    variable_expenses: {},
    custom_expenses: [],
    credit_payments: [],
    freedom_transfer_done: false
  });

  const queryClient = useQueryClient();
  const currentMonth = format(currentDate, 'yyyy-MM');

  const isAdvisorOrAdmin = currentUser?.user_type === 'advisor' || currentUser?.user_type === 'admin';
  const isViewingOther = !!currentUser && currentUser.id !== userId;

  const viewingClientEmail = (() => {
    try { return JSON.parse(sessionStorage.getItem('viewingClient') || '{}').email || null; } catch { return null; }
  })();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, [userId]);

  const { data: allTracking = [], isLoading: trackingLoading } = useQuery({
    queryKey: ['expenseTracking', userId, currentUser?.id, isViewingOther, isAdvisorOrAdmin],
    queryFn: async () => {
      if (isViewingOther && isAdvisorOrAdmin) {
        const response = await base44.functions.invoke('getClientData', {
          clientUserId: userId,
          clientEmail: viewingClientEmail,
          entityName: 'ExpenseTracking'
        });
        return response.data.data;
      }
      return base44.entities.ExpenseTracking.filter({ user_id: userId });
    },
    enabled: !!userId && !!currentUser,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: monthlyPlans = [] } = useQuery({
    queryKey: ['monthlyPlans', userId, currentUser?.id, String(isViewingOther), String(isAdvisorOrAdmin)],
    queryFn: async () => {
      if (isViewingOther && isAdvisorOrAdmin) {
        const response = await base44.functions.invoke('getClientData', {
          clientUserId: userId,
          clientEmail: viewingClientEmail,
          entityName: 'MonthlyPlan'
        });
        return response.data.data;
      }
      return base44.entities.MonthlyPlan.filter({ user_id: userId });
    },
    enabled: !!userId && !!currentUser,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const currentTracking = allTracking.find(t => t.month === currentMonth);
  const currentPlan = monthlyPlans.find(p => p.month === currentMonth);

  const dataLoadedRef = useRef(false);
  const lastLoadedTrackingIdRef = useRef(null);

  useEffect(() => {
    if (currentTracking) {
      if (lastLoadedTrackingIdRef.current === currentTracking.id && dataLoadedRef.current) return;
      lastLoadedTrackingIdRef.current = currentTracking.id;
      dataLoadedRef.current = false;
      setTrackingData({
        actual_income: currentTracking.actual_income || 0,
        fixed_expenses: currentTracking.fixed_expenses || {},
        variable_expenses: currentTracking.variable_expenses || {},
        custom_expenses: currentTracking.custom_expenses || [],
        credit_payments: currentTracking.credit_payments || [],
        freedom_transfer_done: currentTracking.freedom_transfer_done || false
      });
      setTimeout(() => { dataLoadedRef.current = true; }, 100);
    } else if (!trackingLoading && allTracking !== undefined) {
      if (lastLoadedTrackingIdRef.current === `empty-${currentMonth}` && dataLoadedRef.current) return;
      lastLoadedTrackingIdRef.current = `empty-${currentMonth}`;
      dataLoadedRef.current = false;

      // Auto-carry-over active credit payments from previous month
      const prevMonth = format(subMonths(currentDate, 1), 'yyyy-MM');
      const prevTracking = allTracking.find(t => t.month === prevMonth);
      const prevPayments = prevTracking?.credit_payments || [];
      const carriedPayments = prevPayments
        .map(p => ({ ...p, paid_installments: (p.paid_installments || 0) + 1 }))
        .filter(p => (p.total_installments || 1) - (p.paid_installments || 0) > 0);

      setTrackingData({
        actual_income: 0,
        fixed_expenses: {},
        variable_expenses: {},
        custom_expenses: [],
        credit_payments: carriedPayments,
        freedom_transfer_done: false
      });
      setTimeout(() => { dataLoadedRef.current = true; }, 100);
    }
  }, [currentTracking, currentMonth, trackingLoading, allTracking, currentDate]);

  const currentTrackingIdRef = useRef(null);
  useEffect(() => {
    currentTrackingIdRef.current = currentTracking?.id || null;
  }, [currentTracking]);

  const trackingDataRef = useRef(trackingData);
  trackingDataRef.current = trackingData;

  const saveNow = useCallback(async (data) => {
    if (!dataLoadedRef.current) return;
    const month = format(currentDate, 'yyyy-MM');
    if (isViewingOther && isAdvisorOrAdmin) {
      const response = await base44.functions.invoke('saveClientData', {
        entityName: 'ExpenseTracking',
        clientUserId: userId,
        data: { ...data, user_id: userId, month },
        recordId: currentTrackingIdRef.current || null,
      });
      if (response.data?.id) currentTrackingIdRef.current = response.data.id;
    } else if (currentTrackingIdRef.current) {
      await base44.entities.ExpenseTracking.update(currentTrackingIdRef.current, data);
    } else {
      const created = await base44.entities.ExpenseTracking.create({ ...data, user_id: userId, month });
      currentTrackingIdRef.current = created.id;
    }
    queryClient.invalidateQueries({ queryKey: ['expenseTracking', userId] });
  }, [userId, currentDate, queryClient, isViewingOther, isAdvisorOrAdmin]);

  const saveNowRef = useRef(saveNow);
  saveNowRef.current = saveNow;

  const handleBlurSave = () => saveNowRef.current(trackingDataRef.current);

  // Handle table changes (flat expenses from ExpenseTrackingTable)
  // The table gives { [catKey]: { [item]: amount } }
  // We need to flatten it to { [item]: amount } for fixed_expenses
  const handleExpenseTableChange = (categoryExpenses) => {
    // Flatten all categories into a single fixed_expenses dict
    const flat = {};
    Object.values(categoryExpenses).forEach(catItems => {
      Object.entries(catItems).forEach(([item, amount]) => {
        flat[item] = (flat[item] || 0) + (amount || 0);
      });
    });
    const newData = { ...trackingData, fixed_expenses: flat, _categoryExpenses: categoryExpenses };
    setTrackingData(newData);
    saveNow(newData);
  };

  // Build category expenses from flat fixed_expenses for the table component
  const getCategoryExpenses = () => {
    // Try _categoryExpenses first (from table edits), otherwise reconstruct
    if (trackingData._categoryExpenses) return trackingData._categoryExpenses;
    const catExpenses = {};
    EXPENSE_CATEGORIES.forEach(cat => { catExpenses[cat.key] = {}; });
    Object.entries(trackingData.fixed_expenses || {}).forEach(([item, amount]) => {
      let catKey = 'misc';
      for (const cat of EXPENSE_CATEGORIES) {
        if (cat.items.includes(item)) { catKey = cat.key; break; }
      }
      if (!catExpenses[catKey]) catExpenses[catKey] = {};
      catExpenses[catKey][item] = amount;
    });
    return catExpenses;
  };

  // Credit payment logic
  const addCreditPayment = () => {
    if (!creditForm.category || !creditForm.total_amount || !creditForm.total_installments) return;
    const totalInstallments = parseInt(creditForm.total_installments) || 1;
    const paidInstallments = parseInt(creditForm.paid_installments) || 0;
    const totalAmount = parseFloat(creditForm.total_amount) || 0;
    const monthlyAmount = Math.round(totalAmount / totalInstallments);

    const newPayment = {
      id: Date.now().toString(),
      category: creditForm.category,
      total_amount: totalAmount,
      total_installments: totalInstallments,
      paid_installments: paidInstallments,
      monthly_amount: monthlyAmount,
    };

    const newPayments = [...(trackingData.credit_payments || []), newPayment];
    const newData = { ...trackingData, credit_payments: newPayments };
    setTrackingData(newData);
    saveNow(newData);
    setCreditForm({ category: '', total_amount: '', total_installments: '', paid_installments: '' });
    setShowCreditDialog(false);
  };

  const removeCreditPayment = (id) => {
    const newPayments = (trackingData.credit_payments || []).filter(p => p.id !== id);
    const newData = { ...trackingData, credit_payments: newPayments };
    setTrackingData(newData);
    saveNow(newData);
  };

  // Manual expense entry
  const addManualExpense = () => {
    if (!manualForm.catKey || !manualForm.item || !manualForm.amount) return;
    const amount = parseFloat(manualForm.amount) || 0;
    const newCatExpenses = { ...categoryExpenses };
    if (!newCatExpenses[manualForm.catKey]) newCatExpenses[manualForm.catKey] = {};
    newCatExpenses[manualForm.catKey][manualForm.item] = (newCatExpenses[manualForm.catKey][manualForm.item] || 0) + amount;
    handleExpenseTableChange(newCatExpenses);
    setManualForm({ catKey: '', item: '', amount: '' });
    setShowManualDialog(false);
  };

  // Totals
  const totalExpensesFromTable = Object.values(trackingData.fixed_expenses || {}).reduce((s, v) => s + (v || 0), 0);
  const totalVariableActual = Object.values(trackingData.variable_expenses || {}).reduce((s, v) => s + (v || 0), 0);
  const customTotal = (trackingData.custom_expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
  const creditTotal = (trackingData.credit_payments || []).reduce((s, p) => {
    const remaining = (p.total_installments || 1) - (p.paid_installments || 0);
    return remaining > 0 ? s + (p.monthly_amount || 0) : s;
  }, 0);
  const totalActual = totalExpensesFromTable + totalVariableActual + customTotal + creditTotal;

  const plannedFixed = currentPlan?.fixed_expenses || 0;
  const plannedVariable = currentPlan?.variable_expenses || 0;
  const plannedTotal = plannedFixed + plannedVariable;

  const weeklyVariableBudget = plannedVariable / 4;
  const currentDay = new Date().getDate();
  const currentWeek = currentDay < 10 ? 4 : Math.min(4, Math.ceil((currentDay - 9) / 7));
  const expectedVariableSpent = weeklyVariableBudget * currentWeek;
  const isOnTrack = totalActual <= expectedVariableSpent + (plannedTotal - plannedVariable);

  const getRecommendations = () => {
    if (plannedTotal === 0) return [];
    if (!isOnTrack) {
      const overspend = totalActual - (expectedVariableSpent + plannedFixed);
      return [{ type: 'warning', message: `חריגה מהקצב המומלץ ב-₪${Math.max(0, Math.round(overspend)).toLocaleString()}. יש להאט את קצב ההוצאות.` }];
    }
    return [{ type: 'success', message: 'אתה בקצב טוב! ממשיך בדרך הנכונה לעמוד בתכנון החודשי.' }];
  };
  const recommendations = getRecommendations();

  const categoryExpenses = getCategoryExpenses();

  return (
    <div className="space-y-6">
      {/* Month Navigation */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(prev => addMonths(prev, 1))}>
              <ChevronRight className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-bold text-[#105330]">
              מעקב הוצאות - {format(currentDate, 'MMMM yyyy', { locale: he })}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(prev => subMonths(prev, 1))}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Actual Income */}
      <Card className="border-2 border-green-300 bg-green-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg text-green-700">
            <Wallet className="w-5 h-5 text-green-600" />
            הכנסה בפועל
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Input
              type="number"
              value={trackingData.actual_income || ''}
              onChange={e => setTrackingData({ ...trackingData, actual_income: parseFloat(e.target.value) || 0 })}
              onBlur={handleBlurSave}
              placeholder="הזן הכנסה בפועל"
              className="text-lg font-medium flex-1"
            />
            {currentPlan?.expected_income && (
              <div className="text-sm text-gray-500">תכנון: ₪{currentPlan.expected_income.toLocaleString()}</div>
            )}
          </div>
          {trackingData.actual_income > 0 && currentPlan?.expected_income > 0 && (
            <div className={`mt-2 text-sm ${trackingData.actual_income >= currentPlan.expected_income ? 'text-green-600' : 'text-amber-600'}`}>
              {trackingData.actual_income >= currentPlan.expected_income
                ? `+₪${(trackingData.actual_income - currentPlan.expected_income).toLocaleString()} מעל התכנון`
                : `-₪${(currentPlan.expected_income - trackingData.actual_income).toLocaleString()} מתחת לתכנון`
              }
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credit Payments Section */}
      <Card className="border-2 border-purple-200 bg-purple-50/30">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-purple-700">
              <CreditCard className="w-5 h-5 text-purple-600" />
              תשלומים באשראי
            </CardTitle>
            <Button size="sm" onClick={() => setShowCreditDialog(true)} className="bg-purple-600 hover:bg-purple-700 text-white">
              <Plus className="w-4 h-4 ml-1" />הוסף
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(trackingData.credit_payments || []).length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-2">אין תשלומים באשראי פעילים</p>
          ) : (
            <div className="space-y-2">
              {(trackingData.credit_payments || []).map(p => {
                const remaining = (p.total_installments || 1) - (p.paid_installments || 0);
                const isActive = remaining > 0;
                return (
                  <div key={p.id} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${isActive ? 'bg-white border-purple-100' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                    <div>
                      <span className="font-medium text-slate-800 text-sm">{p.category}</span>
                      <span className="text-xs text-slate-400 mr-2">
                        תשלום {(p.paid_installments || 0) + 1} מתוך {p.total_installments}
                        {' '}&bull; נותרו {remaining} תשלומים
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-purple-700">₪{(p.monthly_amount || 0).toLocaleString()}/חודש</span>
                      <button onClick={() => removeCreditPayment(p.id)} className="text-slate-300 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-purple-100">
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-purple-700">סה"כ תשלומי אשראי חודשיים:</span>
                  <span className="text-purple-700">₪{creditTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 flex-wrap">
        <Button onClick={() => setShowManualDialog(true)} variant="outline" className="border-green-500 text-green-700 hover:bg-green-50">
          <PenLine className="w-4 h-4 ml-2" />עדכון הוצאה ידנית
        </Button>
        <Button onClick={() => setShowImageImportDialog(true)} variant="outline" className="border-purple-400 text-purple-600 hover:bg-purple-50">
          <Image className="w-4 h-4 ml-2" />ייבוא מתמונה
        </Button>
        <Button onClick={() => setShowPDFImportDialog(true)} variant="outline" className="border-red-400 text-red-600 hover:bg-red-50">
          <FileText className="w-4 h-4 ml-2" />ייבוא מ-PDF
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-2 border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-slate-700">סה"כ הוצאות</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-orange-600">₪{totalActual.toLocaleString()}</span>
                {plannedTotal > 0 && <>
                  <span className="text-slate-400">/</span>
                  <span className="font-bold text-blue-600">₪{plannedTotal.toLocaleString()}</span>
                </>}
              </div>
            </div>
            {plannedTotal > 0 && (
              <>
                <Progress value={Math.min(100, Math.round((totalActual / plannedTotal) * 100))} className="h-2" />
                <div className="flex justify-between mt-1 text-sm">
                  <span className={totalActual > plannedTotal ? 'text-red-600' : 'text-slate-500'}>
                    {Math.round((totalActual / plannedTotal) * 100)}% נוצל
                  </span>
                  {totalActual > plannedTotal && <span className="text-red-600">חריגה!</span>}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-500">מהוצאות</p>
                <p className="font-bold text-orange-600">₪{totalExpensesFromTable.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">תשלומי אשראי</p>
                <p className="font-bold text-purple-600">₪{creditTotal.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">הכנסה</p>
                <p className="font-bold text-green-600">₪{trackingData.actual_income.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">נשאר</p>
                <p className={`font-bold ${trackingData.actual_income - totalActual >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  ₪{(trackingData.actual_income - totalActual).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardContent className="space-y-2 pt-4">
            {recommendations.map((rec, idx) => (
              <div key={idx} className={`p-3 rounded-xl flex items-start gap-3 ${rec.type === 'warning' ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
                {rec.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />}
                {rec.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />}
                <span className={`text-sm ${rec.type === 'warning' ? 'text-amber-700' : 'text-green-700'}`}>{rec.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Expense Table */}
      <ExpenseTrackingTable
        expenses={categoryExpenses}
        onChange={handleExpenseTableChange}
      />

      {/* Credit Payment Dialog */}
      <Dialog open={showCreditDialog} onOpenChange={setShowCreditDialog}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              הוסף תשלום באשראי
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>קטגוריה / שם ההוצאה</Label>
              <Select value={creditForm.category} onValueChange={v => setCreditForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue placeholder="בחר קטגוריה" /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <React.Fragment key={cat.key}>
                      <div className="px-2 py-1 text-xs font-bold text-slate-500 bg-slate-50">{cat.label}</div>
                      {cat.items.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>סכום כולל של הרכישה (₪)</Label>
              <Input type="number" value={creditForm.total_amount} onChange={e => setCreditForm(p => ({ ...p, total_amount: e.target.value }))} placeholder="0" dir="ltr" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>סה"כ תשלומים</Label>
                <Input type="number" value={creditForm.total_installments} onChange={e => setCreditForm(p => ({ ...p, total_installments: e.target.value }))} placeholder="12" dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>תשלומים שירדו עד כה</Label>
                <Input type="number" value={creditForm.paid_installments} onChange={e => setCreditForm(p => ({ ...p, paid_installments: e.target.value }))} placeholder="0" dir="ltr" />
              </div>
            </div>
            {creditForm.total_amount && creditForm.total_installments && (
              <div className="bg-purple-50 rounded-lg p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-purple-700">תשלום חודשי:</span>
                  <span className="font-bold text-purple-800">₪{Math.round(parseFloat(creditForm.total_amount) / parseInt(creditForm.total_installments)).toLocaleString()}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-purple-700">תשלומים נותרים:</span>
                  <span className="font-bold text-purple-800">{Math.max(0, parseInt(creditForm.total_installments) - parseInt(creditForm.paid_installments || 0))}</span>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreditDialog(false)}>ביטול</Button>
              <Button onClick={addCreditPayment} disabled={!creditForm.category || !creditForm.total_amount || !creditForm.total_installments} className="bg-purple-600 hover:bg-purple-700">
                הוסף תשלום
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Expense Dialog */}
      <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="w-5 h-5 text-green-600" />
              עדכון הוצאה ידנית
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>קטגוריה</Label>
              <Select value={manualForm.catKey} onValueChange={v => setManualForm(p => ({ ...p, catKey: v, item: '' }))}>
                <SelectTrigger><SelectValue placeholder="בחר קטגוריה" /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <SelectItem key={cat.key} value={cat.key}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {manualForm.catKey && (
              <div className="space-y-2">
                <Label>סעיף</Label>
                <Select value={manualForm.item} onValueChange={v => setManualForm(p => ({ ...p, item: v }))}>
                  <SelectTrigger><SelectValue placeholder="בחר סעיף" /></SelectTrigger>
                  <SelectContent>
                    {(EXPENSE_CATEGORIES.find(c => c.key === manualForm.catKey)?.items || []).map(item => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>סכום להוסיף (₪)</Label>
              <Input
                type="number"
                value={manualForm.amount}
                onChange={e => setManualForm(p => ({ ...p, amount: e.target.value }))}
                placeholder="0"
                dir="ltr"
              />
              {manualForm.item && categoryExpenses[manualForm.catKey]?.[manualForm.item] > 0 && (
                <p className="text-xs text-slate-500">
                  סכום נוכחי: ₪{(categoryExpenses[manualForm.catKey][manualForm.item] || 0).toLocaleString()} — יתווסף לסכום הקיים
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowManualDialog(false)}>ביטול</Button>
              <Button onClick={addManualExpense} disabled={!manualForm.catKey || !manualForm.item || !manualForm.amount} className="bg-green-600 hover:bg-green-700">
                הוסף הוצאה
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <ImageCreditImport
        open={showImageImportDialog}
        onOpenChange={setShowImageImportDialog}
        mode="tracking"
        onApply={(items) => {
          const newCatExpenses = { ...categoryExpenses };
          items.forEach(item => {
            let catKey = 'misc';
            for (const cat of EXPENSE_CATEGORIES) {
              if (cat.items.includes(item.category)) { catKey = cat.key; break; }
            }
            if (!newCatExpenses[catKey]) newCatExpenses[catKey] = {};
            newCatExpenses[catKey][item.category] = (newCatExpenses[catKey][item.category] || 0) + item.amount;
          });
          handleExpenseTableChange(newCatExpenses);
        }}
      />

      <PDFExpenseImport
        open={showPDFImportDialog}
        onOpenChange={setShowPDFImportDialog}
        onApply={(items) => {
          const newCatExpenses = { ...categoryExpenses };
          items.forEach(item => {
            let catKey = 'misc';
            for (const cat of EXPENSE_CATEGORIES) {
              if (cat.items.includes(item.category)) { catKey = cat.key; break; }
            }
            if (!newCatExpenses[catKey]) newCatExpenses[catKey] = {};
            newCatExpenses[catKey][item.category] = (newCatExpenses[catKey][item.category] || 0) + item.amount;
          });
          handleExpenseTableChange(newCatExpenses);
        }}
      />
    </div>
  );
}