import React from 'react';
import { Check, MapPin, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { FINANCIAL_STEPS, getStepValue, getStepTarget, getStepGap, formatCurrency } from './financialPlanSteps';

export default function FinancialJourney({ situation, currentStep, stepTargets, onStepClick, editable }) {
  return (
    <div className="relative" dir="rtl">
      <div className="absolute right-[27px] top-2 bottom-2 w-0.5 bg-slate-200" />
      <div className="space-y-1">
        {FINANCIAL_STEPS.map((step, idx) => {
          const isCurrent = step.id === currentStep;
          const isPast = step.id < currentStep;
          const isFuture = step.id > currentStep;
          const gap = getStepGap(step.id, situation, stepTargets);
          const completed = gap <= 0;
          const value = getStepValue(step.id, situation);
          const target = getStepTarget(step.id, situation, stepTargets);

          return (
            <motion.button
              key={step.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              onClick={() => editable && onStepClick?.(step.id)}
              disabled={!editable}
              className={`relative flex items-start gap-4 w-full text-right pr-0 pl-4 py-3 rounded-2xl transition-all ${
                isCurrent ? 'bg-[#105330]/5' : 'hover:bg-slate-50'
              } ${editable ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className="relative z-10 flex-shrink-0 mt-0.5">
                {isPast ? (
                  <div className="w-14 h-14 rounded-full bg-[#105330] flex items-center justify-center shadow-lg">
                    <Check className="w-7 h-7 text-white" strokeWidth={3} />
                  </div>
                ) : isCurrent ? (
                  <div className="w-14 h-14 rounded-full bg-[#c8a863] flex items-center justify-center shadow-xl ring-4 ring-[#c8a863]/30">
                    <MapPin className="w-7 h-7 text-[#105330]" strokeWidth={2.5} />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center">
                    {step.id === 5 ? (
                      <Lock className="w-5 h-5 text-slate-300" />
                    ) : (
                      <span className="text-lg font-bold text-slate-300">{step.id}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 pt-1.5">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-base font-bold ${isCurrent ? 'text-[#105330]' : isPast ? 'text-[#105330]/60' : 'text-slate-400'}`}>
                    {step.label}
                  </span>
                  {isCurrent && (
                    <span className="text-xs font-bold text-[#c8a863] bg-[#c8a863]/10 px-2 py-0.5 rounded-full">
                      אתה כאן
                    </span>
                  )}
                </div>
                <p className={`text-sm ${isCurrent ? 'text-slate-600' : isPast ? 'text-slate-400' : 'text-slate-400'}`}>
                  {step.description}
                </p>
                {isCurrent && (
                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">יעד: </span>
                      <span className="font-bold text-[#105330]">
                        {step.unit ? formatCurrency(target) : 'פתיחת תיק'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">היום: </span>
                      <span className={`font-bold ${value >= target ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {step.unit ? formatCurrency(value) : value ? 'פתוח' : 'לא פתוח'}
                      </span>
                    </div>
                    {gap > 0 && (
                      <div>
                        <span className="text-slate-400">פער: </span>
                        <span className="font-bold text-[#c8a863]">{formatCurrency(gap)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}