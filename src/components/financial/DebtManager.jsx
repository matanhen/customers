import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  CreditCard, TrendingDown, Plus, Trash2, 
  Edit, Target, AlertCircle, Sparkles, Calculator
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DebtManager({ userId }) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [showStrategyDialog, setShowStrategyDialog] = useState(false);
  const [showSimulationDialog, setShowSimulationDialog] = useState(false);
  const [simulationForm, setSimulationForm] = useState({
    new_amount: 0,
    new_interest_rate: 0,
    new_period_months: 0
  });
  const [debtForm, setDebtForm] = useState({
    name: '',
    type: 'loan',
    total_amount: 0,
    remaining_amount: 0,
    interest_rate: 0,
    minimum_payment: 0,
    current_payment: 0,
    payoff_strategy: 'avalanche'
  });

  const queryClient = useQueryClient();

  const { data: debts = [] } = useQuery({
    queryKey: ['debts', userId],
    queryFn: () => base44.entities.Debt.filter({ user_id: userId }),
    enabled: !!userId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Debt.create({ ...data, user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts', userId] });
      resetForm();
      setShowAddDialog(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Debt.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts', userId] });
      resetForm();
      setShowAddDialog(false);
      setEditingDebt(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Debt.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts', userId] });
    },
  });

  const resetForm = () => {
    setDebtForm({
      name: '',
      type: 'loan',
      total_amount: 0,
      remaining_amount: 0,
      interest_rate: 0,
      minimum_payment: 0,
      current_payment: 0,
      payoff_strategy: 'avalanche'
    });
  };

  const handleSubmit = () => {
    if (editingDebt) {
      updateMutation.mutate({ id: editingDebt.id, data: debtForm });
    } else {
      createMutation.mutate(debtForm);
    }
  };

  const handleEdit = (debt) => {
    setEditingDebt(debt);
    setDebtForm(debt);
    setShowAddDialog(true);
  };

  // Calculations
  const totalDebt = debts.reduce((sum, d) => sum + (d.remaining_amount || 0), 0);
  const totalCurrentPayment = debts.reduce((sum, d) => sum + (d.current_payment || 0), 0);
  const avgInterest = debts.length > 0 
    ? debts.reduce((sum, d) => sum + (d.interest_rate || 0), 0) / debts.length 
    : 0;

  // Strategy recommendations
  const getPayoffStrategy = () => {
    const snowballOrder = [...debts].sort((a, b) => a.remaining_amount - b.remaining_amount);
    const avalancheOrder = [...debts].sort((a, b) => b.interest_rate - a.interest_rate);
    
    return {
      snowball: snowballOrder,
      avalanche: avalancheOrder
    };
  };

  const strategies = getPayoffStrategy();

  const getDebtTypeLabel = (type) => {
    const labels = {
      loan: 'הלוואה',
      credit_card: 'כרטיס אשראי',
      mortgage: 'משכנתא',
      other: 'אחר'
    };
    return labels[type] || type;
  };

  const getDebtTypeColor = (type) => {
    const colors = {
      loan: 'bg-blue-100 text-blue-700',
      credit_card: 'bg-red-100 text-red-700',
      mortgage: 'bg-purple-100 text-purple-700',
      other: 'bg-gray-100 text-gray-700'
    };
    return colors[type] || colors.other;
  };

  // Simulation calculations
  const calculateTotalInterest = (principal, annualRate, months) => {
    if (months <= 0 || principal <= 0) return 0;
    const monthlyRate = annualRate / 100 / 12;
    if (monthlyRate === 0) return 0;
    
    const monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                          (Math.pow(1 + monthlyRate, months) - 1);
    const totalPaid = monthlyPayment * months;
    return totalPaid - principal;
  };

  const getSimulationResults = () => {
    // Current situation - sum all debts
    const currentTotalDebt = debts.reduce((sum, d) => sum + d.remaining_amount, 0);
    const currentAvgInterest = avgInterest;
    
    // Estimate current total months (weighted average)
    let totalCurrentMonths = 0;
    let weightedSum = 0;
    
    debts.forEach(debt => {
      if (debt.current_payment > 0 && debt.remaining_amount > 0) {
        const months = Math.ceil(debt.remaining_amount / debt.current_payment);
        weightedSum += months * debt.remaining_amount;
      }
    });
    
    if (currentTotalDebt > 0) {
      totalCurrentMonths = Math.ceil(weightedSum / currentTotalDebt);
    }
    
    // If no payment info, estimate 5 years
    if (totalCurrentMonths === 0) {
      totalCurrentMonths = 60;
    }

    // Current scenario - all debt at current rate
    const currentInterest = calculateTotalInterest(currentTotalDebt, currentAvgInterest, totalCurrentMonths);
    const currentTotal = currentTotalDebt + currentInterest;

    // New scenario with partial refinancing
    const refinanceAmount = simulationForm.new_amount || 0;
    const newRate = simulationForm.new_interest_rate || 0;
    const newMonths = simulationForm.new_period_months || 0;
    
    // Calculate monthly payment for refinanced loan
    const monthlyRate = newRate / 100 / 12;
    let monthlyPayment = 0;
    if (monthlyRate > 0 && newMonths > 0 && refinanceAmount > 0) {
      monthlyPayment = (refinanceAmount * monthlyRate * Math.pow(1 + monthlyRate, newMonths)) / 
                      (Math.pow(1 + monthlyRate, newMonths) - 1);
    } else if (refinanceAmount > 0 && newMonths > 0) {
      monthlyPayment = refinanceAmount / newMonths;
    }
    
    // Remaining debt that stays at current rate
    const remainingDebt = currentTotalDebt - refinanceAmount;
    
    // Interest on refinanced portion at new rate
    const refinanceInterest = calculateTotalInterest(refinanceAmount, newRate, newMonths);
    
    // Interest on remaining debt at current rate
    const remainingInterest = remainingDebt > 0 
      ? calculateTotalInterest(remainingDebt, currentAvgInterest, totalCurrentMonths)
      : 0;
    
    // Total new scenario
    const newTotalInterest = refinanceInterest + remainingInterest;
    const newTotal = currentTotalDebt + newTotalInterest;

    const savings = currentInterest - newTotalInterest;
    const totalSavings = currentTotal - newTotal;

    // Recommendation: which debt to refinance
    let recommendation = null;
    if (debts.length > 1 && refinanceAmount > 0) {
      // Sort debts by interest rate (highest first)
      const sortedByRate = [...debts].sort((a, b) => b.interest_rate - a.interest_rate);
      
      // Check if refinance amount can cover highest interest debt completely
      const highestInterestDebt = sortedByRate[0];
      if (refinanceAmount >= highestInterestDebt.remaining_amount) {
        recommendation = {
          type: 'full',
          debt: highestInterestDebt,
          message: `מומלץ למחזר את "${highestInterestDebt.name}" במלואו (₪${highestInterestDebt.remaining_amount.toLocaleString()}) - הריבית הגבוהה ביותר (${highestInterestDebt.interest_rate}%)`
        };
      } else {
        recommendation = {
          type: 'partial',
          debt: highestInterestDebt,
          message: `מומלץ למחזר חלק מ-"${highestInterestDebt.name}" - הריבית הגבוהה ביותר (${highestInterestDebt.interest_rate}%)`
        };
      }
    }

    return {
      current: {
        principal: currentTotalDebt,
        interest: currentInterest,
        total: currentTotal,
        months: totalCurrentMonths,
        avgRate: currentAvgInterest
      },
      new: {
        principal: refinanceAmount,
        remainingDebt: remainingDebt,
        interest: newTotalInterest,
        refinanceInterest: refinanceInterest,
        remainingInterest: remainingInterest,
        total: newTotal,
        months: newMonths,
        rate: newRate,
        monthlyPayment: monthlyPayment
      },
      savings: {
        interest: savings,
        total: totalSavings,
        percentage: currentInterest > 0 ? (savings / currentInterest) * 100 : 0
      },
      recommendation: recommendation
    };
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#105330]">ניהול חובות</h2>
          <p className="text-[#105330]/70">מעקב ואסטרטגיות פירעון חובות</p>
        </div>
        <div className="flex gap-2">
          {debts.length > 0 && (
            <Button 
              variant="outline" 
              className="border-[#c8a863] text-[#c8a863] hover:bg-[#c8a863]/10"
              onClick={() => {
                setSimulationForm({
                  new_amount: totalDebt,
                  new_interest_rate: 0,
                  new_period_months: 60
                });
                setShowSimulationDialog(true);
              }}
            >
              <Calculator className="w-4 h-4 ml-2" />
              סימולציה
            </Button>
          )}
          <Dialog open={showAddDialog} onOpenChange={(open) => {
            setShowAddDialog(open);
            if (!open) {
              setEditingDebt(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-[#105330] hover:bg-[#0d4027]" onClick={() => {
                setShowAddDialog(true);
                resetForm();
                setEditingDebt(null);
              }}>
                <Plus className="w-4 h-4 ml-2" />
                הוסף חוב
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingDebt ? 'עריכת חוב' : 'הוספת חוב חדש'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>שם החוב</Label>
                  <Input
                    value={debtForm.name}
                    onChange={(e) => setDebtForm({ ...debtForm, name: e.target.value })}
                    placeholder="לדוגמה: ביטוח חיים"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>סוג החוב</Label>
                    <Select value={debtForm.type} onValueChange={(v) => setDebtForm({ ...debtForm, type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="loan">הלוואה</SelectItem>
                        <SelectItem value="credit_card">כרטיס אשראי</SelectItem>
                        <SelectItem value="mortgage">משכנתא</SelectItem>
                        <SelectItem value="other">אחר</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>ריבית שנתית (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={debtForm.interest_rate || ''}
                      onChange={(e) => setDebtForm({ ...debtForm, interest_rate: parseFloat(e.target.value) || 0 })}
                      placeholder="5.5"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>סכום כולל</Label>
                    <Input
                      type="number"
                      value={debtForm.total_amount || ''}
                      onChange={(e) => setDebtForm({ ...debtForm, total_amount: parseFloat(e.target.value) || 0 })}
                      placeholder="100000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>יתרה נוכחית</Label>
                    <Input
                      type="number"
                      value={debtForm.remaining_amount || ''}
                      onChange={(e) => setDebtForm({ ...debtForm, remaining_amount: parseFloat(e.target.value) || 0 })}
                      placeholder="80000"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>תשלום מינימום</Label>
                    <Input
                      type="number"
                      value={debtForm.minimum_payment || ''}
                      onChange={(e) => setDebtForm({ ...debtForm, minimum_payment: parseFloat(e.target.value) || 0 })}
                      placeholder="2000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>תשלום חודשי</Label>
                    <Input
                      type="number"
                      value={debtForm.current_payment || ''}
                      onChange={(e) => setDebtForm({ ...debtForm, current_payment: parseFloat(e.target.value) || 0 })}
                      placeholder="2500"
                    />
                  </div>
                </div>
                <Button onClick={handleSubmit} className="w-full bg-[#105330] hover:bg-[#0d4027]">
                  {editingDebt ? 'עדכן' : 'הוסף'} חוב
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Debt Summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-2 border-red-300 bg-red-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-red-600">סך החובות</p>
                <p className="text-xl font-bold text-red-700">₪{totalDebt.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-300 bg-orange-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500">
                <TrendingDown className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-orange-600">ריבית ממוצעת</p>
                <p className="text-xl font-bold text-orange-700">{avgInterest.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-300 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-600">תשלום נוכחי</p>
                <p className="text-xl font-bold text-green-700">₪{totalCurrentPayment.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strategy Recommendation */}
      {debts.length > 0 && (
        <Card className="border-0 shadow-xl bg-gradient-to-br from-[#c8a863]/10 to-[#105330]/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-[#105330]">
                <Sparkles className="w-5 h-5 text-[#c8a863]" />
                אסטרטגיית פירעון מומלצת
              </CardTitle>
              <Button 
                variant="outline" 
                onClick={() => setShowStrategyDialog(true)}
                className="border-[#105330] text-[#105330]"
              >
                הצג פירוט
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-white rounded-xl border-2 border-green-200">
              <h3 className="font-bold text-green-700 mb-2">⛄ שיטת כדור השלג (Snowball)</h3>
              <p className="text-sm text-gray-600 mb-3">קודם סוגרים את החוב הקטן ביותר לטובת צבירת מוטיבציה ומומנטום</p>
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500">סדר פירעון מומלץ:</p>
                {strategies.snowball.slice(0, 3).map((debt, idx) => (
                  <div key={debt.id} className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-green-600">{idx + 1}.</span>
                    <span className="text-gray-700">{debt.name}</span>
                    <Badge className="bg-blue-100 text-blue-700 text-xs">₪{debt.remaining_amount.toLocaleString()}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debts List */}
      {debts.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Target className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-[#105330] mb-2">אין חובות רשומים</h3>
            <p className="text-[#105330]/70">הוסף חוב כדי לעקוב אחר תהליך הפירעון</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {debts.map((debt) => {
            const progress = debt.total_amount > 0 
              ? Math.round(((debt.total_amount - debt.remaining_amount) / debt.total_amount) * 100)
              : 0;
            const monthsToPayoff = debt.current_payment > 0
              ? Math.ceil(debt.remaining_amount / debt.current_payment)
              : 0;

            return (
              <Card key={debt.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-[#105330]">{debt.name}</h3>
                        <Badge className={getDebtTypeColor(debt.type)}>
                          {getDebtTypeLabel(debt.type)}
                        </Badge>
                        <Badge className="bg-red-100 text-red-700">ריבית: {debt.interest_rate}%</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>יתרה: <strong className="text-red-600">₪{debt.remaining_amount.toLocaleString()}</strong></span>
                        <span>מתוך: ₪{debt.total_amount.toLocaleString()}</span>
                        <span>תשלום חודשי: <strong>₪{(debt.current_payment || 0).toLocaleString()}</strong></span>
                        {monthsToPayoff > 0 && (
                          <span className="text-green-600">פירעון תוך {monthsToPayoff} חודשים</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEdit(debt)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => deleteMutation.mutate(debt.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">התקדמות פירעון</span>
                      <span className="font-bold text-green-600">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Simulation Dialog */}
      <Dialog open={showSimulationDialog} onOpenChange={setShowSimulationDialog}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Calculator className="w-6 h-6 text-[#c8a863]" />
              סימולציית מיחזור הלוואה
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Current Situation */}
            <div className="p-4 bg-red-50 rounded-xl border-2 border-red-200">
              <h3 className="font-bold text-red-700 mb-3 text-lg">📊 המצב הקיים</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">סך כל החובות</p>
                  <p className="text-2xl font-bold text-red-600">₪{totalDebt.toLocaleString()}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">ריבית ממוצעת</p>
                  <p className="text-2xl font-bold text-red-600">{avgInterest.toFixed(2)}%</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-white rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">פירוט החובות הקיימים:</p>
                <div className="space-y-1">
                  {debts.map((debt) => (
                    <div key={debt.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">{debt.name}</span>
                      <div className="flex gap-3">
                        <span className="font-medium text-red-600">₪{debt.remaining_amount.toLocaleString()}</span>
                        <Badge className="bg-red-100 text-red-700 text-xs">{debt.interest_rate}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* New Loan Input */}
            <div className="p-4 bg-green-50 rounded-xl border-2 border-green-200">
              <h3 className="font-bold text-green-700 mb-3 text-lg">💚 הלוואה חדשה (מיחזור)</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>סכום הלוואה חדשה</Label>
                  <Input
                    type="number"
                    value={simulationForm.new_amount || ''}
                    onChange={(e) => setSimulationForm({ ...simulationForm, new_amount: parseFloat(e.target.value) || 0 })}
                    placeholder="סכום"
                    className="text-lg font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ריבית שנתית חדשה (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={simulationForm.new_interest_rate || ''}
                    onChange={(e) => setSimulationForm({ ...simulationForm, new_interest_rate: parseFloat(e.target.value) || 0 })}
                    placeholder="ריבית"
                    className="text-lg font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label>תקופה (חודשים)</Label>
                  <Input
                    type="number"
                    value={simulationForm.new_period_months || ''}
                    onChange={(e) => setSimulationForm({ ...simulationForm, new_period_months: parseInt(e.target.value) || 0 })}
                    placeholder="חודשים"
                    className="text-lg font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Results */}
            {simulationForm.new_amount > 0 && simulationForm.new_period_months > 0 && (() => {
              const results = getSimulationResults();
              const isSavings = results.savings.interest > 0;
              
              return (
                <>
                  {/* Recommendation */}
                  {results.recommendation && (
                    <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                      <h3 className="font-bold text-blue-700 mb-2 flex items-center gap-2">
                        <Target className="w-5 h-5" />
                        המלצת מיחזור
                      </h3>
                      <p className="text-sm text-blue-800">{results.recommendation.message}</p>
                    </div>
                  )}

                  {/* Monthly Payment */}
                  <div className="p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
                    <h3 className="font-bold text-purple-700 mb-2">תשלום חודשי להלוואת מיחזור</h3>
                    <p className="text-3xl font-bold text-purple-800">₪{Math.round(results.new.monthlyPayment).toLocaleString()}</p>
                    <p className="text-sm text-purple-600 mt-1">לתקופה של {results.new.months} חודשים</p>
                  </div>

                  <div className={`p-5 rounded-xl border-2 ${isSavings ? 'bg-[#c8a863]/10 border-[#c8a863]' : 'bg-orange-50 border-orange-300'}`}>
                    <h3 className={`font-bold mb-4 text-xl flex items-center gap-2 ${isSavings ? 'text-[#105330]' : 'text-orange-700'}`}>
                      {isSavings ? '✨ תוצאות - חיסכון משמעותי!' : '⚠️ תוצאות - אין חיסכון'}
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                    {/* Current */}
                    <div className="bg-white p-4 rounded-lg shadow">
                      <p className="text-sm text-gray-500 mb-2">מצב קיים</p>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">קרן:</span>
                          <span className="font-bold">₪{results.current.principal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">ריבית צפויה:</span>
                          <span className="font-bold text-red-600">₪{results.current.interest.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1">
                          <span className="font-medium text-gray-700">סה״כ לתשלום:</span>
                          <span className="font-bold text-lg">₪{results.current.total.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* New */}
                    <div className="bg-white p-4 rounded-lg shadow">
                      <p className="text-sm text-gray-500 mb-2">מצב חדש (מיחזור חלקי)</p>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>מיחזור:</span>
                          <span>₪{results.new.principal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>יתרה בריבית קיימת:</span>
                          <span>₪{results.new.remainingDebt.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">ריבית על מיחזור:</span>
                          <span className="font-bold text-green-600">₪{results.new.refinanceInterest.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">ריבית על יתרה:</span>
                          <span className="font-bold text-orange-600">₪{results.new.remainingInterest.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1">
                          <span className="font-medium text-gray-700">סה״כ לתשלום:</span>
                          <span className="font-bold text-lg">₪{results.new.total.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Savings Summary */}
                  <div className={`p-5 rounded-lg ${isSavings ? 'bg-gradient-to-r from-[#105330] to-[#1a7a4a]' : 'bg-orange-500'} text-white`}>
                    <div className="text-center">
                      <p className="text-sm opacity-90 mb-1">
                        {isSavings ? 'חיסכון כולל בריבית' : 'עלות נוספת'}
                      </p>
                      <p className="text-4xl font-bold mb-1">
                        {isSavings ? '₪' : '-₪'}{Math.abs(results.savings.interest).toLocaleString()}
                      </p>
                      <p className="text-sm opacity-90">
                        {isSavings 
                          ? `${results.savings.percentage.toFixed(1)}% פחות ריבית!` 
                          : 'ההלוואה החדשה יקרה יותר'}
                      </p>
                    </div>
                  </div>

                  {isSavings && (
                    <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-green-800">
                        <strong>💡 המלצה:</strong> מיחזור ההלוואה יכול לחסוך לך {Math.abs(results.savings.interest).toLocaleString()}₪ בריבית. 
                        שקול לפנות לבנק או מוסד פיננסי למימון מחדש.
                      </p>
                    </div>
                  )}
                  </div>
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Strategy Dialog */}
      <Dialog open={showStrategyDialog} onOpenChange={setShowStrategyDialog}>
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>אסטרטגיית פירעון מומלצת</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="p-4 bg-green-50 rounded-xl border-2 border-green-300">
              <h3 className="font-bold text-green-700 mb-3 flex items-center gap-2 text-lg">
                <Target className="w-6 h-6" />
                שיטת כדור השלג (Snowball)
              </h3>
              <p className="text-sm text-gray-700 mb-4 font-medium">
                קודם סוגרים את החוב הקטן ביותר לטובת צבירת מוטיבציה ומומנטום. כל חוב שנפרע מעניק תחושת הישג ומוטיבציה להמשיך.
              </p>
              <div className="space-y-2">
                <p className="text-sm font-bold text-green-700 mb-2">סדר פירעון מומלץ:</p>
                {strategies.snowball.map((debt, idx) => (
                  <div key={debt.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-green-600 text-lg">{idx + 1}</span>
                      <div>
                        <p className="font-medium text-gray-800">{debt.name}</p>
                        <p className="text-xs text-gray-500">ריבית: {debt.interest_rate}%</p>
                      </div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700">₪{debt.remaining_amount.toLocaleString()}</Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <h3 className="font-bold text-amber-700 mb-2">💡 טיפים נוספים</h3>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>• שקול איחוד חובות אם יש לך מספר חובות עם ריבית גבוהה</li>
                <li>• בדוק אפשרויות למימון מחדש בריבית נמוכה יותר</li>
                <li>• הגדל תשלומים חודשיים אפילו בסכומים קטנים - זה מקצר משמעותית את זמן הפירעון</li>
                <li>• צור קרן חירום קטנה (₪5,000-10,000) כדי למנוע חובות חדשים</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}