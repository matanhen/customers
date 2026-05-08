import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Wallet, Building2, Car, TrendingUp, Coins } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Same asset categories as in AssetsLiabilitiesTable (FinancialFreedom)
const ASSET_CATEGORIES = {
  cash: {
    title: 'מזומנים',
    icon: Wallet,
    items: ['עובר ושב 1', 'עובר ושב 2', 'קרן ביטחון', 'חיסכון חלומות'],
    fields: ['value']
  },
  real_estate: {
    title: 'נדל״ן',
    icon: Building2,
    items: ['דירה למגורים', 'דירה להשקעה בארץ א׳', 'דירה להשקעה בארץ ב׳', 'נדל״ן בחו״ל'],
    fields: ['value', 'annual_appreciation', 'rental_income'],
    noRentalFor: ['דירה למגורים']
  },
  vehicles: {
    title: 'רכבים',
    icon: Car,
    items: ['רכב 1', 'רכב 2', 'רכב 3'],
    fields: ['value']
  },
  stocks: {
    title: 'שוק ההון',
    icon: TrendingUp,
    items: ['תיק השקעות עצמאי', 'קופת גמל להשקעה', 'חיסכון לילדים', 'קרן Reit'],
    fields: ['value', 'monthly_deposit', 'annual_return', 'management_fee']
  },
  alternative: {
    title: 'השקעות אלטרנטיביות',
    icon: Coins,
    items: ['קריפטו', 'הלוואות חברתיות / השקעה בחוב'],
    fields: ['value', 'annual_return', 'management_fee']
  }
};

export default function AssetsManager({ userId }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [openSections, setOpenSections] = useState({});
  const [assets, setAssets] = useState({});
  const [dataLoaded, setDataLoaded] = useState(false);
  const autoSaveTimer = React.useRef(null);
  const queryClient = useQueryClient();

  const isAdvisorOrAdmin = currentUser?.user_type === 'advisor' || currentUser?.user_type === 'admin';
  const isViewingOther = !!currentUser && currentUser.id !== userId;

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, [userId]);

  const { data: plan } = useQuery({
    queryKey: ['financialPlan_assets', userId, currentUser?.id],
    queryFn: async () => {
      if (isViewingOther && isAdvisorOrAdmin) {
        const response = await base44.functions.invoke('getClientData', {
          clientUserId: userId,
          entityName: 'FinancialPlan'
        });
        const plans = response.data?.data || [];
        return plans.find(p => p.plan_type === 'current');
      }
      const results = await base44.entities.FinancialPlan.filter({ user_id: userId, plan_type: 'current' });
      return results[0];
    },
    enabled: !!userId && !!currentUser,
  });

  useEffect(() => {
    if (plan) {
      setAssets(plan.assets || {});
    } else {
      setAssets({});
    }
    setDataLoaded(true);
  }, [plan]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        user_id: userId,
        plan_type: 'current',
        assets,
        // preserve existing fields
        monthly_salary: plan?.monthly_salary || 0,
        rent_expense: plan?.rent_expense || 0,
        fixed_expenses: plan?.fixed_expenses || 0,
        variable_expenses: plan?.variable_expenses || 0,
        liabilities: plan?.liabilities || {},
        keren_withdrawal_option: plan?.keren_withdrawal_option || 'none',
        liquidate_keren_hishtalmut: plan?.liquidate_keren_hishtalmut || false,
      };
      if (isViewingOther && isAdvisorOrAdmin) {
        await base44.functions.invoke('saveClientData', {
          entityName: 'FinancialPlan',
          clientUserId: userId,
          data,
          recordId: plan?.id || null
        });
        return;
      }
      if (plan) {
        return base44.entities.FinancialPlan.update(plan.id, data);
      }
      return base44.entities.FinancialPlan.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financialPlan_assets', userId, currentUser?.id] });
    },
  });

  const triggerAutoSave = () => {
    if (!dataLoaded) return;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveMutation.mutate();
    }, 1500);
  };

  const toggleSection = (key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateAsset = (category, item, field, value) => {
    setAssets(prev => ({
      ...prev,
      [category]: {
        ...(prev[category] || {}),
        [item]: {
          ...(prev[category]?.[item] || {}),
          [field]: parseFloat(value) || 0
        }
      }
    }));
    triggerAutoSave();
  };

  const calculateCategoryTotal = (catKey) => {
    let total = 0;
    if (assets[catKey]) {
      Object.values(assets[catKey]).forEach(item => {
        total += item.value || 0;
      });
    }
    return total;
  };

  const totalAssets = Object.keys(ASSET_CATEGORIES).reduce((sum, k) => sum + calculateCategoryTotal(k), 0);

  return (
    <div className="space-y-6" dir="rtl">
      <Card className="border-0 shadow-xl bg-white/95 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-[#105330] to-[#1a7a4a]" />
        <CardHeader>
          <CardTitle className="text-[#105330] flex items-center justify-between">
            <span>נכסים</span>
            <span className="text-[#1a7a4a]">סה״כ: ₪{totalAssets.toLocaleString()}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(ASSET_CATEGORIES).map(([key, category]) => {
            const Icon = category.icon;
            const catTotal = calculateCategoryTotal(key);
            return (
              <Collapsible key={key} open={openSections[key]} onOpenChange={() => toggleSection(key)}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-[#105330]/5 rounded-xl hover:bg-[#105330]/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-[#105330]" />
                    <span className="font-semibold text-[#105330]">{category.title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-[#105330]">₪{catTotal.toLocaleString()}</span>
                    {openSections[key] ? <ChevronUp className="w-4 h-4 text-[#105330]" /> : <ChevronDown className="w-4 h-4 text-[#105330]" />}
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
                              value={assets[key]?.[item]?.value || ''}
                              onChange={(e) => updateAsset(key, item, 'value', e.target.value)}
                              className="rounded-lg border-[#105330]/20"
                            />
                          </div>
                          {category.fields.includes('monthly_deposit') && (
                            <div>
                              <Label className="text-xs text-[#105330]/70">הפקדה חודשית</Label>
                              <Input
                                type="number"
                                value={assets[key]?.[item]?.monthly_deposit || ''}
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
                                value={assets[key]?.[item]?.annual_return || ''}
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
                                value={assets[key]?.[item]?.management_fee || ''}
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
                                value={assets[key]?.[item]?.annual_appreciation || ''}
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
                                value={assets[key]?.[item]?.rental_income || ''}
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


    </div>
  );
}