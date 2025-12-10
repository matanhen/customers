import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, ChevronDown, ChevronUp, Wallet, Building2, Car, TrendingUp, Coins, CreditCard, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CashFlowSection from './CashFlowSection';

const ASSET_CATEGORIES = {
  cash: {
    title: 'מזומנים',
    icon: Wallet,
    color: 'emerald',
    items: ['עובר ושב 1', 'עובר ושב 2', 'קרן ביטחון', 'חיסכון חלומות'],
    fields: ['value']
  },
  real_estate: {
    title: 'נדל״ן',
    icon: Building2,
    color: 'blue',
    items: ['דירה למגורים', 'דירה להשקעה בארץ א׳', 'דירה להשקעה בארץ ב׳', 'נדל״ן בחו״ל'],
    fields: ['value', 'annual_appreciation', 'rental_income'],
    noRentalFor: ['דירה למגורים']
  },
  vehicles: {
    title: 'רכבים',
    icon: Car,
    color: 'orange',
    items: ['רכב 1', 'רכב 2', 'רכב 3'],
    fields: ['value']
  },
  stocks: {
    title: 'שוק ההון',
    icon: TrendingUp,
    color: 'purple',
    items: ['תיק השקעות עצמאי', 'קופת גמל להשקעה', 'חיסכון לילדים', 'קרן Reit'],
    fields: ['value', 'monthly_deposit', 'annual_return', 'management_fee']
  },
  alternative: {
    title: 'השקעות אלטרנטיביות',
    icon: Coins,
    color: 'pink',
    items: ['קריפטו', 'הלוואות חברתיות / השקעה בחוב'],
    fields: ['value', 'annual_return', 'management_fee']
  }
};

const LIABILITY_CATEGORIES = {
  real_estate: {
    title: 'נדל״ן',
    icon: Building2,
    color: 'red',
    items: ['משכנתא למגורים', 'הלוואה דירה למגורים', 'משכנתא דירה להשקעה א׳', 'משכנתא דירה להשקעה ב׳', 'משכנתא דירה בחו״ל', 'הלוואה דירה להשקעה']
  },
  vehicles: {
    title: 'רכבים',
    icon: Car,
    color: 'red',
    items: ['הלוואה לרכישת רכב']
  },
  pension: {
    title: 'פנסיוני',
    icon: TrendingUp,
    color: 'red',
    items: ['הלוואה כנגד פנסיה', 'הלוואה כנגד קרן השתלמות']
  },
  general: {
    title: 'הלוואות כלליות',
    icon: CreditCard,
    color: 'red',
    items: ['הלוואה מהבנק א׳', 'הלוואה מהבנק ב׳', 'הלוואה מהבנק ג׳', 'התחייבות בכרטיס אשראי']
  }
};

export default function AssetsLiabilitiesTable({ userId, planType }) {
  const [openSections, setOpenSections] = useState({});
  const [formData, setFormData] = useState({
    monthly_salary: 0,
    rent_expense: 0,
    keren_withdrawal_option: 'none',
    assets: {},
    liabilities: {}
  });
  const queryClient = useQueryClient();

  const { data: plan, isLoading } = useQuery({
    queryKey: ['financialPlan', userId, planType],
    queryFn: async () => {
      const results = await base44.entities.FinancialPlan.filter({ user_id: userId, plan_type: planType });
      return results[0];
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (plan) {
      setFormData({
        monthly_salary: plan.monthly_salary || 0,
        rent_expense: plan.rent_expense || 0,
        keren_withdrawal_option: plan.liquidate_keren_hishtalmut ? 'at_target' : (plan.keren_withdrawal_option || 'none'),
        assets: plan.assets || {},
        liabilities: plan.liabilities || {}
      });
    } else {
      setFormData({
        monthly_salary: 0,
        rent_expense: 0,
        keren_withdrawal_option: 'none',
        assets: {},
        liabilities: {}
      });
    }
  }, [plan]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        user_id: userId,
        plan_type: planType,
        monthly_salary: formData.monthly_salary,
        rent_expense: formData.rent_expense,
        liquidate_keren_hishtalmut: formData.keren_withdrawal_option === 'at_target',
        keren_withdrawal_option: formData.keren_withdrawal_option,
        assets: formData.assets,
        liabilities: formData.liabilities
      };
      if (plan) {
        return base44.entities.FinancialPlan.update(plan.id, data);
      }
      return base44.entities.FinancialPlan.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financialPlan', userId, planType] });
      queryClient.invalidateQueries({ queryKey: ['allFinancialPlans', userId] });
    },
  });

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const updateAsset = (category, item, field, value) => {
    setFormData(prev => ({
      ...prev,
      assets: {
        ...prev.assets,
        [category]: {
          ...(prev.assets[category] || {}),
          [item]: {
            ...(prev.assets[category]?.[item] || {}),
            [field]: parseFloat(value) || 0
          }
        }
      }
    }));
  };

  const updateLiability = (category, item, field, value) => {
    setFormData(prev => ({
      ...prev,
      liabilities: {
        ...prev.liabilities,
        [category]: {
          ...(prev.liabilities[category] || {}),
          [item]: {
            ...(prev.liabilities[category]?.[item] || {}),
            [field]: field === 'end_date' ? value : (parseFloat(value) || 0)
          }
        }
      }
    }));
  };

  const calculateCategoryTotal = (category, type) => {
    const data = type === 'assets' ? formData.assets : formData.liabilities;
    const field = type === 'assets' ? 'value' : 'total_debt';
    let total = 0;
    if (data[category]) {
      Object.values(data[category]).forEach(item => {
        total += item[field] || item.value || 0;
      });
    }
    return total;
  };

  const calculateTotalAssets = () => {
    let total = 0;
    Object.keys(ASSET_CATEGORIES).forEach(cat => {
      total += calculateCategoryTotal(cat, 'assets');
    });
    return total;
  };

  const calculateTotalLiabilities = () => {
    let total = 0;
    Object.keys(LIABILITY_CATEGORIES).forEach(cat => {
      if (formData.liabilities[cat]) {
        Object.values(formData.liabilities[cat]).forEach(item => {
          total += item.total_debt || 0;
        });
      }
    });
    return total;
  };

  const netWorth = calculateTotalAssets() - calculateTotalLiabilities();

  return (
    <div className="space-y-6">
      {/* Keren Hishtalmut Options */}
      <Card className="border-0 shadow-xl bg-white/95 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-[#105330] via-[#1a7a4a] to-[#c8a863]" />
        <CardHeader>
          <CardTitle className="text-[#105330]">אופציות קרן השתלמות</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, keren_withdrawal_option: 'at_target' })}
                className={`p-4 rounded-xl border-2 text-right transition-all duration-300 ${
                  formData.keren_withdrawal_option === 'at_target'
                    ? 'border-[#c8a863] bg-[#c8a863]/10 shadow-lg'
                    : 'border-[#105330]/20 hover:border-[#105330]/40 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                    formData.keren_withdrawal_option === 'at_target'
                      ? 'border-[#c8a863] bg-[#c8a863]'
                      : 'border-[#105330]/30'
                  }`}>
                    {formData.keren_withdrawal_option === 'at_target' && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div>
                    <p className={`font-bold ${formData.keren_withdrawal_option === 'at_target' ? 'text-[#105330]' : 'text-slate-700'}`}>
                      לממש קרן השתלמות בגיל היעד
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      הכסף יכלל בחישוב ההכנסה הפאסיבית
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, keren_withdrawal_option: 'every_6_years' })}
                className={`p-4 rounded-xl border-2 text-right transition-all duration-300 ${
                  formData.keren_withdrawal_option === 'every_6_years'
                    ? 'border-[#c8a863] bg-[#c8a863]/10 shadow-lg'
                    : 'border-[#105330]/20 hover:border-[#105330]/40 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                    formData.keren_withdrawal_option === 'every_6_years'
                      ? 'border-[#c8a863] bg-[#c8a863]'
                      : 'border-[#105330]/30'
                  }`}>
                    {formData.keren_withdrawal_option === 'every_6_years' && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div>
                    <p className={`font-bold ${formData.keren_withdrawal_option === 'every_6_years' ? 'text-[#105330]' : 'text-slate-700'}`}>
                      משיכת קרן השתלמות כל 6 שנים
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      הכסף לא יכלל בחישוב ההכנסה הפאסיבית
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assets */}
      <Card className="border-0 shadow-xl bg-white/95 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-[#105330] to-[#1a7a4a]" />
        <CardHeader>
          <CardTitle className="text-[#105330] flex items-center justify-between">
            <span>נכסים</span>
            <span className="text-[#1a7a4a]">סה״כ: ₪{calculateTotalAssets().toLocaleString()}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(ASSET_CATEGORIES).map(([key, category]) => {
            const Icon = category.icon;
            const categoryTotal = calculateCategoryTotal(key, 'assets');
            return (
              <Collapsible key={key} open={openSections[`asset_${key}`]} onOpenChange={() => toggleSection(`asset_${key}`)}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-[#105330]/5 rounded-xl hover:bg-[#105330]/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-[#105330]" />
                    <span className="font-semibold text-[#105330]">{category.title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-[#105330]">₪{categoryTotal.toLocaleString()}</span>
                    {openSections[`asset_${key}`] ? <ChevronUp className="w-4 h-4 text-[#105330]" /> : <ChevronDown className="w-4 h-4 text-[#105330]" />}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-3">
                  {category.items.map((item) => {
                    const showRental = key === 'real_estate' && !category.noRentalFor?.includes(item);
                    return (
                      <div key={item} className="p-4 bg-[#105330]/5 rounded-xl border border-[#105330]/10">
                        <div className="font-medium text-[#105330] mb-3">{item}</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs text-[#105330]/70">שווי</Label>
                            <Input
                              type="number"
                              value={formData.assets[key]?.[item]?.value || ''}
                              onChange={(e) => updateAsset(key, item, 'value', e.target.value)}
                              className="rounded-lg border-[#105330]/20"
                            />
                          </div>
                          {category.fields.includes('monthly_deposit') && (
                            <div>
                              <Label className="text-xs text-[#105330]/70">הפקדה חודשית</Label>
                              <Input
                                type="number"
                                value={formData.assets[key]?.[item]?.monthly_deposit || ''}
                                onChange={(e) => updateAsset(key, item, 'monthly_deposit', e.target.value)}
                                className="rounded-lg border-[#105330]/20"
                              />
                            </div>
                          )}
                          {category.fields.includes('annual_return') && (
                            <div>
                              <Label className="text-xs text-[#105330]/70">תשואה שנתית %</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={formData.assets[key]?.[item]?.annual_return || ''}
                                onChange={(e) => updateAsset(key, item, 'annual_return', e.target.value)}
                                className="rounded-lg border-[#105330]/20"
                              />
                            </div>
                          )}
                          {category.fields.includes('management_fee') && (
                            <div>
                              <Label className="text-xs text-[#105330]/70">דמי ניהול %</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={formData.assets[key]?.[item]?.management_fee || ''}
                                onChange={(e) => updateAsset(key, item, 'management_fee', e.target.value)}
                                className="rounded-lg border-[#105330]/20"
                              />
                            </div>
                          )}
                          {category.fields.includes('annual_appreciation') && (
                            <div>
                              <Label className="text-xs text-[#105330]/70">עליית ערך שנתית %</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={formData.assets[key]?.[item]?.annual_appreciation || ''}
                                onChange={(e) => updateAsset(key, item, 'annual_appreciation', e.target.value)}
                                className="rounded-lg border-[#105330]/20"
                              />
                            </div>
                          )}
                          {showRental && (
                            <div>
                              <Label className="text-xs text-[#105330]/70">הכנסה משכירות</Label>
                              <Input
                                type="number"
                                value={formData.assets[key]?.[item]?.rental_income || ''}
                                onChange={(e) => updateAsset(key, item, 'rental_income', e.target.value)}
                                className="rounded-lg border-[#105330]/20"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </CardContent>
      </Card>

      {/* Liabilities */}
      <Card className="border-0 shadow-xl bg-white/95 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-red-500 to-rose-500" />
        <CardHeader>
          <CardTitle className="text-slate-800 flex items-center justify-between">
            <span>התחייבויות</span>
            <span className="text-red-600">סה״כ: ₪{calculateTotalLiabilities().toLocaleString()}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(LIABILITY_CATEGORIES).map(([key, category]) => {
            const Icon = category.icon;
            return (
              <Collapsible key={key} open={openSections[`liability_${key}`]} onOpenChange={() => toggleSection(`liability_${key}`)}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-slate-600" />
                    <span className="font-semibold text-slate-700">{category.title}</span>
                  </div>
                  {openSections[`liability_${key}`] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-3">
                  {category.items.map((item) => (
                    <div key={item} className="p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                      <div className="font-medium text-slate-700 mb-3">{item}</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs text-slate-500">סך החוב</Label>
                          <Input
                            type="number"
                            value={formData.liabilities[key]?.[item]?.total_debt || ''}
                            onChange={(e) => updateLiability(key, item, 'total_debt', e.target.value)}
                            className="rounded-lg"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">החזר חודשי</Label>
                          <Input
                            type="number"
                            value={formData.liabilities[key]?.[item]?.monthly_payment || ''}
                            onChange={(e) => updateLiability(key, item, 'monthly_payment', e.target.value)}
                            className="rounded-lg"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">ריבית %</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={formData.liabilities[key]?.[item]?.interest_rate || ''}
                            onChange={(e) => updateLiability(key, item, 'interest_rate', e.target.value)}
                            className="rounded-lg"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">תאריך סיום</Label>
                          <Input
                            type="date"
                            value={formData.liabilities[key]?.[item]?.end_date || ''}
                            onChange={(e) => updateLiability(key, item, 'end_date', e.target.value)}
                            className="rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="border-0 shadow-2xl bg-gradient-to-br from-[#105330] via-[#0d4027] to-[#105330] overflow-hidden">
        <CardContent className="p-8">
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6">
              <p className="text-white/80 text-sm font-medium">סה״כ נכסים</p>
              <p className="text-3xl font-bold text-white mt-2">₪{calculateTotalAssets().toLocaleString()}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6">
              <p className="text-white/80 text-sm font-medium">סה״כ התחייבויות</p>
              <p className="text-3xl font-bold text-white mt-2">₪{calculateTotalLiabilities().toLocaleString()}</p>
            </div>
            <div className="bg-[#c8a863]/30 backdrop-blur-sm rounded-2xl p-6">
              <p className="text-[#c8a863] text-sm font-medium">שווי נקי</p>
              <p className={`text-3xl font-bold mt-2 ${netWorth >= 0 ? 'text-[#c8a863]' : 'text-red-300'}`}>
                ₪{netWorth.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="bg-gradient-to-r from-[#105330] to-[#1a7a4a] hover:from-[#0d4027] hover:to-[#105330] shadow-xl px-10 py-6 text-lg font-bold rounded-xl"
        >
          <Save className="w-5 h-5 ml-2" />
          {saveMutation.isPending ? 'שומר...' : 'שמור תכנון'}
        </Button>
      </div>

      {/* Cash Flow Section */}
      <CashFlowSection userId={userId} planType={planType} />
    </div>
  );
}