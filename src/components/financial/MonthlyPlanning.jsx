import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addMonths, subMonths } from 'date-fns';
import { he } from 'date-fns/locale';
import { 
  ChevronLeft, ChevronRight, Wallet, 
  PiggyBank, Target, AlertCircle, CheckCircle,
  TrendingUp, Shield, Sparkles, Save
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import FinancialGoals from './FinancialGoals';

export default function MonthlyPlanning({ userId }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentUser, setCurrentUser] = useState(null);
  const [planData, setPlanData] = useState({
    expected_income: 0,
    savings: 0,
    fixed_expenses: 0,
    variable_expenses: 0,
    investments_allocation: 0,
    dreams_savings: 0,
    emergency_fund_current: 0,
    emergency_fund_allocation: 0,
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

  const { data: monthlyPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['monthlyPlans', userId, currentUser?.id, isViewingOther, isAdvisorOrAdmin],
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
  });

  const currentPlan = monthlyPlans.find(p => p.month === currentMonth);

  useEffect(() => {
    if (currentPlan) {
      setPlanData({
        expected_income: currentPlan.expected_income || 0,
        savings: currentPlan.savings || 0,
        fixed_expenses: currentPlan.fixed_expenses || 0,
        variable_expenses: currentPlan.variable_expenses || 0,
        investments_allocation: currentPlan.investments_allocation || 0,
        dreams_savings: currentPlan.dreams_savings || 0,
        emergency_fund_current: currentPlan.emergency_fund_current || 0,
        emergency_fund_allocation: currentPlan.emergency_fund_allocation || 0,
      });
    } else {
      // Try to get previous month data for fixed expenses
      const prevMonth = format(subMonths(currentDate, 1), 'yyyy-MM');
      const prevPlan = monthlyPlans.find(p => p.month === prevMonth);
      setPlanData({
        expected_income: 0,
        savings: 0,
        fixed_expenses: prevPlan?.fixed_expenses || 0,
        variable_expenses: 0,
        investments_allocation: 0,
        dreams_savings: prevPlan?.dreams_savings || 0,
        emergency_fund_current: prevPlan ? 
          (prevPlan.emergency_fund_current || 0) + (prevPlan.emergency_fund_allocation || 0) : 0,
        emergency_fund_allocation: 0,
      });
    }
  }, [currentPlan, monthlyPlans, currentMonth, currentDate]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (isViewingOther && isAdvisorOrAdmin) {
        const response = await base44.functions.invoke('saveClientData', {
          entityName: 'MonthlyPlan',
          clientUserId: userId,
          data: { ...data, user_id: userId, month: currentMonth },
          recordId: currentPlan?.id || null,
        });
        return response.data;
      }
      if (currentPlan) {
        return base44.entities.MonthlyPlan.update(currentPlan.id, data);
      } else {
        return base44.entities.MonthlyPlan.create({
          ...data,
          user_id: userId,
          month: currentMonth,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyPlans', userId, currentUser?.id] });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(planData);
  };

  const totalExpenses = planData.fixed_expenses + planData.variable_expenses + planData.savings;
  const expensesPercentage = planData.expected_income > 0 
    ? Math.round((totalExpenses / planData.expected_income) * 100) 
    : 0;
  
  const isBalanced = expensesPercentage === 100;
  const isOver = expensesPercentage > 100;
  const isUnder = expensesPercentage < 100;

  // Emergency fund target: (fixed + variable) * 3
  const emergencyFundTarget = (planData.fixed_expenses + planData.variable_expenses) * 3;
  const emergencyFundProgress = emergencyFundTarget > 0 
    ? Math.min(100, Math.round((planData.emergency_fund_current / emergencyFundTarget) * 100))
    : 0;
  const remainingForEmergency = Math.max(0, emergencyFundTarget - planData.emergency_fund_current);

  // Freedom account breakdown
  const totalFreedomAccount = planData.savings;
  const freedomInvestments = planData.investments_allocation;
  const freedomDreams = planData.dreams_savings;
  const freedomEmergency = planData.emergency_fund_allocation;
  const allocatedFreedom = freedomInvestments + freedomDreams + freedomEmergency;
  const freedomPercentage = totalFreedomAccount > 0 
    ? Math.round((allocatedFreedom / totalFreedomAccount) * 100)
    : 0;

  const getPercentage = (value) => {
    if (!planData.expected_income || planData.expected_income === 0) return 0;
    return Math.round((value / planData.expected_income) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Month Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-bold text-gray-900">
              {format(currentDate, 'MMMM yyyy', { locale: he })}
            </h2>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Card className="border-2 border-[#105330] bg-gradient-to-r from-[#105330]/5 to-[#c8a863]/5">
        <CardContent className="p-4">
          <Button 
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="w-full bg-[#105330] hover:bg-[#0d4027] text-white font-semibold py-6 text-lg"
          >
            <Save className="w-5 h-5 ml-2" />
            {saveMutation.isPending ? 'שומר...' : 'שמור נתונים'}
          </Button>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Income */}
        <Card className="border-2 border-green-300 bg-green-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg text-green-700">
              <Wallet className="w-5 h-5 text-green-600" />
              הכנסה צפויה
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Input
                type="number"
                value={planData.expected_income || ''}
                onChange={(e) => setPlanData({ ...planData, expected_income: parseFloat(e.target.value) || 0 })}
                placeholder="הזן הכנסה צפויה"
                className="text-lg font-medium"
              />
              <p className="text-sm text-gray-500">סכום ההכנסה הצפויה החודש</p>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Summary */}
        <Card className={`${isOver ? 'border-red-200 bg-red-50' : isUnder ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              {isBalanced ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className={`w-5 h-5 ${isOver ? 'text-red-600' : 'text-amber-600'}`} />
              )}
              סיכום הוצאות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">סך הוצאות מתוכננות:</span>
                <span className="text-xl font-bold">₪{totalExpenses.toLocaleString()}</span>
              </div>
              <Progress 
                value={Math.min(100, expensesPercentage)} 
                className={`h-3 ${isOver ? 'bg-red-200' : isUnder ? 'bg-amber-200' : 'bg-green-200'}`}
              />
              <p className={`text-sm font-medium ${isOver ? 'text-red-600' : isUnder ? 'text-amber-600' : 'text-green-600'}`}>
                {expensesPercentage}% מההכנסה
                {isOver && ` - חריגה של ₪${(totalExpenses - planData.expected_income).toLocaleString()}`}
                {isUnder && ` - נשארו ${100 - expensesPercentage}% (₪${(planData.expected_income - totalExpenses).toLocaleString()})`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expense Categories */}
      <Card className="border-2 border-red-300 bg-red-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <PiggyBank className="w-5 h-5 text-red-600" />
            פירוט הוצאות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Savings */}
            <div className="space-y-3">
              <Label className="text-base font-medium flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                חסכונות
              </Label>
              <Input
                type="number"
                value={planData.savings || ''}
                onChange={(e) => setPlanData({ ...planData, savings: parseFloat(e.target.value) || 0 })}
                placeholder="סכום"
              />
              <p className="text-sm text-gray-500">
                {getPercentage(planData.savings)}% מההכנסה
              </p>
            </div>

            {/* Fixed Expenses */}
            <div className="space-y-3">
              <Label className="text-base font-medium flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                הוצאות קבועות
              </Label>
              <Input
                type="number"
                value={planData.fixed_expenses || ''}
                onChange={(e) => setPlanData({ ...planData, fixed_expenses: parseFloat(e.target.value) || 0 })}
                placeholder="סכום"
              />
              <p className="text-sm text-gray-500">
                {getPercentage(planData.fixed_expenses)}% מההכנסה
              </p>
            </div>

            {/* Variable Expenses */}
            <div className="space-y-3">
              <Label className="text-base font-medium flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                יתרת הוצאות
              </Label>
              <Input
                type="number"
                value={planData.variable_expenses || ''}
                onChange={(e) => setPlanData({ ...planData, variable_expenses: parseFloat(e.target.value) || 0 })}
                placeholder="סכום"
              />
              <p className="text-sm text-gray-500">
                {getPercentage(planData.variable_expenses)}% מההכנסה
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Freedom Account */}
      <Card className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-sky-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Sparkles className="w-5 h-5 text-blue-600" />
            חשבון החופש
            <span className="text-sm font-normal text-gray-500 mr-2">
              (מתוך החסכונות: ₪{totalFreedomAccount.toLocaleString()})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            {/* Investments */}
            <div className="space-y-3">
              <Label className="text-base font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                השקעות
              </Label>
              <Input
                type="number"
                value={planData.investments_allocation || ''}
                onChange={(e) => setPlanData({ ...planData, investments_allocation: parseFloat(e.target.value) || 0 })}
                placeholder="סכום"
              />
              <p className="text-sm text-gray-500">
                {totalFreedomAccount > 0 ? Math.round((planData.investments_allocation / totalFreedomAccount) * 100) : 0}% מחשבון החופש
              </p>
            </div>

            {/* Dreams Savings */}
            <div className="space-y-3">
              <Label className="text-base font-medium flex items-center gap-2">
                <Target className="w-4 h-4 text-pink-600" />
                חיסכון חלומות
              </Label>
              <Input
                type="number"
                value={planData.dreams_savings || ''}
                onChange={(e) => setPlanData({ ...planData, dreams_savings: parseFloat(e.target.value) || 0 })}
                placeholder="סכום"
              />
              <p className="text-sm text-gray-500">
                {totalFreedomAccount > 0 ? Math.round((planData.dreams_savings / totalFreedomAccount) * 100) : 0}% מחשבון החופש
              </p>
            </div>

            {/* Emergency Fund */}
            <div className="space-y-3">
              <Label className="text-base font-medium flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-600" />
                קרן ביטחון
              </Label>
              <Input
                type="number"
                value={planData.emergency_fund_allocation || ''}
                onChange={(e) => setPlanData({ ...planData, emergency_fund_allocation: parseFloat(e.target.value) || 0 })}
                placeholder="סכום"
              />
              <p className="text-sm text-gray-500">
                {totalFreedomAccount > 0 ? Math.round((planData.emergency_fund_allocation / totalFreedomAccount) * 100) : 0}% מחשבון החופש
              </p>
            </div>
          </div>

          {/* Freedom Account Summary */}
          <div className={`p-4 rounded-xl ${freedomPercentage === 100 ? 'bg-green-100' : freedomPercentage > 100 ? 'bg-red-100' : 'bg-amber-100'}`}>
            <div className="flex items-center justify-between">
              <span className="font-medium">סיכום חלוקת חשבון החופש:</span>
              <span className={`font-bold ${freedomPercentage === 100 ? 'text-green-700' : freedomPercentage > 100 ? 'text-red-700' : 'text-amber-700'}`}>
                ₪{allocatedFreedom.toLocaleString()} / ₪{totalFreedomAccount.toLocaleString()} ({freedomPercentage}%)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Fund Status */}
      <Card className="border-2 border-purple-300 bg-purple-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-700">
            <Shield className="w-5 h-5 text-purple-600" />
            מצב קרן הביטחון
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label>סכום נוכחי בקרן</Label>
              <Input
                type="number"
                value={planData.emergency_fund_current || ''}
                onChange={(e) => setPlanData({ ...planData, emergency_fund_current: parseFloat(e.target.value) || 0 })}
                placeholder="סכום נוכחי"
              />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>יעד קרן ביטחון (3 חודשי מחייה)</Label>
                <span className="text-lg font-bold text-green-600">₪{emergencyFundTarget.toLocaleString()}</span>
              </div>
              <Progress value={emergencyFundProgress} className="h-3" />
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{emergencyFundProgress}% הושלם</span>
                <span className="text-gray-600">נשאר: ₪{remainingForEmergency.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Goals */}
      <FinancialGoals userId={userId} monthlyDreamsSavings={planData.dreams_savings} />
    </div>
  );
}