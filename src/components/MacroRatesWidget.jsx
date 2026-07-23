import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Banknote, TrendingUp, Percent, Calendar } from 'lucide-react';

const formatPct = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `${v.toFixed(1)}%`;
};

const CARDS = [
  { key: 'boi',      label: 'ריבית בנק ישראל',     field: 'bank_of_israel_rate', icon: Banknote,    color: '#105330' },
  { key: 'prime',    label: 'ריבית פריים',          field: 'prime_rate',            icon: Percent,     color: '#1a7a4a' },
  { key: 'inflation', label: 'אינפלציה (12 חודשים)', field: 'inflation_rate',        icon: TrendingUp,  color: '#c8a863' },
];

export default function MacroRatesWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['macroRates'],
    queryFn: async () => {
      const list = await base44.entities.MacroRates.list();
      const sorted = (list || []).sort((a, b) =>
        String(b.updated_date || '').localeCompare(String(a.updated_date || ''))
      );
      return sorted[0] || null;
    },
    staleTime: 1000 * 60 * 60 * 24, // cache 24h to avoid redundant fetches
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-1.5 md:gap-3 mb-4">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="border-0 shadow-lg">
            <CardContent className="p-3 animate-pulse">
              <div className="h-3 bg-slate-100 rounded w-2/3 mb-2" />
              <div className="h-6 bg-slate-100 rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1.5 md:gap-3 mb-4">
      {CARDS.map(({ key, label, field, icon: Icon, color }) => (
        <Card key={key} className="border-0 shadow-lg overflow-hidden h-full">
          <CardContent className="p-2.5 md:p-4">
            <div className="flex items-center gap-1.5 md:gap-2 mb-1.5">
              <div
                className="w-6 h-6 md:w-8 md:h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: color }}
              >
                <Icon className="w-3 h-3 md:w-4 md:h-4 text-white" />
              </div>
              <span className="text-[9px] md:text-xs font-bold text-[#105330] leading-tight">
                {label}
              </span>
            </div>
            <div className="text-base md:text-2xl font-black text-slate-800 leading-tight">
              {formatPct(data?.[field])}
            </div>
            {data?.report_month && (
              <div className="text-[8px] md:text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
                {data.report_month}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}