import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  TrendingUp, TrendingDown, ChevronDown, ChevronUp,
  DollarSign, Receipt, FileText
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import PDFReflectionImport from './PDFReflectionImport';

const FIXED_EXPENSES = [
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
  'הוראות קבע',
];

const VARIABLE_EXPENSES = [
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
  'מתנות ואירועים',
];

export default function FinancialReflection({ userId }) {
  const [incomes, setIncomes] = useState({ month1: 0, month2: 0, month3: 0, month4: 0, month5: 0, month6: 0 });
  const [fixedExpenses, setFixedExpenses] = useState({});
  const [variableExpenses, setVariableExpenses] = useState({});
  const [openSections, setOpenSections] = useState({ income: true, fixed: false, variable: false });
  const [showPDFImportDialog, setShowPDFImportDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const queryClient = useQueryClient();
  const autoSaveTimer = React.useRef(null);

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

  const isAdvisorOrAdmin = 
    currentUser?.user_type === 'advisor' || currentUser?.user_type === 'admin';
  const isViewingOther = !!currentUser && currentUser.id !== userId;

  // Get client email from sessionStorage for fallback lookup
  const viewingClientEmail = (() => {
    try { return JSON.parse(sessionStorage.getItem('viewingClient') || '{}').email || null; } catch { return null; }
  })();

  const { data: reflection, isLoading: reflectionLoading } = useQuery({
    queryKey: ['financialReflection', userId, currentUser?.id, isViewingOther, isAdvisorOrAdmin],
    queryFn: async () => {
      // If advisor/admin viewing another user's data - use backend function
      if (isViewingOther && isAdvisorOrAdmin) {
        const response = await base44.functions.invoke('getClientData', {
          clientUserId: userId,
          clientEmail: viewingClientEmail,
          entityName: 'FinancialReflection'
        });
        return response.data.data[0];
      }
      // Own data
      const results = await base44.entities.FinancialReflection.filter({ user_id: userId });
      return results[0];
    },
    enabled: !!userId && !!currentUser,
  });

  useEffect(() => {
    if (reflection) {
      setIncomes(reflection.incomes || { month1: 0, month2: 0, month3: 0, month4: 0, month5: 0, month6: 0 });
      setFixedExpenses(reflection.fixed_expenses || {});
      setVariableExpenses(reflection.variable_expenses || {});
    }
    setDataLoaded(true);
  }, [reflection]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        user_id: userId,
        incomes,
        fixed_expenses: fixedExpenses,
        variable_expenses: variableExpenses,
      };

      // Advisor or admin viewing another user - use backend function
      if (isViewingOther && isAdvisorOrAdmin) {
        const response = await base44.functions.invoke('saveClientData', {
          entityName: 'FinancialReflection',
          clientUserId: userId,
          data,
          recordId: reflection?.id || null,
        });
        return response.data;
      }

      if (reflection) {
        return base44.entities.FinancialReflection.update(reflection.id, data);
      }
      return base44.entities.FinancialReflection.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financialReflection', userId, currentUser?.id] });
    },
  });

  const triggerAutoSave = () => {
    if (!dataLoaded) return;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveMutation.mutate();
    }, 1500);
  };

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Calculate average from all 6 months (treat missing/0 as 0)
  const calculateIncomeAverage = () => {
    const months = ['month1', 'month2', 'month3', 'month4', 'month5', 'month6'];
    const total = months.reduce((sum, m) => sum + (incomes[m] || 0), 0);
    return Math.round(total / 6);
  };

  // Calculate expense average from all 3 months (treat missing/0 as 0)
  const calculateExpenseAverage = (category, type) => {
    const expenses = type === 'fixed' ? fixedExpenses : variableExpenses;
    const categoryData = expenses[category] || {};
    const months = ['month1', 'month2', 'month3'];
    const total = months.reduce((sum, m) => sum + (categoryData[m] || 0), 0);
    return Math.round(total / 3);
  };

  const getTotalFixedAverage = () => {
    return FIXED_EXPENSES.reduce((sum, cat) => sum + calculateExpenseAverage(cat, 'fixed'), 0);
  };

  const getTotalVariableAverage = () => {
    return VARIABLE_EXPENSES.reduce((sum, cat) => sum + calculateExpenseAverage(cat, 'variable'), 0);
  };

  const incomeAverage = calculateIncomeAverage();
  const fixedAverage = getTotalFixedAverage();
  const variableAverage = getTotalVariableAverage();
  const totalExpenseAverage = fixedAverage + variableAverage;
  const cashFlowAverage = incomeAverage - totalExpenseAverage;

  const updateExpense = (category, month, value, type) => {
    if (type === 'fixed') {
      setFixedExpenses(prev => ({
        ...prev,
        [category]: {
          ...(prev[category] || {}),
          [month]: parseFloat(value) || 0,
        },
      }));
    } else {
      setVariableExpenses(prev => ({
        ...prev,
        [category]: {
          ...(prev[category] || {}),
          [month]: parseFloat(value) || 0,
        },
      }));
    }
    triggerAutoSave();
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
      {/* Action Buttons */}
      {(!isViewingOther || isAdvisorOrAdmin) && (
        <div className="flex justify-end items-center">
          <Button
            onClick={() => setShowPDFImportDialog(true)}
            variant="outline"
            className="border-red-400 text-red-600 hover:bg-red-50"
          >
            <FileText className="w-4 h-4 ml-2" />
            ייבוא מ-PDF
          </Button>
        </div>
      )}
      
      {isViewingOther && !isAdvisorOrAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-amber-800 font-medium">אתה צופה בנתוני לקוח - ניתן לראות בלבד, לא לערוך</p>
        </div>
      )}

      {/* Cash Flow Chart */}
      {(incomeAverage > 0 || totalExpenseAverage > 0) && (() => {
        const chartData = [1, 2, 3, 4, 5, 6].map((m) => {
          const income = incomes[`month${m}`] || 0;
          const expenseKey = `month${m}`;
          // Expenses are only tracked for months 1-3
          if (m <= 3) {
            const fixed = FIXED_EXPENSES.reduce((sum, cat) => sum + (fixedExpenses[cat]?.[expenseKey] || 0), 0);
            const variable = VARIABLE_EXPENSES.reduce((sum, cat) => sum + (variableExpenses[cat]?.[expenseKey] || 0), 0);
            const total = fixed + variable;
            return { name: `חודש ${m}`, הכנסה: income, הוצאות: total, תזרים: income - total };
          }
          return { name: `חודש ${m}`, הכנסה: income };
        });
        return (
          <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-slate-800">
                <div className="p-2 rounded-xl bg-indigo-500/10">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                </div>
                הכנסות מול הוצאות - 6 חודשים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tickFormatter={(v) => `₪${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(value, name) => [`₪${value.toLocaleString()}`, name]}
                    contentStyle={{ direction: 'rtl', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '13px' }} />
                  <ReferenceLine y={0} stroke="#94a3b8" />
                  <Bar dataKey="הכנסה" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="הוצאות" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="תזרים" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-slate-400 text-center mt-2">* הוצאות ותזרים מוצגים עבור חודשים 1-3 בלבד</p>
            </CardContent>
          </Card>
        );
      })()}

      {/* Summary Cards - Only 3 cards now */}
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
                {cashFlowAverage >= 0 ? (
                  <TrendingUp className="w-8 h-8 text-indigo-600" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-600" />
                )}
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
                      value={incomes[`month${month}`] || ''}
                      onChange={(e) => { setIncomes({ ...incomes, [`month${month}`]: parseFloat(e.target.value) || 0 }); triggerAutoSave(); }}
                      placeholder="סכום"
                      className="border-slate-200"
                      disabled={isViewingOther && !isAdvisorOrAdmin}
                      />
                      </div>
                      ))}
                      </div>
              <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200/50">
                <p className="font-semibold text-emerald-700">
                  ממוצע הכנסות: ₪{incomeAverage.toLocaleString()}
                </p>
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
                          value={fixedExpenses[category]?.[`month${month}`] || ''}
                          onChange={(e) => updateExpense(category, `month${month}`, e.target.value, 'fixed')}
                          placeholder={`חודש ${month}`}
                          className="border-slate-200"
                          disabled={isViewingOther && !isAdvisorOrAdmin}
                          />
                          ))}
                          <p className="text-sm font-semibold text-blue-600">
                          ממוצע: ₪{avg.toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/50">
                <p className="font-semibold text-blue-700">
                  סה״כ ממוצע הוצאות קבועות: ₪{fixedAverage.toLocaleString()}
                </p>
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
                          value={variableExpenses[category]?.[`month${month}`] || ''}
                          onChange={(e) => updateExpense(category, `month${month}`, e.target.value, 'variable')}
                          placeholder={`חודש ${month}`}
                          className="border-slate-200"
                          disabled={isViewingOther && !isAdvisorOrAdmin}
                          />
                          ))}
                          <p className="text-sm font-semibold text-purple-600">
                          ממוצע: ₪{avg.toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-200/50">
                <p className="font-semibold text-purple-700">
                  סה״כ ממוצע יתרת הוצאות: ₪{variableAverage.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <PDFReflectionImport
        open={showPDFImportDialog}
        onOpenChange={setShowPDFImportDialog}
        onApply={(items) => {
          items.forEach(item => {
            const currentValue = item.type === 'fixed'
              ? (fixedExpenses[item.category]?.[item.month] || 0)
              : (variableExpenses[item.category]?.[item.month] || 0);
            updateExpense(item.category, item.month, currentValue + item.amount, item.type);
          });
        }}
      />


    </div>
  );
}