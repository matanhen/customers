import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Percent, Banknote, Calendar, TrendingUp, Save } from 'lucide-react';

export default function MacroRatesEditor() {
  const queryClient = useQueryClient();
  const [boi, setBoi] = useState('');
  const [prime, setPrime] = useState('');
  const [reportMonth, setReportMonth] = useState('');
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['macroRates'],
    queryFn: async () => {
      const list = await base44.entities.MacroRates.list();
      const sorted = (list || []).sort((a, b) =>
        String(b.updated_date || '').localeCompare(String(a.updated_date || ''))
      );
      return sorted[0] || null;
    },
  });

  useEffect(() => {
    if (data) {
      setBoi(data.bank_of_israel_rate != null ? String(data.bank_of_israel_rate) : '');
      setPrime(data.prime_rate != null ? String(data.prime_rate) : '');
      setReportMonth(data.report_month || '');
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        bank_of_israel_rate: Number(boi) || 0,
        prime_rate: Number(prime) || 0,
        report_month: reportMonth || '',
      };
      if (data?.id) {
        // Update only the admin-managed fields; inflation stays untouched
        return base44.entities.MacroRates.update(data.id, payload);
      }
      return base44.entities.MacroRates.create({
        ...payload,
        inflation_rate: data?.inflation_rate ?? 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['macroRates'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  return (
    <Card className="mb-6 border-0 shadow-xl shadow-slate-200/50 bg-white/90 backdrop-blur-xl">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100/50">
        <CardTitle className="flex items-center gap-3 text-slate-800">
          <div className="p-2 rounded-xl bg-amber-100">
            <Percent className="w-5 h-5 text-amber-600" />
          </div>
          עדכון ריביות (ידני)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <p className="text-sm text-slate-500 mb-4">
          ריבית בנק ישראל וריבית פריים מתעדכנות ידנית על ידך ומופיעות מיידית בדף הבית לכל המשתמשים. האינפלציה מתעדכנת אוטומטית ואינה ניתנת לעריכה כאן.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[#105330] font-semibold flex items-center gap-1.5">
              <Banknote className="w-3.5 h-3.5" /> ריבית בנק ישראל (%)
            </Label>
            <Input
              type="number"
              step="0.01"
              value={boi}
              onChange={(e) => setBoi(e.target.value)}
              dir="ltr"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[#105330] font-semibold flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5" /> ריבית פריים (%)
            </Label>
            <Input
              type="number"
              step="0.01"
              value={prime}
              onChange={(e) => setPrime(e.target.value)}
              dir="ltr"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[#105330] font-semibold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> תאריך מעודכן
            </Label>
            <Input
              type="month"
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              dir="ltr"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-500 font-semibold flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> אינפלציה (אוטומטי)
            </Label>
            <Input
              value={data?.inflation_rate != null ? `${Number(data.inflation_rate).toFixed(1)}%` : '—'}
              disabled
              className="bg-slate-100 text-slate-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || isLoading}
            className="bg-gradient-to-r from-[#105330] to-[#1a7a4a] hover:from-[#0d4027] hover:to-[#105330] rounded-xl shadow-lg"
          >
            <Save className="w-4 h-4 ml-2" />
            {saveMutation.isPending ? 'שומר...' : 'שמור ריביות'}
          </Button>
          {saved && (
            <span className="text-emerald-600 text-sm font-medium">
              ✓ הריביות עודכנו ומופיעות מיידית בדף הבית
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}