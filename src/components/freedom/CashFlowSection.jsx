import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wallet, TrendingUp, TrendingDown, Lightbulb, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function CashFlowSection({ userId, planType }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    salary: 0,
    additional_income: 0,
    rent: 0,
    fixed_expenses: 0,
    variable_expenses: 0,
  });
  const queryClient = useQueryClient();

  const isAdvisorOrAdmin = currentUser?.user_type === 'advisor' || currentUser?.user_type === 'admin';
  const isViewingOther = !!currentUser && currentUser.id !== userId;

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, [userId]);

  const { data: plan } = useQuery({
    queryKey: ['financialPlan', userId, planType, currentUser?.id],
    queryFn: async () => {
      if (isViewingOther && isAdvisorOrAdmin) {
        const response = await base44.functions.invoke('getClientData', { clientUserId: userId, entityName: 'FinancialPlan' });
        const plans = response.data.data;
        return plans.find(p => p.plan_type === planType);
      }
      const results = await base44.entities.FinancialPlan.filter({ user_id: userId, plan_type: planType });
      return results[0];
    },
    enabled: !!userId && !!currentUser,
  });

  const { data: goalSettings } = useQuery({
    queryKey: ['goalSettings', userId, currentUser?.id],
    queryFn: async () => {
      if (isViewingOther && isAdvisorOrAdmin) {
        const response = await base44.functions.invoke('getClientData', { clientUserId: userId, entityName: 'GoalSettings' });
        return response.data.data?.[0];
      }
      const results = await base44.entities.GoalSettings.filter({ user_id: userId });
      return results[0];
    },
    enabled: !!userId && !!currentUser,
  });

  useEffect(() => {
    if (plan) {
      setFormData({
        salary: plan.monthly_salary || 0,
        additional_income: plan.additional_income || 0,
        rent: plan.rent_expense || 0,
        fixed_expenses: plan.fixed_expenses || 0,
        variable_expenses: plan.variable_expenses || 0,
      });
    }
  }, [plan]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        user_id: userId,
        plan_type: planType,
        monthly_salary: formData.salary,
        additional_income: formData.additional_income,
        rent_expense: formData.rent,
        fixed_expenses: formData.fixed_expenses,
        variable_expenses: formData.variable_expenses,
        assets: plan?.assets || {},
        liabilities: plan?.liabilities || {},
        liquidate_keren_hishtalmut: plan?.liquidate_keren_hishtalmut || false,
        keren_withdrawal_option: plan?.keren_withdrawal_option || 'none',
      };
      if (isViewingOther && isAdvisorOrAdmin) {
        const response = await base44.functions.invoke('saveClientData', { entityName: 'FinancialPlan', clientUserId: userId, data, recordId: plan?.id || null });
        return response.data;
      }
      if (plan) {
        return base44.entities.FinancialPlan.update(plan.id, data);
      }
      return base44.entities.FinancialPlan.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financialPlan', userId, planType, currentUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['allFinancialPlans', userId] });
    },
  });

  const totalIncome = formData.salary + formData.additional_income;
  const totalExpenses = formData.rent + formData.fixed_expenses + formData.variable_expenses;
  const netCashFlow = totalIncome - totalExpenses;

  const getRecommendation = () => {
    if (netCashFlow > 0) {
      const targetIncome = goalSettings?.passive_income_target || 15000;
      const yearsToGoal = goalSettings?.target_age 
        ? goalSettings.target_age - (goalSettings.male_current_age || goalSettings.female_current_age || 35) 
        : 20;
      
      return {
        type: 'positive',
        message: `מעולה! אתה חוסך ₪${netCashFlow.toLocaleString()} בחודש. השקע סכום זה בתיק ההשקעות שלך כדי להגיע למטרה הכלכלית מהר יותר.`,
        subMessage: `עם השקעה חודשית זו ותשואה שנתית של 7%, תצבור כ-₪${Math.round(netCashFlow * 12 * yearsToGoal * 1.5).toLocaleString()} תוך ${yearsToGoal} שנים.`
      };
    } else if (netCashFlow < 0) {
      return {
        type: 'negative',
        message: `אתה בגירעון של ₪${Math.abs(netCashFlow).toLocaleString()} בחודש. צמצם הוצאות או הגדל הכנסות כדי לא להתרחק מהמטרה שלך.`,
        subMessage: 'נסה לזהות הוצאות שניתן לצמצם או חפש מקורות הכנסה נוספים.'
      };
    }
    return {
      type: 'neutral',
      message: 'אתה מאוזן בדיוק. נסה ליצור עודף כדי להתקדם לעבר המטרות שלך.',
      subMessage: ''
    };
  };

  const recommendation = getRecommendation();

  return (
    <Card className="border-0 shadow-xl bg-white/95 overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-[#105330] via-[#1a7a4a] to-[#c8a863]" />
      <CardHeader className="border-b border-[#105330]/10">
        <CardTitle className="flex items-center gap-3 text-[#105330]">
          <div className="p-2 rounded-xl bg-gradient-to-br from-[#105330] to-[#1a7a4a] shadow-lg">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          תזרים מזומנים חודשי
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Income Section */}
          <div className="space-y-4">
            <h3 className="font-bold text-[#105330] flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              הכנסות
            </h3>
            <div className="space-y-3 p-4 bg-emerald-50/50 rounded-xl border border-emerald-200">
              <div className="space-y-2">
                <Label className="text-emerald-700 font-medium">משכורת</Label>
                <Input
                  type="number"
                  value={formData.salary || ''}
                  onChange={(e) => setFormData({ ...formData, salary: parseFloat(e.target.value) || 0 })}
                  className="border-emerald-200 focus:border-emerald-400 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-emerald-700 font-medium">הכנסות נוספות</Label>
                <Input
                  type="number"
                  value={formData.additional_income || ''}
                  onChange={(e) => setFormData({ ...formData, additional_income: parseFloat(e.target.value) || 0 })}
                  className="border-emerald-200 focus:border-emerald-400 rounded-xl"
                />
              </div>
              <div className="pt-3 border-t border-emerald-200">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-emerald-700">סה״כ הכנסות</span>
                  <span className="text-2xl font-bold text-emerald-600">₪{totalIncome.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Expenses Section */}
          <div className="space-y-4">
            <h3 className="font-bold text-[#105330] flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-500" />
              הוצאות
            </h3>
            <div className="space-y-3 p-4 bg-red-50/50 rounded-xl border border-red-200">
              <div className="space-y-2">
                <Label className="text-red-700 font-medium">שכר דירה</Label>
                <Input
                  type="number"
                  value={formData.rent || ''}
                  onChange={(e) => setFormData({ ...formData, rent: parseFloat(e.target.value) || 0 })}
                  className="border-red-200 focus:border-red-400 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-red-700 font-medium">הוצאות קבועות</Label>
                <Input
                  type="number"
                  value={formData.fixed_expenses || ''}
                  onChange={(e) => setFormData({ ...formData, fixed_expenses: parseFloat(e.target.value) || 0 })}
                  className="border-red-200 focus:border-red-400 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-red-700 font-medium">הוצאות משתנות</Label>
                <Input
                  type="number"
                  value={formData.variable_expenses || ''}
                  onChange={(e) => setFormData({ ...formData, variable_expenses: parseFloat(e.target.value) || 0 })}
                  className="border-red-200 focus:border-red-400 rounded-xl"
                />
              </div>
              <div className="pt-3 border-t border-red-200">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-red-700">סה״כ הוצאות</span>
                  <span className="text-2xl font-bold text-red-600">₪{totalExpenses.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-emerald-100 rounded-xl text-center">
            <p className="text-sm text-emerald-600 font-medium">סה״כ הכנסות</p>
            <p className="text-2xl font-bold text-emerald-700">₪{totalIncome.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-red-100 rounded-xl text-center">
            <p className="text-sm text-red-600 font-medium">סה״כ הוצאות</p>
            <p className="text-2xl font-bold text-red-700">₪{totalExpenses.toLocaleString()}</p>
          </div>
          <div className={`p-4 rounded-xl text-center ${netCashFlow >= 0 ? 'bg-[#105330]/10' : 'bg-orange-100'}`}>
            <p className={`text-sm font-medium ${netCashFlow >= 0 ? 'text-[#105330]' : 'text-orange-600'}`}>תזרים נקי חודשי</p>
            <p className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-[#105330]' : 'text-orange-700'}`}>
              ₪{netCashFlow.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Recommendation */}
        <div className={`mt-6 p-5 rounded-xl border ${
          recommendation.type === 'positive' 
            ? 'bg-emerald-50 border-emerald-200' 
            : recommendation.type === 'negative'
            ? 'bg-red-50 border-red-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-start gap-3">
            <Lightbulb className={`w-6 h-6 flex-shrink-0 ${
              recommendation.type === 'positive' 
                ? 'text-emerald-500' 
                : recommendation.type === 'negative'
                ? 'text-red-500'
                : 'text-amber-500'
            }`} />
            <div>
              <p className={`font-bold ${
                recommendation.type === 'positive' 
                  ? 'text-emerald-800' 
                  : recommendation.type === 'negative'
                  ? 'text-red-800'
                  : 'text-amber-800'
              }`}>
                {recommendation.message}
              </p>
              {recommendation.subMessage && (
                <p className={`text-sm mt-1 ${
                  recommendation.type === 'positive' 
                    ? 'text-emerald-600' 
                    : recommendation.type === 'negative'
                    ? 'text-red-600'
                    : 'text-amber-600'
                }`}>
                  {recommendation.subMessage}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <Button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-gradient-to-r from-[#105330] to-[#1a7a4a] hover:from-[#0d4027] hover:to-[#105330] shadow-xl px-8 py-5 text-lg font-bold rounded-xl"
          >
            <Save className="w-5 h-5 ml-2" />
            {saveMutation.isPending ? 'שומר...' : 'שמור תזרים'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}