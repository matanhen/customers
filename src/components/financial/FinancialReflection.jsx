import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  TrendingUp, TrendingDown, Save, ChevronDown, ChevronUp,
  DollarSign, Receipt, FileText, Check
} from 'lucide-react';
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
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showPDFImportDialog, setShowPDFImportDialog] = useState(false);
  const [importText, setImportText] = useState('');
  const [parsedItems, setParsedItems] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isViewingOtherUser, setIsViewingOtherUser] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        setIsViewingOtherUser(user.id !== userId);
      } catch (e) {
        console.log('Failed to load user');
      }
    };
    loadUser();
  }, [userId]);

  const { data: reflection, isLoading: reflectionLoading } = useQuery({
    queryKey: ['financialReflection', userId],
    queryFn: async () => {
      // If viewing other user's data (advisor/admin viewing client)
      if (isViewingOtherUser && currentUser && (currentUser.user_type === 'advisor' || currentUser.user_type === 'admin')) {
        const response = await base44.functions.invoke('getClientData', {
          clientUserId: userId,
          entityName: 'FinancialReflection'
        });
        return response.data.data[0];
      }
      // Own data
      const results = await base44.entities.FinancialReflection.filter({ user_id: userId });
      return results[0];
    },
    enabled: !!userId && !!currentUser,
    staleTime: 3 * 60 * 1000,
  });

  useEffect(() => {
    if (reflection) {
      setIncomes(reflection.incomes || { month1: 0, month2: 0, month3: 0, month4: 0, month5: 0, month6: 0 });
      setFixedExpenses(reflection.fixed_expenses || {});
      setVariableExpenses(reflection.variable_expenses || {});
    }
  }, [reflection]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Don't allow advisors to edit, but allow admins
      if (isViewingOtherUser && currentUser?.user_type !== 'admin') {
        throw new Error('אין הרשאה לערוך נתוני לקוח אחר');
      }
      
      const data = {
        user_id: userId,
        incomes,
        fixed_expenses: fixedExpenses,
        variable_expenses: variableExpenses,
      };
      if (reflection) {
        return base44.entities.FinancialReflection.update(reflection.id, data);
      }
      return base44.entities.FinancialReflection.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financialReflection', userId] });
    },
  });

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
  };

  const parseImportedText = (text) => {
    const lines = text.trim().split('\n');
    const items = [];
    
    lines.forEach(line => {
      if (!line.trim()) return;
      
      // Try to match pattern: text followed by number
      // Support both comma and dot as decimal separator
      const match = line.match(/^(.+?)\s+([\d,]+\.?\d*)\s*$/);
      
      if (match) {
        const description = match[1].trim();
        const amountStr = match[2].replace(/,/g, '');
        const amount = parseFloat(amountStr);
        
        if (!isNaN(amount) && amount > 0) {
          items.push({
            description,
            amount: Math.round(amount * 100) / 100,
            assignedTo: null, // { category, month, type }
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

  const assignItem = (index, category, month, type) => {
    setParsedItems(prev => prev.map((item, i) => 
      i === index ? { ...item, assignedTo: { category, month, type } } : item
    ));
  };

  const applyImportedItems = () => {
    parsedItems.forEach(item => {
      if (item.assignedTo) {
        const { category, month, type } = item.assignedTo;
        const currentValue = type === 'fixed' 
          ? (fixedExpenses[category]?.[month] || 0)
          : (variableExpenses[category]?.[month] || 0);
        
        updateExpense(category, month, currentValue + item.amount, type);
      }
    });
    
    setShowImportDialog(false);
    setImportText('');
    setParsedItems([]);
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
      {(!isViewingOtherUser || currentUser?.user_type === 'admin') && (
        <div className="flex justify-between items-center">
          <Button 
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/30 px-8"
          >
            <Save className="w-4 h-4 ml-2" />
            {saveMutation.isPending ? 'שומר...' : 'שמור נתונים'}
          </Button>
          
          <div className="flex gap-2">
            <Button
              onClick={() => setShowPDFImportDialog(true)}
              variant="outline"
              className="border-red-400 text-red-600 hover:bg-red-50"
            >
              <FileText className="w-4 h-4 ml-2" />
              ייבוא מ-PDF
            </Button>
            <Button
              onClick={() => setShowImportDialog(true)}
              variant="outline"
              className="border-[#105330] text-[#105330] hover:bg-[#105330]/10"
            >
              <FileText className="w-4 h-4 ml-2" />
              ייבוא הוצאות מטקסט
            </Button>
          </div>
        </div>
      )}
      
      {isViewingOtherUser && currentUser?.user_type !== 'admin' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-amber-800 font-medium">אתה צופה בנתוני לקוח - ניתן לראות בלבד, לא לערוך</p>
        </div>
      )}

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
                      onChange={(e) => setIncomes({ ...incomes, [`month${month}`]: parseFloat(e.target.value) || 0 })}
                      placeholder="סכום"
                      className="border-slate-200"
                      disabled={isViewingOtherUser && currentUser?.user_type !== 'admin'}
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
                          disabled={isViewingOtherUser && currentUser?.user_type !== 'admin'}
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
                          disabled={isViewingOtherUser && currentUser?.user_type !== 'admin'}
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
                <p className="font-semibold">נמצאו {parsedItems.length} פריטים. שייך כל פריט לקטגוריה וחודש:</p>
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
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs mb-1">סוג הוצאה</Label>
                        <Select
                          value={item.assignedTo?.type || ''}
                          onValueChange={(value) => {
                            const newAssignment = { 
                              ...item.assignedTo, 
                              type: value,
                              category: null,
                              month: item.assignedTo?.month || 'month1'
                            };
                            assignItem(index, newAssignment.category, newAssignment.month, newAssignment.type);
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
                        <Label className="text-xs mb-1">קטגוריה</Label>
                        <Select
                          value={item.assignedTo?.category || ''}
                          onValueChange={(value) => {
                            assignItem(index, value, item.assignedTo?.month || 'month1', item.assignedTo?.type);
                          }}
                          disabled={!item.assignedTo?.type}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="בחר קטגוריה" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px]">
                            {(item.assignedTo?.type === 'fixed' ? FIXED_EXPENSES : VARIABLE_EXPENSES).map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-xs mb-1">חודש</Label>
                        <Select
                          value={item.assignedTo?.month || 'month1'}
                          onValueChange={(value) => {
                            assignItem(index, item.assignedTo?.category, value, item.assignedTo?.type);
                          }}
                          disabled={!item.assignedTo?.type}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="בחר חודש" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="month1">חודש 1</SelectItem>
                            <SelectItem value="month2">חודש 2</SelectItem>
                            <SelectItem value="month3">חודש 3</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
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
                  disabled={!parsedItems.some(item => item.assignedTo?.category)}
                  className="bg-[#105330] hover:bg-[#0d4027]"
                >
                  יישם שינויים ({parsedItems.filter(item => item.assignedTo?.category).length}/{parsedItems.length})
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}