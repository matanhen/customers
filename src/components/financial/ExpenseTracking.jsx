import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subMonths } from 'date-fns';
import { he } from 'date-fns/locale';
import { 
        ChevronLeft, ChevronRight, Wallet, Receipt,
        Plus, Trash2, AlertTriangle, CheckCircle,
        Target, Clock, FileText, Check, Image
      } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import PDFExpenseImport from './PDFExpenseImport';
import ImageCreditImport from './ImageCreditImport';
import { EXPENSE_CATEGORIES, ALL_EXPENSE_ITEMS } from './expenseCategories';

// Flat list for legacy compatibility
const FIXED_EXPENSE_CATEGORIES = ALL_EXPENSE_ITEMS;
const VARIABLE_EXPENSE_CATEGORIES = ALL_EXPENSE_ITEMS;

export default function ExpenseTracking({ userId }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [openFixed, setOpenFixed] = useState(false);
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [newCategoryData, setNewCategoryData] = useState({ name: '', expense_type: 'fixed' });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [showPDFImportDialog, setShowPDFImportDialog] = useState(false);
  const [showImageImportDialog, setShowImageImportDialog] = useState(false);
  const [newExpense, setNewExpense] = useState({ name: '', type: 'fixed', amount: 0 });
  const [updateExpense, setUpdateExpense] = useState({ type: 'fixed', category: '', amount: 0, isCustom: false, customName: '' });
  const [currentUser, setCurrentUser] = useState(null);
  
  const [trackingData, setTrackingData] = useState({
    actual_income: 0,
    fixed_expenses: {},
    variable_expenses: {},
    custom_expenses: [],
    freedom_transfer_done: false
  });
  
  const queryClient = useQueryClient();
  const currentMonth = format(currentDate, 'yyyy-MM');

  const isAdvisorOrAdmin = 
    currentUser?.user_type === 'advisor' || currentUser?.user_type === 'admin';
  const isViewingOther = !!currentUser && currentUser.id !== userId;

  // Get client email from sessionStorage for fallback lookup
  const viewingClientEmail = (() => {
    try { return JSON.parse(sessionStorage.getItem('viewingClient') || '{}').email || null; } catch { return null; }
  })();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (e) {
        console.log('Failed to load user');
      }
    };
    loadUser();
  }, [userId]);

  const { data: customCategories = [], refetch: refetchCategories } = useQuery({
    queryKey: ['customExpenseCategories', userId],
    queryFn: () => base44.entities.CustomExpenseCategory.filter({ user_id: userId }),
    enabled: !!userId,
  });

  const addCategoryMutation = useMutation({
    mutationFn: (data) => base44.entities.CustomExpenseCategory.create({ ...data, user_id: userId }),
    onSuccess: () => {
      refetchCategories();
      setNewCategoryData({ name: '', expense_type: 'fixed' });
      setShowAddCategoryDialog(false);
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => base44.entities.CustomExpenseCategory.delete(id),
    onSuccess: () => refetchCategories(),
  });

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

  const { data: monthlyPlans = [], isLoading: plansLoading } = useQuery({
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

  // Get previous month tracking for fixed expenses defaults
  const prevMonth = format(subMonths(currentDate, 1), 'yyyy-MM');
  const prevTracking = allTracking.find(t => t.month === prevMonth);

  const dataLoadedRef = React.useRef(false);
  const lastLoadedTrackingIdRef = React.useRef(null);

  useEffect(() => {
    if (currentTracking) {
      // Only reload if we got a different record (different month or new data from server)
      if (lastLoadedTrackingIdRef.current === currentTracking.id && dataLoadedRef.current) return;
      lastLoadedTrackingIdRef.current = currentTracking.id;
      dataLoadedRef.current = false;
      setTrackingData({
        actual_income: currentTracking.actual_income || 0,
        fixed_expenses: currentTracking.fixed_expenses || {},
        variable_expenses: currentTracking.variable_expenses || {},
        custom_expenses: currentTracking.custom_expenses || [],
        freedom_transfer_done: currentTracking.freedom_transfer_done || false
      });
      setTimeout(() => { dataLoadedRef.current = true; }, 100);
    } else if (!trackingLoading && allTracking !== undefined) {
      if (lastLoadedTrackingIdRef.current === `empty-${currentMonth}` && dataLoadedRef.current) return;
      lastLoadedTrackingIdRef.current = `empty-${currentMonth}`;
      dataLoadedRef.current = false;
      setTrackingData({
        actual_income: 0,
        fixed_expenses: {},
        variable_expenses: {},
        custom_expenses: [],
        freedom_transfer_done: false
      });
      setTimeout(() => { dataLoadedRef.current = true; }, 100);
    }
  }, [currentTracking, currentMonth, trackingLoading]);

  // Keep a ref to current tracking id to avoid stale closures
  const currentTrackingIdRef = React.useRef(null);
  useEffect(() => {
    currentTrackingIdRef.current = currentTracking?.id || null;
  }, [currentTracking]);



  // trackingDataRef always holds the latest data for use in callbacks
  const trackingDataRef = React.useRef(trackingData);
  trackingDataRef.current = trackingData;

  // Save the current data immediately to the DB
  const saveNow = React.useCallback(async (data) => {
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
      const created = await base44.entities.ExpenseTracking.create({
        ...data,
        user_id: userId,
        month,
      });
      currentTrackingIdRef.current = created.id;
    }
    queryClient.invalidateQueries({ queryKey: ['expenseTracking', userId] });
  }, [userId, currentDate, queryClient, isViewingOther, isAdvisorOrAdmin]);

  const saveNowRef = React.useRef(saveNow);
  saveNowRef.current = saveNow;

  const updateFixedExpense = (category, value) => {
    setTrackingData(prev => ({
      ...prev,
      fixed_expenses: {
        ...prev.fixed_expenses,
        [category]: parseFloat(value) || 0
      }
    }));
  };

  const updateVariableExpense = (category, value) => {
    setTrackingData(prev => ({
      ...prev,
      variable_expenses: {
        ...prev.variable_expenses,
        [category]: parseFloat(value) || 0
      }
    }));
  };

  // Save immediately when user leaves any field
  const handleBlurSave = () => {
    saveNowRef.current(trackingDataRef.current);
  };

  const addCustomExpense = () => {
    if (!newExpense.name) return;
    setTrackingData(prev => ({
      ...prev,
      custom_expenses: [...prev.custom_expenses, { ...newExpense }]
    }));
    setNewExpense({ name: '', type: 'fixed', amount: 0 });
    setShowAddDialog(false);
  };

  const removeCustomExpense = (index) => {
    setTrackingData(prev => ({
      ...prev,
      custom_expenses: prev.custom_expenses.filter((_, i) => i !== index)
    }));
  };

  const updateCustomExpenseAmount = (index, amount) => {
    setTrackingData(prev => ({
      ...prev,
      custom_expenses: prev.custom_expenses.map((exp, i) => 
        i === index ? { ...exp, amount: parseFloat(amount) || 0 } : exp
      )
    }));
  };

  const handleUpdateExpense = () => {
    const amount = parseFloat(updateExpense.amount) || 0;
    if (amount === 0) return;

    let newTrackingData;

    if (updateExpense.isCustom) {
      if (!updateExpense.customName) return;
      const existing = trackingData.custom_expenses.find(
        e => e.name === updateExpense.customName && e.type === updateExpense.type
      );
      if (existing) {
        newTrackingData = {
          ...trackingData,
          custom_expenses: trackingData.custom_expenses.map(e =>
            e.name === updateExpense.customName && e.type === updateExpense.type
              ? { ...e, amount: (e.amount || 0) + amount }
              : e
          )
        };
      } else {
        newTrackingData = {
          ...trackingData,
          custom_expenses: [...trackingData.custom_expenses, {
            name: updateExpense.customName,
            type: updateExpense.type,
            amount
          }]
        };
      }
    } else {
      if (updateExpense.type === 'fixed') {
        newTrackingData = {
          ...trackingData,
          fixed_expenses: {
            ...trackingData.fixed_expenses,
            [updateExpense.category]: (trackingData.fixed_expenses[updateExpense.category] || 0) + amount
          }
        };
      } else {
        newTrackingData = {
          ...trackingData,
          variable_expenses: {
            ...trackingData.variable_expenses,
            [updateExpense.category]: (trackingData.variable_expenses[updateExpense.category] || 0) + amount
          }
        };
      }
    }

    setTrackingData(newTrackingData);
    saveNow(newTrackingData);

    setUpdateExpense({ type: 'fixed', category: '', amount: 0, isCustom: false, customName: '' });
    setShowUpdateDialog(false);
  };



  // Calculations — includes both standard and custom categories
  // All standard expenses are now in fixed_expenses (unified categories)
  const totalFixedActual = Object.values(trackingData.fixed_expenses).reduce((sum, v) => sum + (v || 0), 0) +
    trackingData.custom_expenses.filter(e => e.type === 'fixed').reduce((sum, e) => sum + (e.amount || 0), 0);
  
  const totalVariableActual = Object.values(trackingData.variable_expenses).reduce((sum, v) => sum + (v || 0), 0) +
    trackingData.custom_expenses.filter(e => e.type === 'variable').reduce((sum, e) => sum + (e.amount || 0), 0);

  const plannedFixed = currentPlan?.fixed_expenses || 0;
  const plannedVariable = currentPlan?.variable_expenses || 0;
  const plannedSavings = currentPlan?.savings || 0;

  const fixedUsedPercent = plannedFixed > 0 ? Math.round((totalFixedActual / plannedFixed) * 100) : 0;
  const variableUsedPercent = plannedVariable > 0 ? Math.round((totalVariableActual / plannedVariable) * 100) : 0;

  const weeklyVariableBudget = plannedVariable / 4;
  const currentDay = new Date().getDate();
  // Week 1 starts on the 10th, days 1-9 are considered week 4 (end of previous cycle)
  const currentWeek = currentDay < 10 ? 4 : Math.min(4, Math.ceil((currentDay - 9) / 7));
  const expectedVariableSpent = weeklyVariableBudget * currentWeek;
  const isOnTrack = totalVariableActual <= expectedVariableSpent;
  const weeklyUsedPercent = weeklyVariableBudget > 0 && expectedVariableSpent > 0 ? Math.round((totalVariableActual / expectedVariableSpent) * 100) : 0;

  // Recommendations
  const getRecommendations = () => {
    const recommendations = [];
    
    if (!isOnTrack && plannedVariable > 0) {
      const overspend = totalVariableActual - expectedVariableSpent;
      recommendations.push({
        type: 'warning',
        message: `חריגה מהקצב השבועי המומלץ ב-₪${overspend.toLocaleString()}. יש להאט את קצב ההוצאות כדי לעמוד בתכנון.`
      });
    } else if (plannedVariable > 0) {
      recommendations.push({
        type: 'success',
        message: 'אתה בקצב טוב! ממשיך בדרך הנכונה לעמוד בתכנון החודשי.'
      });
    }

    return recommendations;
  };

  const recommendations = getRecommendations();

  return (
    <div className="space-y-6">
      {/* Month Navigation */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-bold text-[#105330]">
              מעקב חודשי - {format(currentDate, 'MMMM yyyy', { locale: he })}
            </h2>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            >
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
              onChange={(e) => setTrackingData({ ...trackingData, actual_income: parseFloat(e.target.value) || 0 })}
              onBlur={handleBlurSave}
              placeholder="הזן הכנסה בפועל"
              className="text-lg font-medium flex-1"
            />
            {currentPlan?.expected_income && (
              <div className="text-sm text-gray-500">
                תכנון: ₪{currentPlan.expected_income.toLocaleString()}
              </div>
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

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 flex-wrap">
        <Button
          onClick={() => setShowAddCategoryDialog(true)}
          variant="outline"
          className="border-[#105330] text-[#105330] hover:bg-[#105330]/10"
        >
          <Plus className="w-4 h-4 ml-2" />
          הוסף סעיף הוצאה חדש
        </Button>
        <Button
          onClick={() => setShowImageImportDialog(true)}
          variant="outline"
          className="border-purple-400 text-purple-600 hover:bg-purple-50"
        >
          <Image className="w-4 h-4 ml-2" />
          ייבוא מתמונה
        </Button>
        <Button
          onClick={() => setShowPDFImportDialog(true)}
          variant="outline"
          className="border-red-400 text-red-600 hover:bg-red-50"
        >
          <FileText className="w-4 h-4 ml-2" />
          ייבוא מ-PDF
        </Button>
        
        <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-[#105330] hover:bg-[#0d4027]">
              <Receipt className="w-4 h-4 ml-2" />
              עדכן הוצאה
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>עדכן הוצאה</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>סוג הוצאה</Label>
                <Select 
                  value={updateExpense.type} 
                  onValueChange={(v) => setUpdateExpense({ ...updateExpense, type: v, category: '', isCustom: false })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">הוצאה קבועה</SelectItem>
                    <SelectItem value="variable">יתרת הוצאות</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>בחר הוצאה</Label>
                <Select 
                  value={updateExpense.isCustom ? 'custom' : updateExpense.category} 
                  onValueChange={(v) => {
                    if (v === 'custom') {
                      setUpdateExpense({ ...updateExpense, category: '', isCustom: true });
                    } else {
                      setUpdateExpense({ ...updateExpense, category: v, isCustom: false });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר מהרשימה" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(cat => (
                      <React.Fragment key={cat.key}>
                        <div className="px-2 py-1 text-xs font-bold text-slate-500 bg-slate-50">{cat.label}</div>
                        {cat.items.map(item => (
                          <SelectItem key={item} value={item}>{item}</SelectItem>
                        ))}
                      </React.Fragment>
                    ))}
                    <SelectItem value="custom">➕ הוסף הוצאה שלא ברשימה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {updateExpense.isCustom && (
                <div className="space-y-2">
                  <Label>שם ההוצאה</Label>
                  <Input
                    value={updateExpense.customName}
                    onChange={(e) => setUpdateExpense({ ...updateExpense, customName: e.target.value })}
                    placeholder="לדוגמה: ביטוח חיים"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>סכום להוספה</Label>
                <Input
                  type="number"
                  value={updateExpense.amount || ''}
                  onChange={(e) => setUpdateExpense({ ...updateExpense, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <Button onClick={handleUpdateExpense} className="w-full bg-[#105330] hover:bg-[#0d4027]">
                עדכן הוצאה
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Fixed Expenses Summary */}
        <Card className="border-2 border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-slate-700">הוצאות קבועות</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-orange-600">₪{totalFixedActual.toLocaleString()}</span>
                <span className="text-slate-400">/</span>
                <span className="font-bold text-blue-600">₪{plannedFixed.toLocaleString()}</span>
              </div>
            </div>
            <Progress value={Math.min(100, fixedUsedPercent)} className="h-2" />
            <div className="flex justify-between mt-1 text-sm">
              <span className={fixedUsedPercent > 100 ? 'text-red-600' : 'text-slate-500'}>{fixedUsedPercent}% נוצל</span>
              {fixedUsedPercent > 100 && <span className="text-red-600">חריגה!</span>}
            </div>
          </CardContent>
        </Card>

        {/* Variable Expenses Summary */}
        <Card className="border-2 border-purple-300">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-purple-700">יתרת הוצאות - חודשי</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-orange-600">₪{totalVariableActual.toLocaleString()}</span>
                  <span className="text-slate-400">/</span>
                  <span className="font-bold text-blue-600">₪{plannedVariable.toLocaleString()}</span>
                </div>
              </div>
              <Progress value={Math.min(100, variableUsedPercent)} className="h-2" />
              <div className="flex justify-between text-sm">
                <span className={variableUsedPercent > 100 ? 'text-red-600' : 'text-purple-500'}>{variableUsedPercent}% נוצל החודש</span>
              </div>
              
              <div className="pt-2 border-t border-purple-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-purple-600">ניצול שבועי (שבוע {currentWeek})</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-orange-600">₪{totalVariableActual.toLocaleString()}</span>
                    <span className="text-slate-400">/</span>
                    <span className="text-sm font-bold text-blue-600">₪{Math.round(expectedVariableSpent).toLocaleString()}</span>
                  </div>
                </div>
                <Progress value={Math.min(100, weeklyUsedPercent)} className="h-2 mt-2" />
                <div className="flex justify-between mt-1 text-xs">
                  <span className={weeklyUsedPercent > 100 ? 'text-red-600' : 'text-purple-500'}>{weeklyUsedPercent}% נוצל</span>
                  <span className="text-purple-600">תקציב שבועי: ₪{Math.round(weeklyVariableBudget).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-[#105330]">המלצות</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recommendations.map((rec, idx) => (
              <div 
                key={idx} 
                className={`p-3 rounded-xl flex items-start gap-3 ${
                  rec.type === 'warning' ? 'bg-amber-50 border border-amber-200' :
                  rec.type === 'success' ? 'bg-green-50 border border-green-200' :
                  'bg-blue-50 border border-blue-200'
                }`}
              >
                {rec.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />}
                {rec.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />}
                {rec.type === 'reminder' && <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />}
                <span className={`text-sm ${
                  rec.type === 'warning' ? 'text-amber-700' :
                  rec.type === 'success' ? 'text-green-700' :
                  'text-blue-700'
                }`}>{rec.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Fixed Expenses */}
      <Collapsible open={openFixed} onOpenChange={setOpenFixed}>
        <Card className="border-2 border-slate-300">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-slate-50">
              <CardTitle className="flex items-center justify-between text-slate-700">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  הוצאות קבועות - פירוט
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-orange-100 text-orange-700 border-0">₪{totalFixedActual.toLocaleString()}</Badge>
                  <ChevronLeft className={`w-5 h-5 transition-transform ${openFixed ? 'rotate-90' : ''}`} />
                </div>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              {EXPENSE_CATEGORIES.map(cat => (
                <div key={cat.key}>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">{cat.label}</h4>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[...cat.items, ...customCategories.filter(c => c.expense_type === 'fixed' && (c.categoryKey || 'misc') === cat.key).map(c => c.name)].map(category => {
                      const customCat = customCategories.find(c => c.name === category && c.expense_type === 'fixed');
                      return (
                        <div key={category} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm text-slate-600">{category}</Label>
                            {customCat && (
                              <button onClick={() => deleteCategoryMutation.mutate(customCat.id)} className="text-red-400 hover:text-red-600">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <Input
                            type="number"
                            value={trackingData.fixed_expenses[category] || ''}
                            onChange={(e) => updateFixedExpense(category, e.target.value)}
                            onBlur={handleBlurSave}
                            placeholder="0"
                            className="h-9"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {/* Custom expenses not in categories */}
              {trackingData.custom_expenses.filter(e => e.type === 'fixed').map((exp, idx) => {
                const originalIdx = trackingData.custom_expenses.findIndex(e => e === exp);
                return (
                  <div key={`custom-${idx}`} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-slate-600">{exp.name}</Label>
                      <Button variant="ghost" size="sm" onClick={() => removeCustomExpense(originalIdx)} className="h-6 w-6 p-0 text-red-500 hover:text-red-700">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <Input type="number" value={exp.amount || ''} onChange={(e) => updateCustomExpenseAmount(originalIdx, e.target.value)} onBlur={handleBlurSave} placeholder="0" className="h-9" />
                  </div>
                );
              })}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Variable Expenses - removed, all in fixed now under categories */}

      {/* Comparison Summary */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-[#105330]/5 to-[#c8a863]/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#105330]">
            <Target className="w-5 h-5" />
            השוואה: תכנון מול ביצוע
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-xl border">
              <p className="text-sm text-gray-500 mb-1">הכנסה</p>
              <div className="flex items-center gap-2">
                <span className="font-bold text-orange-600">₪{trackingData.actual_income.toLocaleString()}</span>
                <span className="text-slate-400">/</span>
                <span className="font-bold text-blue-600">₪{(currentPlan?.expected_income || 0).toLocaleString()}</span>
              </div>
              <div className="flex gap-2 mt-1 text-xs">
                <Badge className="bg-orange-100 text-orange-700 border-0">ביצוע</Badge>
                <Badge className="bg-blue-100 text-blue-700 border-0">תכנון</Badge>
              </div>
            </div>
            <div className="p-4 bg-white rounded-xl border">
              <p className="text-sm text-gray-500 mb-1">הוצאות קבועות</p>
              <div className="flex items-center gap-2">
                <span className={`font-bold ${totalFixedActual > plannedFixed ? 'text-red-600' : 'text-orange-600'}`}>
                  ₪{totalFixedActual.toLocaleString()}
                </span>
                <span className="text-slate-400">/</span>
                <span className="font-bold text-blue-600">₪{plannedFixed.toLocaleString()}</span>
              </div>
              <div className="flex gap-2 mt-1 text-xs">
                <Badge className="bg-orange-100 text-orange-700 border-0">ביצוע</Badge>
                <Badge className="bg-blue-100 text-blue-700 border-0">תכנון</Badge>
              </div>
            </div>
            <div className="p-4 bg-white rounded-xl border">
              <p className="text-sm text-gray-500 mb-1">יתרת הוצאות</p>
              <div className="flex items-center gap-2">
                <span className={`font-bold ${totalVariableActual > plannedVariable ? 'text-red-600' : 'text-orange-600'}`}>
                  ₪{totalVariableActual.toLocaleString()}
                </span>
                <span className="text-slate-400">/</span>
                <span className="font-bold text-blue-600">₪{plannedVariable.toLocaleString()}</span>
              </div>
              <div className="flex gap-2 mt-1 text-xs">
                <Badge className="bg-orange-100 text-orange-700 border-0">ביצוע</Badge>
                <Badge className="bg-blue-100 text-blue-700 border-0">תכנון</Badge>
              </div>
            </div>
            <div className="p-4 bg-white rounded-xl border">
              <p className="text-sm text-gray-500 mb-1">סה״כ הוצאות</p>
              <div className="flex items-center gap-2">
                <span className={`font-bold ${(totalFixedActual + totalVariableActual) > (plannedFixed + plannedVariable) ? 'text-red-600' : 'text-orange-600'}`}>
                  ₪{(totalFixedActual + totalVariableActual).toLocaleString()}
                </span>
                <span className="text-slate-400">/</span>
                <span className="font-bold text-blue-600">₪{(plannedFixed + plannedVariable).toLocaleString()}</span>
              </div>
              <div className="flex gap-2 mt-1 text-xs">
                <Badge className="bg-orange-100 text-orange-700 border-0">ביצוע</Badge>
                <Badge className="bg-blue-100 text-blue-700 border-0">תכנון</Badge>
              </div>
            </div>
          </div>
        </CardContent>
        </Card>

      {/* Add Category Dialog */}
      <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>הוסף סעיף הוצאה חדש</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>שם הסעיף</Label>
              <Input
                value={newCategoryData.name}
                onChange={(e) => setNewCategoryData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="לדוגמה: מנוי ספורט"
              />
            </div>
            <div className="space-y-2">
              <Label>סוג הוצאה</Label>
              <Select value={newCategoryData.expense_type} onValueChange={(v) => setNewCategoryData(prev => ({ ...prev, expense_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">הוצאה קבועה</SelectItem>
                  <SelectItem value="variable">יתרת הוצאות (משתנה)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => {
                if (!newCategoryData.name.trim()) return;
                addCategoryMutation.mutate(newCategoryData);
              }}
              disabled={addCategoryMutation.isPending || !newCategoryData.name.trim()}
              className="w-full bg-[#105330] hover:bg-[#0d4027]"
            >
              {addCategoryMutation.isPending ? 'מוסיף...' : 'הוסף סעיף'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ImageCreditImport
        open={showImageImportDialog}
        onOpenChange={setShowImageImportDialog}
        mode="tracking"
        onApply={(items) => {
          let newData = { ...trackingData };
          items.forEach(item => {
            if (item.type === 'fixed') {
              newData = { ...newData, fixed_expenses: { ...newData.fixed_expenses, [item.category]: (newData.fixed_expenses[item.category] || 0) + item.amount } };
            } else {
              newData = { ...newData, variable_expenses: { ...newData.variable_expenses, [item.category]: (newData.variable_expenses[item.category] || 0) + item.amount } };
            }
          });
          setTrackingData(newData);
          saveNow(newData);
        }}
      />

      <PDFExpenseImport
        open={showPDFImportDialog}
        onOpenChange={setShowPDFImportDialog}
        onApply={(items) => {
          let newData = { ...trackingData };
          items.forEach(item => {
            if (item.isCustom) {
              const existing = newData.custom_expenses.find(e => e.name === item.customName && e.type === item.type);
              if (existing) {
                newData = {
                  ...newData,
                  custom_expenses: newData.custom_expenses.map(e =>
                    e.name === item.customName && e.type === item.type
                      ? { ...e, amount: (e.amount || 0) + item.amount }
                      : e
                  )
                };
              } else {
                newData = {
                  ...newData,
                  custom_expenses: [...newData.custom_expenses, { name: item.customName, type: item.type, amount: item.amount }]
                };
              }
            } else if (item.type === 'fixed') {
              newData = {
                ...newData,
                fixed_expenses: { ...newData.fixed_expenses, [item.category]: (newData.fixed_expenses[item.category] || 0) + item.amount }
              };
            } else {
              newData = {
                ...newData,
                variable_expenses: { ...newData.variable_expenses, [item.category]: (newData.variable_expenses[item.category] || 0) + item.amount }
              };
            }
          });
          setTrackingData(newData);
          saveNow(newData);
        }}
      />


        </div>
        );
        }