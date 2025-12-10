import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import AssetsLiabilitiesTable from './AssetsLiabilitiesTable';

export default function PlanningSection({ userId }) {
  const [activePlan, setActivePlan] = useState('current');

  const planButtons = [
    { value: 'current', label: 'אם לא משנים כלום' },
    { value: 'plan_a', label: 'תכנון א׳' },
    { value: 'plan_b', label: 'תכנון ב׳' },
    { value: 'plan_c', label: 'תכנון ג׳' },
  ];

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
                ? 'bg-gradient-to-r from-[#105330] to-[#1a7a4a] text-white shadow-xl' 
                : 'bg-transparent text-[#105330] hover:bg-[#105330]/10'
            }`}
          >
            {btn.label}
          </Button>
        ))}
      </div>

      {/* Assets & Liabilities Table */}
      <AssetsLiabilitiesTable userId={userId} planType={activePlan} />
    </div>
  );
}