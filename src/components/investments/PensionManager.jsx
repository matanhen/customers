import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Users, Calendar, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FormattedNumberInput from '@/components/ui/FormattedNumberInput';

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

  if (yearsFromNow !== null) {
    const yearsWithDeposits = Math.min(yearsFromNow, Math.max(0, stopDepositsAge - currentAge));
    const monthsWithDeposits = yearsWithDeposits * 12;
    let amount = currentAmount;
    for (let i = 0; i < monthsWithDeposits; i++) {
      amount = amount * (1 + monthlyReturn) + effectiveDeposit;
    }
    const remainingMonths = (yearsFromNow * 12) - monthsWithDeposits;
    for (let i = 0; i < remainingMonths; i++) {
      amount = amount * (1 + monthlyReturn);
    }
    return Math.round(amount);
  }

  const yearsWithDeposits = Math.max(0, stopDepositsAge - currentAge);
  const monthsWithDeposits = yearsWithDeposits * 12;
  let amountAfterDeposits = currentAmount;
  for (let i = 0; i < monthsWithDeposits; i++) {
    amountAfterDeposits = amountAfterDeposits * (1 + monthlyReturn) + effectiveDeposit;
  }
  const yearsWithoutDeposits = Math.max(0, retirementAge - stopDepositsAge);
  let finalAmount = amountAfterDeposits;
  for (let i = 0; i < yearsWithoutDeposits * 12; i++) {
    finalAmount = finalAmount * (1 + monthlyReturn);
  }
  return Math.round(finalAmount);
};

const defaultFundData = {
  current_age: 30,
  retirement_age: 67,
  stop_deposits_age: 67,
  current_amount: 0,
  monthly_deposit: 0,
  management_fee_deposit: 0,
  management_fee_savings: 0,
  annual_return: 5,
};

// PensionForm is defined OUTSIDE the parent to prevent re-creation on every render
function PensionForm({ gender, fundType, initialData, onSave }) {
  const [formData, setFormData] = useState(initialData || defaultFundData);
  const [selectedYears, setSelectedYears] = useState('10');
  const autoSaveTimer = useRef(null);
  const isDirty = useRef(false);

  // Only sync from parent when not actively editing
  useEffect(() => {
    if (!isDirty.current) {
      setFormData(initialData || defaultFundData);
    }
  }, [initialData]);

  const handleChange = (field, rawValue) => {
    // Allow typing decimals like "0." or "1.1" without immediately losing the dot
    const isAgeField = field === 'current_age' || field === 'retirement_age' || field === 'stop_deposits_age';
    // Store raw string in form while typing, parse to number for saving
    const parsed = rawValue === '' ? '' : isAgeField ? parseInt(rawValue) : parseFloat(rawValue);
    const displayValue = rawValue; // keep raw string so "0." doesn't jump to "0"
    const saveValue = (rawValue === '' || isNaN(parsed)) ? 0 : parsed;

    const newData = { ...formData, [field]: rawValue === '' ? '' : (isAgeField ? (isNaN(parseInt(rawValue)) ? 0 : parseInt(rawValue)) : rawValue) };
    setFormData(newData);
    isDirty.current = true;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      isDirty.current = false;
      // When saving, parse all numeric fields properly
      const dataToSave = {
        ...newData,
        [field]: isAgeField ? (parseInt(rawValue) || 0) : (parseFloat(rawValue) || 0),
      };
      onSave({ gender, fundType, data: dataToSave });
    }, 1500);
  };

  const getNumericValue = (val) => {
    if (val === '' || val === undefined || val === null) return '';
    // Return as-is to allow decimal input like "0." mid-typing
    return val;
  };

  const projectedAmount = calculateProjectedAmount(formData);
  const yearsToRetirement = (formData.retirement_age || 67) - (formData.current_age || 30);
  const monthlyPension = fundType === 'pension' ? Math.round(projectedAmount / 210) : 0;
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
            value={getNumericValue(formData.current_age)}
            onChange={(e) => handleChange('current_age', e.target.value)}
            className="border-[#105330]/30 focus:border-[#105330] focus:ring-[#105330]/20 rounded-xl"
          />
        </div>
        {isPension && (
          <>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#105330]">גיל פנסיה</Label>
              <Input
                type="number"
                value={getNumericValue(formData.retirement_age)}
                onChange={(e) => handleChange('retirement_age', e.target.value)}
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
            value={getNumericValue(formData.stop_deposits_age)}
            onChange={(e) => handleChange('stop_deposits_age', e.target.value)}
            className="border-[#105330]/30 focus:border-[#105330] focus:ring-[#105330]/20 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-[#105330]">סכום נוכחי</Label>
          <FormattedNumberInput
            value={getNumericValue(formData.current_amount)}
            onChange={(val) => handleChange('current_amount', String(val))}
            className="border-[#105330]/30 focus:border-[#105330] focus:ring-[#105330]/20 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-[#105330]">הפקדה חודשית</Label>
          <FormattedNumberInput
            value={getNumericValue(formData.monthly_deposit)}
            onChange={(val) => handleChange('monthly_deposit', String(val))}
            className="border-[#105330]/30 focus:border-[#105330] focus:ring-[#105330]/20 rounded-xl"
          />
        </div>
        {isPension && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-[#105330]">דמי ניהול מהפקדה (%)</Label>
            <Input
              type="number"
              step="0.01"
              value={getNumericValue(formData.management_fee_deposit)}
              onChange={(e) => handleChange('management_fee_deposit', e.target.value)}
              className="border-[#105330]/30 focus:border-[#105330] focus:ring-[#105330]/20 rounded-xl"
            />
          </div>
        )}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-[#105330]">דמי ניהול מחיסכון (%)</Label>
          <Input
            type="number"
            step="0.01"
            value={getNumericValue(formData.management_fee_savings)}
            onChange={(e) => handleChange('management_fee_savings', e.target.value)}
            className="border-[#105330]/30 focus:border-[#105330] focus:ring-[#105330]/20 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-[#105330]">תשואה שנתית (%)</Label>
          <Input
            type="number"
            step="0.1"
            value={getNumericValue(formData.annual_return)}
            onChange={(e) => handleChange('annual_return', e.target.value)}
            className="border-[#105330]/30 focus:border-[#105330] focus:ring-[#105330]/20 rounded-xl"
          />
        </div>
      </div>

      {isPension ? (
        <Card className="bg-gradient-to-br from-[#105330]/10 via-[#105330]/5 to-[#c8a863]/10 border-[#105330]/20 shadow-xl">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="text-center p-4 bg-white/60 rounded-2xl">
                <p className="text-sm text-[#105330] font-medium mb-2">סכום צפוי בגיל פנסיה</p>
                <p className="text-3xl font-bold text-[#105330]">₪{projectedAmount.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-white/60 rounded-2xl">
                <p className="text-sm text-[#105330] font-medium mb-2">קצבה חודשית משוערת</p>
                <p className="text-3xl font-bold text-[#c8a863]">₪{monthlyPension.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gradient-to-br from-[#105330]/10 via-[#105330]/5 to-[#c8a863]/10 border-[#105330]/20 shadow-xl">
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-3 gap-4">
              {[{ label: 'עוד 10 שנים', val: projectedIn10Years }, { label: 'עוד 20 שנים', val: projectedIn20Years }, { label: 'עוד 30 שנים', val: projectedIn30Years }].map(({ label, val }) => (
                <div key={label} className="text-center p-4 bg-white/60 rounded-2xl border-2 border-transparent hover:border-[#c8a863] transition-all">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-[#105330]" />
                    <p className="text-sm text-[#105330] font-medium">{label}</p>
                  </div>
                  <p className="text-2xl font-bold text-[#105330]">₪{val.toLocaleString()}</p>
                </div>
              ))}
            </div>
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
                  <span className="text-2xl font-bold text-[#c8a863]">₪{projectedInSelectedYears.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function PensionManager({ userId }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeGender, setActiveGender] = useState('male');
  const [activeFund, setActiveFund] = useState('pension');
  const queryClient = useQueryClient();

  const isAdvisorOrAdmin = currentUser?.user_type === 'advisor' || currentUser?.user_type === 'admin';
  const isViewingOther = !!currentUser && currentUser.id !== userId;

  const viewingClientEmail = (() => {
    try { return JSON.parse(sessionStorage.getItem('viewingClient') || '{}').email || null; } catch { return null; }
  })();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, [userId]);

  const queryKey = ['pensionData', userId, currentUser?.id, isViewingOther, isAdvisorOrAdmin];

  const { data: pensionData = [] } = useQuery({
    queryKey,
    queryFn: async () => {
      if (isViewingOther && isAdvisorOrAdmin) {
        const response = await base44.functions.invoke('getClientData', { clientUserId: userId, clientEmail: viewingClientEmail, entityName: 'PensionData' });
        return response.data.data;
      }
      return base44.entities.PensionData.filter({ user_id: userId });
    },
    enabled: !!userId && !!currentUser,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

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
        return { ...response.data, gender, fund_type: fundType };
      }
      if (existing) {
        return base44.entities.PensionData.update(existing.id, data);
      }
      return base44.entities.PensionData.create(fullData);
    },
    onSuccess: (result) => {
      if (result?.id) {
        queryClient.setQueryData(queryKey, (old = []) => {
          const exists = old.find(p => p.id === result.id);
          if (exists) return old.map(p => p.id === result.id ? { ...p, ...result } : p);
          return [...old, result];
        });
      }
    },
  });

  const getFundData = (gender, fundType) => {
    return pensionData.find(p => p.gender === gender && p.fund_type === fundType) || defaultFundData;
  };

  const handleSave = useCallback((args) => {
    saveMutation.mutate(args);
  }, [saveMutation]);

  const renderTabs = (gender) => (
    <Tabs value={activeFund} onValueChange={setActiveFund}>
      <TabsList className="mb-6 bg-[#105330]/10 p-1 rounded-xl">
        <TabsTrigger value="pension" className="rounded-lg data-[state=active]:bg-[#105330] data-[state=active]:text-white font-semibold px-4">פנסיה</TabsTrigger>
        <TabsTrigger value="keren_hishtalmut" className="rounded-lg data-[state=active]:bg-[#105330] data-[state=active]:text-white font-semibold px-4">קרן השתלמות</TabsTrigger>
        <TabsTrigger value="kupat_gemel" className="rounded-lg data-[state=active]:bg-[#105330] data-[state=active]:text-white font-semibold px-4">קופת גמל</TabsTrigger>
      </TabsList>
      <TabsContent value="pension">
        <PensionForm
          key={`${gender}-pension`}
          gender={gender}
          fundType="pension"
          initialData={getFundData(gender, 'pension')}
          onSave={handleSave}
        />
      </TabsContent>
      <TabsContent value="keren_hishtalmut">
        <PensionForm
          key={`${gender}-keren_hishtalmut`}
          gender={gender}
          fundType="keren_hishtalmut"
          initialData={getFundData(gender, 'keren_hishtalmut')}
          onSave={handleSave}
        />
      </TabsContent>
      <TabsContent value="kupat_gemel">
        <PensionForm
          key={`${gender}-kupat_gemel`}
          gender={gender}
          fundType="kupat_gemel"
          initialData={getFundData(gender, 'kupat_gemel')}
          onSave={handleSave}
        />
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="space-y-6">
      <Tabs value={activeGender} onValueChange={setActiveGender} className="space-y-6">
        <TabsList className="grid grid-cols-2 w-full max-w-xs bg-[#105330]/10 p-1.5 rounded-2xl">
          <TabsTrigger value="male" className="rounded-xl data-[state=active]:bg-[#105330] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-semibold">
            <User className="w-4 h-4 ml-2" />גבר
          </TabsTrigger>
          <TabsTrigger value="female" className="rounded-xl data-[state=active]:bg-[#105330] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-semibold">
            <Users className="w-4 h-4 ml-2" />אישה
          </TabsTrigger>
        </TabsList>

        <TabsContent value="male">
          <Card className="border-0 shadow-2xl bg-white/95 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[#105330] via-[#1a7a4a] to-[#c8a863]" />
            <CardHeader className="border-b border-[#105330]/10">
              <CardTitle className="text-[#105330]">פנסיוני - גבר</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">{renderTabs('male')}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="female">
          <Card className="border-0 shadow-2xl bg-white/95 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[#105330] via-[#1a7a4a] to-[#c8a863]" />
            <CardHeader className="border-b border-[#105330]/10">
              <CardTitle className="text-[#105330]">פנסיוני - אישה</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">{renderTabs('female')}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}