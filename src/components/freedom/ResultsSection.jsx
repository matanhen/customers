import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Target, TrendingUp, Calendar, Award, AlertTriangle, CheckCircle, Home, Coins } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function ResultsSection({ userId }) {
  const [activePlan, setActivePlan] = useState('current');

  const planButtons = [
    { value: 'current', label: 'אם לא משנים כלום' },
    { value: 'plan_a', label: 'תכנון א׳' },
    { value: 'plan_b', label: 'תכנון ב׳' },
    { value: 'plan_c', label: 'תכנון ג׳' },
  ];

  const { data: goalSettings } = useQuery({
    queryKey: ['goalSettings', userId],
    queryFn: async () => {
      const results = await base44.entities.GoalSettings.filter({ user_id: userId });
      return results[0];
    },
    enabled: !!userId,
  });

  const { data: allPlans = [] } = useQuery({
    queryKey: ['allFinancialPlans', userId],
    queryFn: () => base44.entities.FinancialPlan.filter({ user_id: userId }),
    enabled: !!userId,
  });

  const { data: pensionData = [] } = useQuery({
    queryKey: ['pensionData', userId],
    queryFn: () => base44.entities.PensionData.filter({ user_id: userId }),
    enabled: !!userId,
  });

  const currentPlan = allPlans.find(p => p.plan_type === activePlan);
  const gender = goalSettings?.gender || 'male';
  const pensionInfo = pensionData.find(p => p.gender === gender && p.fund_type === 'pension');
  const kerenInfo = pensionData.find(p => p.gender === gender && p.fund_type === 'keren_hishtalmut');

  // Calculate pension allowance
  const calculatePensionAllowance = (data) => {
    if (!data) return 0;
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

    return Math.round(finalAmount / 210);
  };

  // Calculate results for a specific plan
  const calculatePlanResults = (plan) => {
    if (!goalSettings || !plan) return null;

    const currentAge = gender === 'male' 
      ? (goalSettings.male_current_age || pensionInfo?.current_age || 30)
      : (goalSettings.female_current_age || pensionInfo?.current_age || 30);
    const targetAge = goalSettings.target_age || 55;
    const targetPassiveIncome = goalSettings.passive_income_target || 15000;
    const targetAmount = goalSettings.target_amount || 2000000;
    const isFinancialFreedom = goalSettings.goal_type === 'financial_freedom';
    const retirementAge = pensionInfo?.retirement_age || 67;

    const monthlyPensionAllowance = calculatePensionAllowance(pensionInfo);

    const assets = plan.assets || {};
    const liabilities = plan.liabilities || {};

    // Calculate stock portfolio
    const stockAssets = assets.stocks || {};
    let totalStockValue = 0;
    let totalMonthlyDeposit = 0;
    let avgReturn = 7;

    Object.values(stockAssets).forEach(item => {
      totalStockValue += item.value || 0;
      totalMonthlyDeposit += item.monthly_deposit || 0;
      if (item.annual_return) avgReturn = item.annual_return;
    });

    // Alternative investments
    const altAssets = assets.alternative || {};
    let totalAltValue = 0;
    let altReturn = avgReturn;
    Object.values(altAssets).forEach(item => {
      totalAltValue += item.value || 0;
      if (item.annual_return) altReturn = item.annual_return;
    });

    // Keren Hishtalmut
    const kerenValue = kerenInfo?.current_amount || 0;
    const kerenMonthly = kerenInfo?.monthly_deposit || 0;
    const kerenReturn = kerenInfo?.annual_return || 5;
    const includeKeren = plan.keren_withdrawal_option === 'at_target';

    // Real estate
    const realEstateAssets = assets.real_estate || {};
    const realEstateLiabilities = liabilities.real_estate || {};
    
    const rentalProperties = [];
    let totalRealEstateValue = 0;
    Object.entries(realEstateAssets).forEach(([key, item]) => {
      totalRealEstateValue += item.value || 0;
      if (key !== 'דירה למגורים' && (item.rental_income || item.value)) {
        const mortgageKey = key.includes('א׳') ? 'משכנתא דירה להשקעה א׳' 
          : key.includes('ב׳') ? 'משכנתא דירה להשקעה ב׳' 
          : key.includes('חו״ל') ? 'משכנתא דירה בחו״ל' : null;
        
        const mortgage = mortgageKey ? realEstateLiabilities[mortgageKey] : null;
        rentalProperties.push({
          name: key,
          value: item.value || 0,
          monthlyRent: item.rental_income || 0,
          mortgagePayment: mortgage?.monthly_payment || 0,
          mortgageEndDate: mortgage?.end_date || null
        });
      }
    });

    const getNetRentalAtAge = (age) => {
      const yearsFromNow = age - currentAge;
      let totalNet = 0;
      
      rentalProperties.forEach(prop => {
        const appreciatedRent = prop.monthlyRent * Math.pow(1.025, yearsFromNow);
        
        let mortgagePayment = prop.mortgagePayment;
        if (prop.mortgageEndDate) {
          const endYear = new Date(prop.mortgageEndDate).getFullYear();
          const targetYear = new Date().getFullYear() + yearsFromNow;
          if (targetYear >= endYear) {
            mortgagePayment = 0;
          }
        }
        
        totalNet += appreciatedRent - mortgagePayment;
      });
      
      return Math.round(totalNet);
    };

    const getRealEstateValueAtAge = (age) => {
      const yearsFromNow = age - currentAge;
      return Math.round(totalRealEstateValue * Math.pow(1.025, yearsFromNow));
    };

    const effectiveReturn = (avgReturn - 0.5) / 100;
    const kerenEffectiveReturn = kerenReturn / 100;
    const postTargetReturn = 0.06; // 6% growth after stopping deposits

    let financialFreedomAge = 80;
    let canAchieveGoal = false;

    for (let testAge = currentAge + 1; testAge <= 80; testAge++) {
      const yearsToTest = testAge - currentAge;

      let stocksAtAge = totalStockValue;
      let altAtAge = totalAltValue;
      let kerenAtAge = kerenValue;

      for (let y = 0; y < yearsToTest; y++) {
        stocksAtAge = stocksAtAge * (1 + effectiveReturn) + (totalMonthlyDeposit * 12);
        altAtAge = altAtAge * (1 + effectiveReturn);
        if (includeKeren) {
          kerenAtAge = kerenAtAge * (1 + kerenEffectiveReturn) + (kerenMonthly * 12);
        }
      }

      // Check if at this age we can withdraw target income for all years until 80
      let canSustainFullIncome = true;
      let simStocks = stocksAtAge;
      let simAlt = altAtAge;
      let simKeren = includeKeren ? kerenAtAge : 0;

      for (let futureAge = testAge; futureAge <= 80; futureAge++) {
        const rental = getNetRentalAtAge(futureAge);
        const pension = futureAge >= retirementAge ? monthlyPensionAllowance : 0;
        const oldAge = futureAge >= 70 ? 2300 : 0;
        const fixedIncome = rental + pension + oldAge;
        
        const neededFromAssets = Math.max(0, targetPassiveIncome - fixedIncome);
        
        // Apply 6% annual growth (monthly)
        const monthlyGrowth = postTargetReturn / 12;
        for (let month = 0; month < 12; month++) {
          simStocks = simStocks * (1 + monthlyGrowth);
          simAlt = simAlt * (1 + monthlyGrowth);
          if (includeKeren) {
            simKeren = simKeren * (1 + monthlyGrowth);
          }
          
          // Check if we can withdraw the FULL target amount
          const totalAvailable = simStocks + simAlt + simKeren;
          if (totalAvailable < neededFromAssets) {
            canSustainFullIncome = false;
            break;
          }
          
          // Withdraw the full amount needed
          let monthlyNeed = neededFromAssets;
          
          if (simStocks >= monthlyNeed) {
            simStocks -= monthlyNeed;
          } else {
            monthlyNeed -= simStocks;
            simStocks = 0;
            
            if (simAlt >= monthlyNeed) {
              simAlt -= monthlyNeed;
            } else {
              monthlyNeed -= simAlt;
              simAlt = 0;
              
              if (simKeren >= monthlyNeed) {
                simKeren -= monthlyNeed;
              } else {
                canSustainFullIncome = false;
                break;
              }
            }
          }
        }
        
        if (!canSustainFullIncome) break;
      }

      if (canSustainFullIncome) {
        financialFreedomAge = testAge;
        canAchieveGoal = true;
        break;
      }
    }

    const yearsToFreedom = financialFreedomAge - currentAge;
    let projectedStocks = totalStockValue;
    let projectedAlt = totalAltValue;
    let projectedKeren = kerenValue;

    for (let y = 0; y < yearsToFreedom; y++) {
      projectedStocks = projectedStocks * (1 + effectiveReturn) + (totalMonthlyDeposit * 12);
      projectedAlt = projectedAlt * (1 + effectiveReturn);
      if (includeKeren) {
        projectedKeren = projectedKeren * (1 + kerenEffectiveReturn) + (kerenMonthly * 12);
      }
    }

    // Calculate detailed withdrawal plan - simulate actual withdrawals
    const withdrawalPlan = [];
    let tempStocks = projectedStocks;
    let tempAlt = projectedAlt;
    let tempKeren = includeKeren ? projectedKeren : 0;

    const ageRanges = [];
    if (financialFreedomAge < retirementAge) {
      ageRanges.push({ start: financialFreedomAge, end: retirementAge });
    }
    if (retirementAge < 70) {
      ageRanges.push({ start: retirementAge, end: 70 });
    }
    if (financialFreedomAge >= 70 || retirementAge >= 70) {
      ageRanges.push({ start: Math.max(financialFreedomAge, retirementAge, 70), end: 80 });
    }

    const filteredRanges = ageRanges.filter(r => r.start < r.end && r.start >= financialFreedomAge);

    for (const range of filteredRanges) {
      const yearsInRange = range.end - range.start;
      const monthsInRange = yearsInRange * 12;
      
      // Calculate fixed income for this age range
      const rental = getNetRentalAtAge(range.start);
      const pension = range.start >= retirementAge ? monthlyPensionAllowance : 0;
      const oldAge = range.start >= 70 ? 2300 : 0;
      const totalFixed = rental + pension + oldAge;
      
      const neededFromAssets = Math.max(0, targetPassiveIncome - totalFixed);
      
      const sources = [];
      
      if (rental > 0) {
        sources.push({ source: 'הכנסה נטו מדירה להשקעה', amount: Math.round(rental) });
      }
      if (pension > 0) {
        sources.push({ source: `קצבה חודשית מפנסיה (מגיל ${retirementAge})`, amount: pension });
      }
      if (oldAge > 0) {
        sources.push({ source: 'קצבת זקנה', amount: oldAge });
      }

      if (neededFromAssets > 0) {
        // Track total withdrawals from each source
        let totalFromStocks = 0;
        let totalFromAlt = 0;
        let totalFromKeren = 0;
        let monthCount = 0;
        
        let simStocks = tempStocks;
        let simAlt = tempAlt;
        let simKeren = tempKeren;
        
        const monthlyGrowth = 0.06 / 12;
        
        for (let month = 0; month < monthsInRange; month++) {
          // Apply growth
          simStocks = simStocks * (1 + monthlyGrowth);
          simAlt = simAlt * (1 + monthlyGrowth);
          if (includeKeren) {
            simKeren = simKeren * (1 + monthlyGrowth);
          }
          
          let monthlyNeed = neededFromAssets;
          
          // Withdraw from stocks
          if (simStocks > 0 && monthlyNeed > 0) {
            const fromStocks = Math.min(monthlyNeed, simStocks);
            simStocks -= fromStocks;
            totalFromStocks += fromStocks;
            monthlyNeed -= fromStocks;
          }
          
          // Then alt
          if (simAlt > 0 && monthlyNeed > 0) {
            const fromAlt = Math.min(monthlyNeed, simAlt);
            simAlt -= fromAlt;
            totalFromAlt += fromAlt;
            monthlyNeed -= fromAlt;
          }
          
          // Finally keren
          if (simKeren > 0 && includeKeren && monthlyNeed > 0) {
            const fromKeren = Math.min(monthlyNeed, simKeren);
            simKeren -= fromKeren;
            totalFromKeren += fromKeren;
            monthlyNeed -= fromKeren;
          }
          
          monthCount++;
        }
        
        // Calculate average monthly amounts
        if (monthCount > 0) {
          if (totalFromStocks > 0) {
            sources.push({ source: 'תיק השקעות / קופת גמל להשקעה', amount: Math.round(totalFromStocks / monthCount) });
          }
          if (totalFromAlt > 0) {
            sources.push({ source: 'השקעות אלטרנטיביות', amount: Math.round(totalFromAlt / monthCount) });
          }
          if (totalFromKeren > 0 && includeKeren) {
            sources.push({ source: 'קרן השתלמות', amount: Math.round(totalFromKeren / monthCount) });
          }
        }
        
        // Update for next range
        tempStocks = simStocks;
        tempAlt = simAlt;
        tempKeren = simKeren;
      }

      if (sources.length > 0) {
        const totalMonthly = sources.reduce((sum, s) => sum + s.amount, 0);
        withdrawalPlan.push({
          ageRange: `${range.start}-${range.end}`,
          sources,
          totalMonthly,
          meetsTarget: Math.abs(totalMonthly - targetPassiveIncome) < 100 || totalMonthly >= targetPassiveIncome
        });
      }
    }

    let homeSavingsPlan = null;
    if (!isFinancialFreedom) {
      const yearsToTarget = targetAge - currentAge;
      const currentSavings = totalStockValue + totalAltValue + kerenValue;
      const remaining = targetAmount - currentSavings;
      const monthsToTarget = yearsToTarget * 12;
      const monthlyReturn = avgReturn / 100 / 12;
      const monthlySavingsNeeded = remaining > 0 ? 
        remaining / (((Math.pow(1 + monthlyReturn, monthsToTarget) - 1) / monthlyReturn)) : 0;
      
      homeSavingsPlan = {
        currentSavings,
        targetAmount,
        remaining: Math.max(0, remaining),
        monthlySavingsNeeded: Math.round(monthlySavingsNeeded),
        yearsToTarget,
        canAchieve: currentSavings + (totalMonthlyDeposit * monthsToTarget * 1.5) >= targetAmount
      };
    }

    return {
      currentAge,
      targetAge,
      targetPassiveIncome,
      targetAmount,
      isFinancialFreedom,
      financialFreedomAge,
      canAchieveGoal,
      projectedStocks: Math.round(projectedStocks),
      projectedAlt: Math.round(projectedAlt),
      projectedKeren: includeKeren ? Math.round(projectedKeren) : 0,
      projectedRealEstate: getRealEstateValueAtAge(financialFreedomAge),
      monthlyPensionAllowance,
      netRentalIncome: getNetRentalAtAge(financialFreedomAge),
      withdrawalPlan,
      homeSavingsPlan,
      retirementAge,
      totalMonthlyDeposit
    };
  };

  const results = useMemo(() => calculatePlanResults(currentPlan), [currentPlan, goalSettings, pensionInfo, kerenInfo, gender]);

  const allResults = useMemo(() => {
    return planButtons.map(btn => {
      const plan = allPlans.find(p => p.plan_type === btn.value);
      if (!plan || !goalSettings) return { planType: btn.value, label: btn.label, achieveAge: 999 };
      
      const result = calculatePlanResults(plan);
      return { 
        planType: btn.value, 
        label: btn.label, 
        achieveAge: result?.financialFreedomAge || 999,
        canAchieve: result?.canAchieveGoal || false
      };
    });
  }, [allPlans, goalSettings, pensionInfo, kerenInfo, gender]);

  const bestPlan = allResults.reduce((best, current) => {
    if (current.canAchieve && (!best.canAchieve || current.achieveAge < best.achieveAge)) {
      return current;
    }
    if (!best.canAchieve && current.achieveAge < best.achieveAge) {
      return current;
    }
    return best;
  }, allResults[0]);

  if (!userId) {
    return <div className="text-center py-8 text-[#105330]">אנא התחבר למערכת</div>;
  }

  if (!goalSettings) {
    return (
      <Card className="border-0 shadow-xl bg-white/95">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-[#105330] mb-2">לא הוגדרה מטרה כלכלית</h3>
          <p className="text-[#105330]/70">אנא הגדר מטרה כלכלית בלשונית "תכנון" כדי לראות את התוצאות</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Plan Selection */}
      <div className="flex gap-2 p-2 bg-[#105330]/10 rounded-2xl flex-wrap">
        {planButtons.map((btn) => (
          <Button
            key={btn.value}
            type="button"
            onClick={() => setActivePlan(btn.value)}
            className={`flex-1 min-w-[120px] rounded-xl py-3 font-semibold transition-all duration-300 ${
              activePlan === btn.value 
                ? 'bg-[#105330] text-white shadow-xl' 
                : 'bg-transparent text-[#105330] hover:bg-[#105330]/10'
            }`}
          >
            {btn.label}
            {bestPlan?.planType === btn.value && (
              <Award className="w-4 h-4 mr-2 text-[#c8a863]" />
            )}
          </Button>
        ))}
      </div>

      {/* Best Plan */}
      {bestPlan && bestPlan.canAchieve && (
        <Card className="border-0 shadow-xl bg-gradient-to-r from-[#c8a863]/20 to-[#105330]/10 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-[#c8a863] to-[#105330]" />
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8 text-[#c8a863]" />
              <div>
                <p className="font-bold text-[#105330]">התכנון המומלץ: {bestPlan.label}</p>
                <p className="text-sm text-[#105330]/70">
                  זהו התכנון שיאפשר לך להגיע למטרה בגיל המוקדם ביותר (גיל {bestPlan.achieveAge})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goal Summary */}
      <Card className="border-0 shadow-xl bg-white/95 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-[#105330] to-[#c8a863]" />
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-[#105330]">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#105330] to-[#1a7a4a]">
              {goalSettings?.goal_type === 'financial_freedom' ? (
                <Coins className="w-5 h-5 text-white" />
              ) : (
                <Home className="w-5 h-5 text-white" />
              )}
            </div>
            {goalSettings?.goal_type === 'financial_freedom' ? 'מטרה: חופש כלכלי' : 'מטרה: רכישת בית'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-[#105330]/5 rounded-xl text-center">
              <p className="text-sm text-[#105330]/70">גיל נוכחי</p>
              <p className="text-2xl font-bold text-[#105330]">{results?.currentAge || '-'}</p>
            </div>
            <div className="p-4 bg-[#105330]/5 rounded-xl text-center">
              <p className="text-sm text-[#105330]/70">גיל יעד</p>
              <p className="text-2xl font-bold text-[#105330]">{results?.targetAge || '-'}</p>
            </div>
            <div className="p-4 bg-[#c8a863]/20 rounded-xl text-center">
              <p className="text-sm text-[#105330]/70">
                {goalSettings?.goal_type === 'financial_freedom' ? 'הכנסה פאסיבית רצויה' : 'סכום יעד'}
              </p>
              <p className="text-2xl font-bold text-[#105330]">
                ₪{(goalSettings?.goal_type === 'financial_freedom' 
                  ? results?.targetPassiveIncome 
                  : results?.targetAmount)?.toLocaleString() || '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {results && goalSettings?.goal_type === 'financial_freedom' && (
        <>
          {/* Achievement Status */}
          <Card className={`border-0 shadow-xl overflow-hidden ${
            results.canAchieveGoal && results.financialFreedomAge <= results.targetAge
              ? 'bg-gradient-to-r from-emerald-50 to-green-50'
              : 'bg-gradient-to-r from-amber-50 to-orange-50'
          }`}>
            <div className={`h-1.5 ${
              results.canAchieveGoal && results.financialFreedomAge <= results.targetAge
                ? 'bg-gradient-to-r from-emerald-500 to-green-500'
                : 'bg-gradient-to-r from-amber-500 to-orange-500'
            }`} />
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {results.canAchieveGoal && results.financialFreedomAge <= results.targetAge ? (
                  <CheckCircle className="w-12 h-12 text-emerald-500 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-12 h-12 text-amber-500 flex-shrink-0" />
                )}
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">
                    {results.canAchieveGoal
                      ? `החל מגיל ${results.financialFreedomAge} תוכל למשוך לפחות ₪${results.targetPassiveIncome.toLocaleString()} בחודש`
                      : `לפי התכנון הנוכחי, לא ניתן להגיע להכנסה פאסיבית של ₪${results.targetPassiveIncome.toLocaleString()} עד גיל 80`
                    }
                  </h3>
                  <p className="text-slate-600">
                    {results.canAchieveGoal
                      ? `זהו הגיל המוקדם ביותר שבו תוכל למשוך את הסכום המלא שהגדרת (₪${results.targetPassiveIncome.toLocaleString()}/חודש) ולשמור על משיכה זו עד גיל 80.`
                      : `כדי להגיע ליעד, מומלץ להגדיל את ההפקדה החודשית לתיק ההשקעות או לדחות את גיל היעד.`
                    }
                  </p>
                  {results.canAchieveGoal && results.financialFreedomAge > results.targetAge && (
                    <p className="text-amber-600 mt-2 font-medium">
                      💡 שים לב: גיל ההגעה ({results.financialFreedomAge}) מאוחר יותר מגיל היעד שהגדרת ({results.targetAge})
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Projected Assets */}
          <Card className="border-0 shadow-xl bg-white/95 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[#105330] to-[#1a7a4a]" />
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-[#105330]">
                <TrendingUp className="w-5 h-5" />
                נכסים צפויים בגיל {results.financialFreedomAge}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="p-4 bg-purple-50 rounded-xl">
                  <p className="text-sm text-purple-600 font-medium">תיק השקעות</p>
                  <p className="text-xl font-bold text-purple-800">₪{results.projectedStocks.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-pink-50 rounded-xl">
                  <p className="text-sm text-pink-600 font-medium">השקעות אלטרנטיביות</p>
                  <p className="text-xl font-bold text-pink-800">₪{results.projectedAlt.toLocaleString()}</p>
                </div>
                {results.projectedKeren > 0 && (
                  <div className="p-4 bg-blue-50 rounded-xl">
                    <p className="text-sm text-blue-600 font-medium">קרן השתלמות</p>
                    <p className="text-xl font-bold text-blue-800">₪{results.projectedKeren.toLocaleString()}</p>
                  </div>
                )}
                {results.projectedRealEstate > 0 && (
                  <div className="p-4 bg-amber-50 rounded-xl">
                    <p className="text-sm text-amber-600 font-medium">נדל״ן</p>
                    <p className="text-xl font-bold text-amber-800">₪{results.projectedRealEstate.toLocaleString()}</p>
                  </div>
                )}
                <div className="p-4 bg-emerald-50 rounded-xl">
                  <p className="text-sm text-emerald-600 font-medium">קצבת פנסיה (מגיל {results.retirementAge})</p>
                  <p className="text-xl font-bold text-emerald-800">₪{results.monthlyPensionAllowance.toLocaleString()}/חודש</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Important Note */}
          <Card className="border-0 shadow-xl bg-blue-50/50 border-l-4 border-blue-500">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">הערה חשובה:</p>
                  <p>
                    החישוב מבוסס על תשואה ממוצעת של 6% בשנה (גם לאחר הפסקת ההפקדות). 
                    בגיל הפרישה מומלץ להוריד סיכון בתיק ההשקעות ולהתאים את התמהיל לסיכון נמוך יותר.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Withdrawal Plan */}
          {results.withdrawalPlan.length > 0 && (
            <Card className="border-0 shadow-xl bg-white/95 overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-[#c8a863] to-[#105330]" />
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-[#105330]">
                  <Calendar className="w-5 h-5" />
                  תוכנית משיכה מפורטת
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {results.withdrawalPlan.map((period, idx) => (
                    <div key={idx} className="p-5 rounded-xl border bg-gradient-to-r from-emerald-50/50 to-green-50/50 border-emerald-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge className="text-white text-lg px-4 py-1 bg-emerald-600">
                            גיל {period.ageRange}
                          </Badge>
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="text-left">
                          <span className="text-lg font-bold text-[#105330]">
                            ₪{period.totalMonthly.toLocaleString()}/חודש
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {period.sources.map((source, sIdx) => (
                          <div key={sIdx} className="flex justify-between items-center p-3 bg-white rounded-lg">
                            <span className="text-[#105330]/80">{source.source}</span>
                            <span className="font-semibold text-[#105330]">₪{source.amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Home Goal */}
      {results && goalSettings?.goal_type === 'home' && results.homeSavingsPlan && (
        <Card className="border-0 shadow-xl bg-white/95 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-[#105330] to-[#c8a863]" />
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-[#105330]">
              <Home className="w-5 h-5" />
              תוכנית חיסכון לבית
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-[#105330]/5 rounded-xl text-center">
                <p className="text-sm text-[#105330]/70">חיסכון נוכחי</p>
                <p className="text-xl font-bold text-[#105330]">₪{results.homeSavingsPlan.currentSavings.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-[#105330]/5 rounded-xl text-center">
                <p className="text-sm text-[#105330]/70">סכום יעד</p>
                <p className="text-xl font-bold text-[#105330]">₪{results.homeSavingsPlan.targetAmount.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl text-center">
                <p className="text-sm text-amber-600">חסר להשלמה</p>
                <p className="text-xl font-bold text-amber-700">₪{results.homeSavingsPlan.remaining.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl text-center">
                <p className="text-sm text-emerald-600">חיסכון חודשי נדרש</p>
                <p className="text-xl font-bold text-emerald-700">₪{results.homeSavingsPlan.monthlySavingsNeeded.toLocaleString()}</p>
              </div>
            </div>

            <div className={`p-5 rounded-xl ${
              results.homeSavingsPlan.canAchieve 
                ? 'bg-emerald-50 border border-emerald-200' 
                : 'bg-amber-50 border border-amber-200'
            }`}>
              <div className="flex items-start gap-3">
                {results.homeSavingsPlan.canAchieve ? (
                  <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
                )}
                <div>
                  <p className={`font-bold ${results.homeSavingsPlan.canAchieve ? 'text-emerald-800' : 'text-amber-800'}`}>
                    {results.homeSavingsPlan.canAchieve 
                      ? `אתה בדרך הנכונה! תוכל להגיע ליעד תוך ${results.homeSavingsPlan.yearsToTarget} שנים`
                      : `כדי להגיע ליעד בזמן, יש להגדיל את החיסכון החודשי ל-₪${results.homeSavingsPlan.monthlySavingsNeeded.toLocaleString()}`
                    }
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}