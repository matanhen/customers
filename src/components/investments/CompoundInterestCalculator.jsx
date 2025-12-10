import React, { useState } from 'react';
import { Calculator, TrendingUp, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';

export default function CompoundInterestCalculator() {
  const [params, setParams] = useState({
    initialDeposit: 10000,
    monthlyDeposit: 1000,
    annualReturn: 7,
    yearsUntilStopDeposits: 20,
    totalYears: 30,
    managementFeeSavings: 0.5,
    managementFeeDeposit: 2,
  });

  const calculate = () => {
    const {
      initialDeposit,
      monthlyDeposit,
      annualReturn,
      yearsUntilStopDeposits,
      totalYears,
      managementFeeSavings,
      managementFeeDeposit,
    } = params;

    const effectiveReturn = (annualReturn - managementFeeSavings) / 100;
    const monthlyReturn = effectiveReturn / 12;
    const effectiveDeposit = monthlyDeposit * (1 - managementFeeDeposit / 100);

    const data = [];
    let balance = initialDeposit;
    let totalDeposits = initialDeposit;

    for (let year = 0; year <= totalYears; year++) {
      data.push({
        year,
        balance: Math.round(balance),
        deposits: Math.round(totalDeposits),
        interest: Math.round(balance - totalDeposits),
      });

      if (year < totalYears) {
        for (let month = 0; month < 12; month++) {
          balance = balance * (1 + monthlyReturn);
          if (year < yearsUntilStopDeposits) {
            balance += effectiveDeposit;
            totalDeposits += monthlyDeposit;
          }
        }
      }
    }

    return data;
  };

  const chartData = calculate();
  const finalData = chartData[chartData.length - 1];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-600" />
            מחשבון ריבית דריבית
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <Label>סכום הפקדה ראשוני</Label>
              <Input
                type="number"
                value={params.initialDeposit || ''}
                onChange={(e) => setParams({ ...params, initialDeposit: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>הפקדה חודשית</Label>
              <Input
                type="number"
                value={params.monthlyDeposit || ''}
                onChange={(e) => setParams({ ...params, monthlyDeposit: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>ריבית שנתית (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={params.annualReturn || ''}
                onChange={(e) => setParams({ ...params, annualReturn: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>שנים עד הפסקת הפקדות</Label>
              <Input
                type="number"
                value={params.yearsUntilStopDeposits || ''}
                onChange={(e) => setParams({ ...params, yearsUntilStopDeposits: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>סך שנות השקעה</Label>
              <Input
                type="number"
                value={params.totalYears || ''}
                onChange={(e) => setParams({ ...params, totalYears: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>דמי ניהול מצבירה (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={params.managementFeeSavings || ''}
                onChange={(e) => setParams({ ...params, managementFeeSavings: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>דמי ניהול מהפקדה (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={params.managementFeeDeposit || ''}
                onChange={(e) => setParams({ ...params, managementFeeDeposit: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6 text-center">
            <DollarSign className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">סכום סופי</p>
            <p className="text-2xl font-bold text-blue-700">
              ₪{finalData.balance.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-6 text-center">
            <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">סך הפקדות</p>
            <p className="text-2xl font-bold text-green-700">
              ₪{finalData.deposits.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="p-6 text-center">
            <Calculator className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">רווח מריבית</p>
            <p className="text-2xl font-bold text-purple-700">
              ₪{finalData.interest.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>צמיחת ההשקעה לאורך זמן</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="year" 
                  label={{ value: 'שנים', position: 'bottom' }}
                />
                <YAxis 
                  tickFormatter={(val) => `₪${(val / 1000).toFixed(0)}K`}
                />
                <Tooltip 
                  formatter={(value) => `₪${value.toLocaleString()}`}
                  contentStyle={{ direction: 'rtl' }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="deposits" 
                  name="הפקדות" 
                  stackId="1"
                  fill="#86EFAC" 
                  stroke="#22C55E"
                />
                <Area 
                  type="monotone" 
                  dataKey="interest" 
                  name="ריבית" 
                  stackId="1"
                  fill="#C4B5FD" 
                  stroke="#8B5CF6"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}