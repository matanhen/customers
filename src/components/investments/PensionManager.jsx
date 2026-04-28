import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, User, Users, Calendar, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PensionManager({ userId }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeGender, setActiveGender] = useState('male');
  const [activeFund, setActiveFund] = useState('pension');
  const queryClient = useQueryClient();

  const isAdvisorOrAdmin = currentUser?.user_type === 'advisor' || currentUser?.user_type === 'admin';
  const isViewingOther = !!currentUser && currentUser.id !== userId;

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, [userId]);

  const { data: pensionData = [] } = useQuery({
    queryKey: ['pensionData', userId, currentUser?.id, isViewingOther, isAdvisorOrAdmin],
    queryFn: async () => {
      if (isViewingOther && isAdvisorOrAdmin) {
        const response = await base44.functions.invoke('getClientData', { clientUserId: userId, entityName: 'PensionData' });
        return response.data.data;
      }
      return base44.entities.PensionData.filter({ user_id: userId });
    },
    enabled: !!userId && !!currentUser,
  });

  const getFundData = (gender, fundType) => {
    return pensionData.find(p => p.gender === gender && p.fund_type === fundType) || {
      current_age: 30,
      retirement_age: 67,
      stop_deposits_age: 67,
      current_amount: 0,
      monthly_deposit: 0,
      management_fee_deposit: 0,
      management_fee_savings: 0,
      annual_return: 5,
    };
  };

  const saveMutation = useMutation({
    mutationFn: async ({ gender, fundType, data }) => {
      const existing = pensionData.find(p => p.gender === gender && p.fund_type === fundType);
      const fullData = { ...data, user_id: userId, gender, fund_type: fundType };
      if (isViewingOther && isAdvisorOrAdmin) {
        const response = await base44.functions.invoke('saveClientData', {
          entityName: 'PensionData',
          clientUserId: userId,
          data: fullData,
          recordId: existing?.id || null,
        });
        return response.data;
      }
      if (existing) {
        return base44.entities.PensionData.update(existing.id, data);
      }
      return base44.entities.PensionData.create(fullData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pensionData', userId, currentUser?.id] });
    },
  });

  const calculateProjectedAmount = (data, yearsFromNow = null) => {
    const currentAge = data.current_age || 30;
    const retirementAge = data.retirement_age || 67;
    const stopDepositsAge = data.stop_deposits_age || retirementAge;
    const currentAmount = data.current_amount || 0;
    const monthlyDeposit = data.monthly_deposit || 0;
    const annualReturn = (data.annual_return || 5) / 100;
    const managementFeeSavings = (data.management_fee_savings || 0) / 100;
    const managementFeeDeposit = (data.management_fee_deposit || 0) / 100;

    const effectiveReturn = annualReturn - managementFeeSavings;
    const monthlyReturn = effectiveReturn / 12;
    const effectiveDeposit = monthlyDeposit * (1 - managementFeeDeposit);

    // If specific years provided, calculate for that
    if (yearsFromNow !== null) {
      const targetAge = currentAge + yearsFromNow;
      const yearsWithDeposits = Math.min(yearsFromNow, Math.max(0, stopDepositsAge - currentAge));
      const monthsWithDeposits = yearsWithDeposits * 12;

      let amount = currentAmount;
      for (let i = 0; i < monthsWithDeposits; i++) {
        amount = amount * (1 + monthlyReturn) + effectiveDeposit;
      }

      // Additional months without deposits
      const remainingMonths = (yearsFromNow * 12) - monthsWithDeposits;
      for (let i = 0; i < remainingMonths; i++) {
        amount = amount * (1 + monthlyReturn);
      }

      return Math.round(amount);
    }

    // Original calculation for retirement
    const yearsWithDeposits = Math.max(0, stopDepositsAge - currentAge);
    const monthsWithDeposits = yearsWithDeposits * 12;

    let amountAfterDeposits = currentAmount;
    for (let i = 0; i < monthsWithDeposits; i++) {
      amountAfterDeposits = amountAfterDeposits * (1 + monthlyReturn) + effectiveDeposit;
    }

    const yearsWithoutDeposits = Math.max(0, retirementAge - stopDepositsAge);
    const monthsWithoutDeposits = yearsWithoutDeposits * 12;

    let finalAmount = amountAfterDeposits;
    for (let i = 0; i < monthsWithoutDeposits; i++) {
      finalAmount = finalAmount * (1 + monthlyReturn);
    }

    return Math.round(finalAmount);
  };

  const calculateMonthlyPension = (projectedAmount) => {
    return Math.round(projectedAmount / 210);
  };

  const PensionForm = ({ gender, fundType }) => {
    const [formData, setFormData] = useState(getFundData(gender, fundType));
    const [selectedYears, setSelectedYears] = useState('10');

    useEffect(() => {
      setFormData(getFundData(gender, fundType));
    }, [pensionData, gender, fundType]);

    const projectedAmount = calculateProjectedAmount(formData);
    const yearsToRetirement = (formData.retirement_age || 67) - (formData.current_age || 30);
    const monthlyPension = fundType === 'pension' ? calculateMonthlyPension(projectedAmount) : 0;

    // Calculate for selected years (keren hishtalmut only)
    const projectedIn10Years = calculateProjectedAmount(formData, 10);
    const projectedIn20Years = calculateProjectedAmount(formData, 20);
    const projectedIn30Years = calculateProjectedAmount(formData, 30);
    const projectedInSelectedYears = calculateProjectedAmount(formData, parseInt(selectedYears));

    const isPension = fundType === 'pension';

    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-[#105330]">גיל נוכחי</Label>
            <Input
              type="number"
              value={formData.current_age || ''}
              onChange={(e) => setFormData({ ...formData, current_age: parseInt(e.target.value) || 0 })}
              className="border-[#105330]/30 focus:border-[#105330] focus:ring-[#105330]/20 rounded-xl"
            />
          </div>
          {isPension && (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#105330]">גיל פנסיה</Label>
                <Input
                  type="number"
                  value={formData.retirement_age || ''}
                  onChange={(e) => setFormData({ ...formData, retirement_age: parseInt(e.target.value) || 0 })}
                  className="border-[#105330]/30 focus:border-[#105330] focus:ring-[#105330]/20 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#105330]">שנים עד לפנסיה</Label>
                <Input
                  type="number"
                  value={yearsToRetirement}
                  disabled
                  className="bg-[#105330]/5 border-[#105330]/20 rounded-xl font-bold"
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-[#105330]">גיל הפסקת הפקדות</Label>
            <Input
              type="number"
              value={formData.stop_deposits_age || ''}
              onChange={(e) => setFormData({ ...formData, stop_deposits_age: parseInt(e.target.value) || 0 })}
              className="border-[#105330]/30 focus:border-[#105330] focus:ring-[#105330]/20 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-[#105330]">סכום נוכחי</Label>
            <Input
              type="number"
              value={formData.current_amount || ''}
              onChange={(e) => setFormData({ ...formData, current_amount: parseFloat(e.target.value) || 0 })}
              className="border-[#105330]/30 focus:border-[#105330] focus:ring-[#105330]/20 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-[#105330]">הפקדה חודשית</Label>
            <Input
              type="number"
              value={formData.monthly_deposit || ''}
              onChange={(e) => setFormData({ ...formData, monthly_deposit: parseFloat(e.target.value) || 0 })}
              className="border-[#105330]/30 focus:border-[#105330] focus:ring-[#105330]/20 rounded-xl"
            />
          </div>
          {isPension && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#105330]">דמי ניהול מהפקדה (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.management_fee_deposit || ''}
                onChange={(e) => setFormData({ ...formData, management_fee_deposit: parseFloat(e.target.value) || 0 })}
                className="border-[#105330]/30 focus:border-[#105330] focus:ring-[#105330]/20 rounded-xl"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-[#105330]">דמי ניהול מחיסכון (%)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.management_fee_savings || ''}
              onChange={(e) => setFormData({ ...formData, management_fee_savings: parseFloat(e.target.value) || 0 })}
              className="border-[#105330]/30 focus:border-[#105330] focus:ring-[#105330]/20 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-[#105330]">תשואה שנתית (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.annual_return || ''}
              onChange={(e) => setFormData({ ...formData, annual_return: parseFloat(e.target.value) || 0 })}
              className="border-[#105330]/30 focus:border-[#105330] focus:ring-[#105330]/20 rounded-xl"
            />
          </div>
        </div>

        {/* Results */}
        {isPension ? (
          <Card className="bg-gradient-to-br from-[#105330]/10 via-[#105330]/5 to-[#c8a863]/10 border-[#105330]/20 shadow-xl">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="text-center p-4 bg-white/60 rounded-2xl">
                  <p className="text-sm text-[#105330] font-medium mb-2">סכום צפוי בגיל פנסיה</p>
                  <p className="text-3xl font-bold text-[#105330]">
                    ₪{projectedAmount.toLocaleString()}
                  </p>
                </div>
                <div className="text-center p-4 bg-white/60 rounded-2xl">
                  <p className="text-sm text-[#105330] font-medium mb-2">קצבה חודשית משוערת</p>
                  <p className="text-3xl font-bold text-[#c8a863]">
                    ₪{monthlyPension.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gradient-to-br from-[#105330]/10 via-[#105330]/5 to-[#c8a863]/10 border-[#105330]/20 shadow-xl">
            <CardContent className="p-6 space-y-6">
              {/* Quick projections */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-white/60 rounded-2xl border-2 border-transparent hover:border-[#c8a863] transition-all">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-[#105330]" />
                    <p className="text-sm text-[#105330] font-medium">עוד 10 שנים</p>
                  </div>
                  <p className="text-2xl font-bold text-[#105330]">
                    ₪{projectedIn10Years.toLocaleString()}
                  </p>
                </div>
                <div className="text-center p-4 bg-white/60 rounded-2xl border-2 border-transparent hover:border-[#c8a863] transition-all">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-[#105330]" />
                    <p className="text-sm text-[#105330] font-medium">עוד 20 שנים</p>
                  </div>
                  <p className="text-2xl font-bold text-[#105330]">
                    ₪{projectedIn20Years.toLocaleString()}
                  </p>
                </div>
                <div className="text-center p-4 bg-white/60 rounded-2xl border-2 border-transparent hover:border-[#c8a863] transition-all">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-[#105330]" />
                    <p className="text-sm text-[#105330] font-medium">עוד 30 שנים</p>
                  </div>
                  <p className="text-2xl font-bold text-[#105330]">
                    ₪{projectedIn30Years.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Custom year selector */}
              <div className="p-4 bg-white/80 rounded-2xl border border-[#105330]/20">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#c8a863]" />
                    <span className="font-semibold text-[#105330]">חישוב לשנה ספציפית:</span>
                  </div>
                  <Select value={selectedYears} onValueChange={setSelectedYears}>
                    <SelectTrigger className="w-40 border-[#105330]/30 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 40 }, (_, i) => i + 1).map(year => (
                        <SelectItem key={year} value={year.toString()}>עוד {year} שנים</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex-1 text-left">
                    <span className="text-2xl font-bold text-[#c8a863]">
                      ₪{projectedInSelectedYears.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end">
          <Button 
            onClick={() => saveMutation.mutate({ gender, fundType, data: formData })}
            disabled={saveMutation.isPending}
            className="bg-gradient-to-r from-[#105330] to-[#1a7a4a] hover:from-[#0d4027] hover:to-[#105330] shadow-xl px-8 py-6 rounded-xl text-lg font-bold"
          >
            <Save className="w-5 h-5 ml-2" />
            {saveMutation.isPending ? 'שומר...' : 'שמור'}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Gender Selection */}
      <Tabs value={activeGender} onValueChange={setActiveGender} className="space-y-6">
        <TabsList className="grid grid-cols-2 w-full max-w-xs bg-[#105330]/10 p-1.5 rounded-2xl">
          <TabsTrigger 
            value="male" 
            className="rounded-xl data-[state=active]:bg-[#105330] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-semibold"
          >
            <User className="w-4 h-4 ml-2" />
            גבר
          </TabsTrigger>
          <TabsTrigger 
            value="female"
            className="rounded-xl data-[state=active]:bg-[#105330] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-semibold"
          >
            <Users className="w-4 h-4 ml-2" />
            אישה
          </TabsTrigger>
        </TabsList>

        <TabsContent value="male">
          <Card className="border-0 shadow-2xl bg-white/95 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[#105330] via-[#1a7a4a] to-[#c8a863]" />
            <CardHeader className="border-b border-[#105330]/10">
              <CardTitle className="text-[#105330]">פנסיוני - גבר</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Tabs value={activeFund} onValueChange={setActiveFund}>
                <TabsList className="mb-6 bg-[#105330]/10 p-1 rounded-xl">
                  <TabsTrigger value="pension" className="rounded-lg data-[state=active]:bg-[#105330] data-[state=active]:text-white font-semibold px-6">פנסיה</TabsTrigger>
                  <TabsTrigger value="keren_hishtalmut" className="rounded-lg data-[state=active]:bg-[#105330] data-[state=active]:text-white font-semibold px-6">קרן השתלמות</TabsTrigger>
                </TabsList>
                <TabsContent value="pension">
                  <PensionForm gender="male" fundType="pension" />
                </TabsContent>
                <TabsContent value="keren_hishtalmut">
                  <PensionForm gender="male" fundType="keren_hishtalmut" />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="female">
          <Card className="border-0 shadow-2xl bg-white/95 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[#105330] via-[#1a7a4a] to-[#c8a863]" />
            <CardHeader className="border-b border-[#105330]/10">
              <CardTitle className="text-[#105330]">פנסיוני - אישה</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Tabs value={activeFund} onValueChange={setActiveFund}>
                <TabsList className="mb-6 bg-[#105330]/10 p-1 rounded-xl">
                  <TabsTrigger value="pension" className="rounded-lg data-[state=active]:bg-[#105330] data-[state=active]:text-white font-semibold px-6">פנסיה</TabsTrigger>
                  <TabsTrigger value="keren_hishtalmut" className="rounded-lg data-[state=active]:bg-[#105330] data-[state=active]:text-white font-semibold px-6">קרן השתלמות</TabsTrigger>
                </TabsList>
                <TabsContent value="pension">
                  <PensionForm gender="female" fundType="pension" />
                </TabsContent>
                <TabsContent value="keren_hishtalmut">
                  <PensionForm gender="female" fundType="keren_hishtalmut" />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}