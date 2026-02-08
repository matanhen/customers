import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subMonths } from 'date-fns';
import { he } from 'date-fns/locale';
import { 
        ChevronLeft, ChevronRight, Wallet, Receipt,
        Plus, Trash2, AlertTriangle, CheckCircle, TrendingDown,
        Target, Clock, FileText, Check
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

const FIXED_EXPENSE_CATEGORIES = [
  'ביטוחי רכב',
  'טסט',
  'משכנתא',
  'ביטוח משכנתא',
  'שכירות',
  'מנויים',
  'ביטוחים (ללא רכב)',
  'ועד בית',
  'ארנונה',
  'החזר הלוואות',
  'הוראות קבע'
];

const VARIABLE_EXPENSE_CATEGORIES = [
  'מים',
  'חשמל',
  'גז',
  'תספורת וקוסמטיקה',
  'חינוך',
  'חוגים וקייטנות',
  'בריאות',
  'תיקוני רכב',
  'עמלות וריביות בנקים',
  'טיפולי שיניים',
  'אופטיקה',
  'חגים ויהדות',
  'טלפון נייד',
  'סופר פארם',
  'דברים לבית',
  'ביטוח לאומי',
  'מזון',
  'דלק וחניה',
  'תחבורה ציבורית',
  'סיגריות',
  'עוזרת / בייביסיטר',
  'ביט',
  'מזומן',
  'בילויים',
  'בגדים ונעליים',
  'תרומות',
  'התפתחות אישית',
  'חופשה / טיול',
  'בעלי חיים',
  'מתנות ואירועים'
];

export default function ExpenseTracking({ userId }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [openFixed, setOpenFixed] = useState(false);
  const [openVariable, setOpenVariable] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importText, setImportText] = useState('');
  const [parsedItems, setParsedItems] = useState([]);
  const [newExpense, setNewExpense] = useState({ name: '', type: 'fixed', amount: 0 });
  const [updateExpense, setUpdateExpense] = useState({ type: 'fixed', category: '', amount: 0, isCustom: false, customName: '' });
  
  const [trackingData, setTrackingData] = useState({
    actual_income: 0,
    fixed_expenses: {},
    variable_expenses: {},
    custom_expenses: [],
    freedom_transfer_done: false
  });
  
  const queryClient = useQueryClient();
  const currentMonth = format(currentDate, 'yyyy-MM');

  const { data: allTracking = [] } = useQuery({
    queryKey: ['expenseTracking', userId],
    queryFn: async () => {
      const currentUser = await base44.auth.me();
      const isViewingOtherUser = currentUser.id !== userId;
      
      if (isViewingOtherUser && (currentUser.user_type === 'advisor' || currentUser.user_type === 'admin')) {
        const response = await base44.functions.invoke('getClientFinancialData', {
          clientUserId: userId,
          entityName: 'ExpenseTracking'
        });
        return response.data.data;
      } else {
        return base44.entities.ExpenseTracking.filter({ user_id: userId });
      }
    },
    enabled: !!userId,
  });

  const { data: monthlyPlans = [] } = useQuery({
    queryKey: ['monthlyPlans', userId],
    queryFn: async () => {
      const currentUser = await base44.auth.me();
      const isViewingOtherUser = currentUser.id !== userId;
      
      if (isViewingOtherUser && (currentUser.user_type === 'advisor' || currentUser.user_type === 'admin')) {
        const response = await base44.functions.invoke('getClientFinancialData', {
          clientUserId: userId,
          entityName: 'MonthlyPlan'
        });
        return response.data.data;
      } else {
        return base44.entities.MonthlyPlan.filter({ user_id: userId });
      }
    },
    enabled: !!userId,
  });

  const currentTracking = allTracking.find(t => t.month === currentMonth);
  const currentPlan = monthlyPlans.find(p => p.month === currentMonth);

  // Get previous month tracking for fixed expenses defaults
  const prevMonth = format(subMonths(currentDate, 1), 'yyyy-MM');
  const prevTracking = allTracking.find(t => t.month === prevMonth);

  useEffect(() => {
    if (currentTracking) {
      setTrackingData({
        actual_income: currentTracking.actual_income || 0,
        fixed_expenses: currentTracking.fixed_expenses || {},
        variable_expenses: currentTracking.variable_expenses || {},
        custom_expenses: currentTracking.custom_expenses || [],
        freedom_transfer_done: currentTracking.freedom_transfer_done || false
      });
    } else if (prevTracking) {
      // Use previous month's fixed expenses as defaults
      setTrackingData({
        actual_income: 0,
        fixed_expenses: prevTracking.fixed_expenses || {},
        variable_expenses: {},
        custom_expenses: prevTracking.custom_expenses?.filter(e => e.type === 'fixed') || [],
        freedom_transfer_done: false
      });
    } else {
      setTrackingData({
        actual_income: 0,
        fixed_expenses: {},
        variable_expenses: {},
        custom_expenses: [],
        freedom_transfer_done: false
      });
    }
  }, [currentTracking, prevTracking, currentMonth]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (currentTracking) {
        return base44.entities.ExpenseTracking.update(currentTracking.id, data);
      } else {
        return base44.entities.ExpenseTracking.create({
          ...data,
          user_id: userId,
          month: currentMonth,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseTracking', userId] });
    },
    });

    // Auto-save when trackingData changes
    useEffect(() => {
      if (!currentTracking) return; // Only auto-save if tracking already exists

      const timeoutId = setTimeout(() => {
        saveMutation.mutate(trackingData);
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(timeoutId);
    }, [trackingData, currentTracking]);

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

    if (updateExpense.isCustom) {
      // Add as custom expense
      if (!updateExpense.customName) return;
      const existing = trackingData.custom_expenses.find(
        e => e.name === updateExpense.customName && e.type === updateExpense.type
      );
      if (existing) {
        setTrackingData(prev => ({
          ...prev,
          custom_expenses: prev.custom_expenses.map(e => 
            e.name === updateExpense.customName && e.type === updateExpense.type 
              ? { ...e, amount: (e.amount || 0) + amount }
              : e
          )
        }));
      } else {
        setTrackingData(prev => ({
          ...prev,
          custom_expenses: [...prev.custom_expenses, { 
            name: updateExpense.customName, 
            type: updateExpense.type, 
            amount 
          }]
        }));
      }
    } else {
      // Update existing category
      if (updateExpense.type === 'fixed') {
        setTrackingData(prev => ({
          ...prev,
          fixed_expenses: {
            ...prev.fixed_expenses,
            [updateExpense.category]: (prev.fixed_expenses[updateExpense.category] || 0) + amount
          }
        }));
      } else {
        setTrackingData(prev => ({
          ...prev,
          variable_expenses: {
            ...prev.variable_expenses,
            [updateExpense.category]: (prev.variable_expenses[updateExpense.category] || 0) + amount
          }
        }));
      }
    }

    setUpdateExpense({ type: 'fixed', category: '', amount: 0, isCustom: false, customName: '' });
    setShowUpdateDialog(false);
  };

  const parseImportedText = (text) => {
    const lines = text.trim().split('\n');
    const items = [];
    
    lines.forEach(line => {
      if (!line.trim()) return;
      
      const match = line.match(/^(.+?)\s+([\d,]+\.?\d*)\s*$/);
      
      if (match) {
        const description = match[1].trim();
        const amountStr = match[2].replace(/,/g, '');
        const amount = parseFloat(amountStr);
        
        if (!isNaN(amount) && amount > 0) {
          items.push({
            description,
            amount: Math.round(amount * 100) / 100,
            assignedTo: null,
          });
        }
      }
    });
    
    return items;
  };

  const handleImport = () => {
    const items = parseImportedText(importText);
    setParsedItems(items);
  };

  const assignItem = (index, category, type, isCustom, customName) => {
    setParsedItems(prev => prev.map((item, i) => 
      i === index ? { ...item, assignedTo: { category, type, isCustom, customName } } : item
    ));
  };

  const applyImportedItems = () => {
    parsedItems.forEach(item => {
      if (item.assignedTo) {
        const { category, type, isCustom, customName } = item.assignedTo;
        
        if (isCustom) {
          const existing = trackingData.custom_expenses.find(
            e => e.name === customName && e.type === type
          );
          if (existing) {
            setTrackingData(prev => ({
              ...prev,
              custom_expenses: prev.custom_expenses.map(e => 
                e.name === customName && e.type === type 
                  ? { ...e, amount: (e.amount || 0) + item.amount }
                  : e
              )
            }));
          } else {
            setTrackingData(prev => ({
              ...prev,
              custom_expenses: [...prev.custom_expenses, { 
                name: customName, 
                type, 
                amount: item.amount 
              }]
            }));
          }
        } else {
          if (type === 'fixed') {
            setTrackingData(prev => ({
              ...prev,
              fixed_expenses: {
                ...prev.fixed_expenses,
                [category]: (prev.fixed_expenses[category] || 0) + item.amount
              }
            }));
          } else {
            setTrackingData(prev => ({
              ...prev,
              variable_expenses: {
                ...prev.variable_expenses,
                [category]: (prev.variable_expenses[category] || 0) + item.amount
              }
            }));
          }
        }
      }
    });
    
    setShowImportDialog(false);
    setImportText('');
    setParsedItems([]);
  };

  // Calculations
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
  // Week 1 starts on the 10th of each month
  const currentWeek = currentDay < 10 ? 0 : Math.ceil((currentDay - 9) / 7);
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
      <div className="flex justify-end gap-3">
        <Button
          onClick={() => setShowImportDialog(true)}
          variant="outline"
          className="border-[#105330] text-[#105330] hover:bg-[#105330]/10"
        >
          <FileText className="w-4 h-4 ml-2" />
          ייבוא הוצאות מטקסט
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
                    {(updateExpense.type === 'fixed' ? FIXED_EXPENSE_CATEGORIES : VARIABLE_EXPENSE_CATEGORIES).map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
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
            <CardContent className="pt-0">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {FIXED_EXPENSE_CATEGORIES.map(category => (
                  <div key={category} className="space-y-1">
                    <Label className="text-sm text-slate-600">{category}</Label>
                    <Input
                      type="number"
                      value={trackingData.fixed_expenses[category] || ''}
                      onChange={(e) => updateFixedExpense(category, e.target.value)}
                      placeholder="0"
                      className="h-9"
                    />
                  </div>
                ))}
                {/* Custom Fixed Expenses */}
                {trackingData.custom_expenses.filter(e => e.type === 'fixed').map((exp, idx) => {
                  const originalIdx = trackingData.custom_expenses.findIndex(e => e === exp);
                  return (
                    <div key={`custom-${idx}`} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm text-slate-600">{exp.name}</Label>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeCustomExpense(originalIdx)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <Input
                        type="number"
                        value={exp.amount || ''}
                        onChange={(e) => updateCustomExpenseAmount(originalIdx, e.target.value)}
                        placeholder="0"
                        className="h-9"
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Variable Expenses */}
      <Collapsible open={openVariable} onOpenChange={setOpenVariable}>
        <Card className="border-2 border-purple-300">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-purple-50">
              <CardTitle className="flex items-center justify-between text-purple-700">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5" />
                  יתרת הוצאות - פירוט
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-orange-100 text-orange-700 border-0">
                    ₪{totalVariableActual.toLocaleString()}
                  </Badge>
                  <ChevronLeft className={`w-5 h-5 transition-transform ${openVariable ? 'rotate-90' : ''}`} />
                </div>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {VARIABLE_EXPENSE_CATEGORIES.map(category => (
                  <div key={category} className="space-y-1">
                    <Label className="text-sm text-purple-600">{category}</Label>
                    <Input
                      type="number"
                      value={trackingData.variable_expenses[category] || ''}
                      onChange={(e) => updateVariableExpense(category, e.target.value)}
                      placeholder="0"
                      className="h-9"
                    />
                  </div>
                ))}
                {/* Custom Variable Expenses */}
                {trackingData.custom_expenses.filter(e => e.type === 'variable').map((exp, idx) => {
                  const originalIdx = trackingData.custom_expenses.findIndex(e => e === exp);
                  return (
                    <div key={`custom-var-${idx}`} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm text-purple-600">{exp.name}</Label>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeCustomExpense(originalIdx)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <Input
                        type="number"
                        value={exp.amount || ''}
                        onChange={(e) => updateCustomExpenseAmount(originalIdx, e.target.value)}
                        placeholder="0"
                        className="h-9"
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

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

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent dir="rtl" className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ייבוא הוצאות מטקסט</DialogTitle>
          </DialogHeader>
          
          {parsedItems.length === 0 ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>הדבק טקסט עם הוצאות (שורה אחת = תיאור + סכום)</Label>
                <Textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="לדוגמה:&#10;ALIEXPRESS	46.39&#10;ביטוח רכב	2,210.00&#10;מסעדה	190.00"
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                <p className="font-semibold mb-1">הוראות שימוש:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>כל שורה צריכה להכיל תיאור ואחריו סכום</li>
                  <li>ניתן להשתמש בעברית או אנגלית</li>
                  <li>ניתן להשתמש בפסיק או נקודה כמפריד עשרוני</li>
                </ul>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                  ביטול
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={!importText.trim()}
                  className="bg-[#105330] hover:bg-[#0d4027]"
                >
                  המשך
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-emerald-50 rounded-lg text-sm text-emerald-800">
                <p className="font-semibold">נמצאו {parsedItems.length} פריטים. שייך כל פריט לקטגוריה:</p>
              </div>
              
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {parsedItems.map((item, index) => (
                  <div key={index} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-slate-800">{item.description}</p>
                        <p className="text-lg font-bold text-[#105330]">₪{item.amount.toLocaleString()}</p>
                      </div>
                      {item.assignedTo && (
                        <Check className="w-5 h-5 text-emerald-600" />
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs mb-1">סוג הוצאה</Label>
                        <Select
                          value={item.assignedTo?.type || ''}
                          onValueChange={(value) => {
                            assignItem(index, null, value, false, '');
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="בחר סוג" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">הוצאה קבועה</SelectItem>
                            <SelectItem value="variable">יתרת הוצאה</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-xs mb-1">בחר הוצאה</Label>
                        <Select
                          value={item.assignedTo?.isCustom ? 'custom' : (item.assignedTo?.category || '')}
                          onValueChange={(value) => {
                            if (value === 'custom') {
                              assignItem(index, null, item.assignedTo?.type, true, '');
                            } else {
                              assignItem(index, value, item.assignedTo?.type, false, '');
                            }
                          }}
                          disabled={!item.assignedTo?.type}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="בחר קטגוריה" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px]">
                            {(item.assignedTo?.type === 'fixed' ? FIXED_EXPENSE_CATEGORIES : VARIABLE_EXPENSE_CATEGORIES).map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                            <SelectItem value="custom">➕ הוסף הוצאה שלא ברשימה</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {item.assignedTo?.isCustom && (
                      <div className="mt-3">
                        <Label className="text-xs mb-1">שם ההוצאה</Label>
                        <Input
                          value={item.assignedTo?.customName || ''}
                          onChange={(e) => {
                            assignItem(index, null, item.assignedTo?.type, true, e.target.value);
                          }}
                          placeholder="לדוגמה: ביטוח חיים"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <DialogFooter className="gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setParsedItems([]);
                    setImportText('');
                  }}
                >
                  התחל מחדש
                </Button>
                <Button 
                  onClick={applyImportedItems}
                  disabled={!parsedItems.some(item => 
                    item.assignedTo?.category || (item.assignedTo?.isCustom && item.assignedTo?.customName)
                  )}
                  className="bg-[#105330] hover:bg-[#0d4027]"
                >
                  יישם שינויים ({parsedItems.filter(item => 
                    item.assignedTo?.category || (item.assignedTo?.isCustom && item.assignedTo?.customName)
                  ).length}/{parsedItems.length})
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
        </div>
        );
        }