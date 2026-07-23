import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Coins, Info, Search, Calendar, Wallet, TrendingUp, ReceiptText, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import FormattedNumberInput from '@/components/ui/FormattedNumberInput';
import { base44 } from '@/api/base44Client';

// Snapshot of the funds table from https://lazyinvestor.co.il/monetary-fund/
const FUNDS = [
  { paper: '5138763', name: 'אלטשולר שחם כספית',                   mgmt2026: '0.234%', yield2026: '1.72%', yield2025: '4.41%', mgmt2025: '0.175%' },
  { paper: '5137740', name: 'קסם אקטיב כספית שקלית',                 mgmt2026: '0.19%',  yield2026: '1.72%', yield2025: '4.44%', mgmt2025: '0.14%' },
  { paper: '5136544', name: 'מיטב כספית שקלית כשרה',                mgmt2026: '0.16%',  yield2026: '1.82%', yield2025: '4.57%', mgmt2025: '0.14%' },
  { paper: '5137732', name: 'אי.בי.אי. כספית ניהול נזילות',          mgmt2026: '0.169%', yield2026: '1.75%', yield2025: '4.49%', mgmt2025: '0.169%' },
  { paper: '5138094', name: 'מגדל כספית שקלית כשרה',                mgmt2026: '0.149%', yield2026: '1.80%', yield2025: '4.46%', mgmt2025: '0.09%' },
  { paper: '5138698', name: 'דולפין כספית',                         mgmt2026: '0.149%', yield2026: '1.75%', yield2025: '4.47%', mgmt2025: '0.09%' },
  { paper: '5137815', name: 'הראל כספית שקלית כשרה',                mgmt2026: '0.14%',  yield2026: '1.68%', yield2025: '4.39%', mgmt2025: '0.10%' },
  { paper: '5139324', name: 'מור כספית ניהול נזילות',              mgmt2026: '0.15%',  yield2026: '1.82%', yield2025: '4.42%', mgmt2025: '0.10%' },
  { paper: '5137690', name: 'מיטב כספית שקלית ללא קונצרני',         mgmt2026: '0.14%',  yield2026: '1.63%', yield2025: '4.25%', mgmt2025: '0.08%' },
  { paper: '5136874', name: 'קסם אקטיב כספית',                      mgmt2026: '0.24%',  yield2026: '1.71%', yield2025: '4.50%', mgmt2025: '0.19%' },
  { paper: '5137641', name: 'ילין לפידות כספית',                    mgmt2026: '0.22%',  yield2026: '1.81%', yield2025: '4.59%', mgmt2025: '0.19%' },
  { paper: '5136866', name: 'איילון כספית ניהול הנזילות',            mgmt2026: '0.18%',  yield2026: '1.74%', yield2025: '4.49%', mgmt2025: '0.14%' },
  { paper: '5138706', name: 'אזימוט כספית',                         mgmt2026: '0.14%',  yield2026: '1.75%', yield2025: '4.45%', mgmt2025: '0.14%' },
  { paper: '5121140', name: 'אנליסט כספית',                        mgmt2026: '0.215%', yield2026: '1.71%', yield2025: '4.46%', mgmt2025: '0.185%' },
  { paper: '5127881', name: 'קסם אקטיב כספית פטורה',               mgmt2026: '0.24%',  yield2026: '1.72%', yield2025: '4.46%', mgmt2025: '0.19%' },
  { paper: '5129408', name: 'הראל כספית ניהול נזילות',             mgmt2026: '0.17%',  yield2026: '1.72%', yield2025: '4.43%', mgmt2025: '0.17%' },
  { paper: '5117700', name: 'איילון כספית',                         mgmt2026: '0.18%',  yield2026: '1.77%', yield2025: '4.53%', mgmt2025: '0.18%' },
  { paper: '5134309', name: 'מגדל כספית',                          mgmt2026: '0.239%', yield2026: '1.75%', yield2025: '4.49%', mgmt2025: '0.199%' },
  { paper: '5127790', name: 'הראל כספית מגמת ריבית',                mgmt2026: '0.18%',  yield2026: '1.71%', yield2025: '4.44%', mgmt2025: '0.18%' },
  { paper: '5105820', name: 'אלטשולר שחם כספית ללא קונצרני',        mgmt2026: '0.21%',  yield2026: '1.62%', yield2025: '4.16%', mgmt2025: '0.19%' },
  { paper: '5119409', name: 'הראל כספית שקלית',                     mgmt2026: '0.19%',  yield2026: '1.69%', yield2025: '4.42%', mgmt2025: '0.19%' },
  { paper: '5119813', name: 'מור כספית',                            mgmt2026: '0.24%',  yield2026: '1.74%', yield2025: '4.43%', mgmt2025: '0.22%' },
  { paper: '5102991', name: 'מגדל כספית שקלית',                     mgmt2026: '0.239%', yield2026: '1.70%', yield2025: '4.48%', mgmt2025: '0.219%' },
  { paper: '5103510', name: 'אי.בי.אי. כספית שקלית',               mgmt2026: '0.20%',  yield2026: '1.75%', yield2025: '4.46%', mgmt2025: '0.20%' },
  { paper: '5135926', name: 'מיטב כספית ניהול נזילות',              mgmt2026: '0.22%',  yield2026: '1.88%', yield2025: '4.55%', mgmt2025: '0.22%' },
  { paper: '5123898', name: 'מיטב כספית',                            mgmt2026: '0.25%',  yield2026: '1.84%', yield2025: '4.55%', mgmt2025: '0.25%' },
  { paper: '5137559', name: 'מגדל כספית מחלקת חודשי',               mgmt2026: '0.16%',  yield2026: '1.49%', yield2025: '3.64%', mgmt2025: '0.07%' },
  { paper: '5139522', name: 'אי.בי.אי כספית שקלית כשרה',           mgmt2026: '0.149%', yield2026: '1.78%', yield2025: '4.54%', mgmt2025: '0.09%' },
  { paper: '5139258', name: 'ילין לפידות כספית ניהול נזילות',        mgmt2026: '0.19%',  yield2026: '1.79%', yield2025: '4.61%', mgmt2025: '0.07%' },
  { paper: '5140918', name: 'אלטשולר שחם כספית ניהול נזילות',         mgmt2026: '0.06%',  yield2026: '1.78%', yield2025: '—',    mgmt2025: '—' },
  { paper: '5141692', name: 'ברק כספית',                            mgmt2026: '0% + 0.1% מההפקדה', yield2026: '1.70%', yield2025: '—', mgmt2025: '—' },
  { paper: '5140785', name: 'מגדל כספית שקלית ללא קונצרני',         mgmt2026: '0.06%',  yield2026: '1.67%', yield2025: '—',    mgmt2025: '—' },
  { paper: '5141353', name: 'פורסט כספית',                          mgmt2026: '0.05%',  yield2026: '1.77%', yield2025: '—',    mgmt2025: '—' },
  { paper: '5141304', name: 'מגדל כספית חסכון',                     mgmt2026: '0.10%',  yield2026: '1.66%', yield2025: '—',    mgmt2025: '—' },
  { paper: '5141098', name: 'דולפין כספית שקלית',                   mgmt2026: '0.05%',  yield2026: '1.75%', yield2025: '—',    mgmt2025: '—' },
  { paper: '5140413', name: 'אנליסט כספית חיסכון',                  mgmt2026: '0.12%',  yield2026: '1.78%', yield2025: '—',    mgmt2025: '—' },
  { paper: '5141452', name: 'ילין לפידות כספית כשרה',               mgmt2026: '0.06%',  yield2026: '1.96%', yield2025: '—',    mgmt2025: '—' },
  { paper: '5141296', name: 'מיטב כספית ג׳מבו',                    mgmt2026: '0.12%',  yield2026: '1.96%', yield2025: '—',    mgmt2025: '—' },
  { paper: '5141197', name: 'אי.בי.אי כספית חסכון',                mgmt2026: '0.07%',  yield2026: '1.77%', yield2025: '—',    mgmt2025: '—' },
];

const TAX_RATE = 0.25;

function formatShekel(n, decimals = 0) {
  if (n === undefined || n === null || isNaN(n)) return '—';
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

function FundsTable({ funds }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('desc');

  const columns = [
    { key: 'paper',     label: 'מס׳ נייר',        sortable: true  },
    { key: 'name',      label: 'שם הקרן',         sortable: false },
    { key: 'mgmt2026',  label: 'דמי ניהול 2026',  sortable: true  },
    { key: 'yield2026', label: 'תשואה 2026',     sortable: true  },
    { key: 'yield2025', label: 'תשואה 2025',     sortable: true  },
    { key: 'mgmt2025',  label: 'דמי ניהול 2025',  sortable: true  },
  ];

  function parseNumeric(v) {
    if (typeof v !== 'string' || v === '—') return NaN;
    const m = v.match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : NaN;
  }

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedFunds = useMemo(() => {
    if (!sortKey) return funds;
    const arr = funds.slice();
    arr.sort((a, b) => {
      const av = parseNumeric(a[sortKey]);
      const bv = parseNumeric(b[sortKey]);
      const va = isNaN(av) ? -Infinity : av;
      const vb = isNaN(bv) ? -Infinity : bv;
      return sortDir === 'desc' ? vb - va : va - vb;
    });
    return arr;
  }, [funds, sortKey, sortDir]);

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#105330]/10 shadow-lg">
      <table className="w-full text-sm whitespace-nowrap">
        <thead>
          <tr className="bg-gradient-to-l from-[#105330] to-[#1a7a4a] text-white">
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                className={`px-4 py-3 font-semibold text-center ${col.sortable ? 'cursor-pointer hover:bg-white/10 transition-colors select-none' : ''}`}
              >
                <span className="inline-flex items-center gap-1 justify-center">
                  <span>{col.label}</span>
                  {col.sortable &&
                    (sortKey === col.key ? (
                      sortDir === 'desc' ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronUp className="w-3.5 h-3.5" />
                      )
                    ) : (
                      <ChevronsUpDown className="w-3 h-3 opacity-50" />
                    ))}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedFunds.map((f, idx) => (
            <tr
              key={f.paper}
              className={`border-b border-[#105330]/10 hover:bg-[#c8a863]/10 transition-colors ${idx % 2 === 1 ? 'bg-[#105330]/[0.03]' : 'bg-white'}`}
            >
              <td className="px-4 py-2.5 text-slate-600 dir-ltr text-right font-mono">{f.paper}</td>
              <td className="px-4 py-2.5 font-semibold text-[#105330]">{f.name}</td>
              <td className="px-4 py-2.5 text-slate-700">{f.mgmt2026}</td>
              <td className="px-4 py-2.5 text-green-700 font-bold">{f.yield2026}</td>
              <td className="px-4 py-2.5 text-slate-700">{f.yield2025}</td>
              <td className="px-4 py-2.5 text-slate-700">{f.mgmt2025}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TaxCalculator() {
  const [depositDate, setDepositDate] = useState('');
  const [saleDate, setSaleDate] = useState('');
  const [depositAmount, setDepositAmount] = useState(0);
  const [currentAmount, setCurrentAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleCalc = async () => {
    setError('');
    setResult(null);

    if (!depositDate || !saleDate) {
      setError('יש להזין תאריך הפקדה ותאריך מכירה.');
      return;
    }
    if (new Date(saleDate) < new Date(depositDate)) {
      setError('תאריך המכירה חייב להיות אחרי תאריך ההפקדה.');
      return;
    }
    if (!depositAmount || !currentAmount) {
      setError('יש להזין סכום הפקדה וצבירה נוכחית.');
      return;
    }

    setLoading(true);
    try {
      const todayISO = new Date().toISOString().slice(0, 10);
      const effectiveSale = saleDate > todayISO ? todayISO : saleDate;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt:
          `Compute the cumulative inflation in Israel between two dates using the official monthly Consumer Price Index (CPI / מדד המחירים לצרכן) published by the Israeli Central Bureau of Statistics (LAM). Compound the monthly CPI percentage changes for the months fully or partially included between the deposit date and the sale date. If the sale date is in the future or in a month whose CPI has not yet been published, use the most recent published CPI month as the end month.\n` +
          `Deposit date: ${depositDate}\n` +
          `Sale date: ${effectiveSale}\n` +
          `Return ONLY the cumulative inflation as a percentage number in the JSON object.`,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            cumulative_inflation_percent: { type: 'number' },
          },
        },
      });

      const inflationPercent = res.cumulative_inflation_percent ?? 0;
      const inflationFactor = 1 + inflationPercent / 100;
      const inflationAdjustedDeposit = depositAmount * inflationFactor;
      const realProfit = currentAmount - inflationAdjustedDeposit;
      const tax = Math.max(0, realProfit * TAX_RATE);
      const profitBeforeInflationAdjust = currentAmount - depositAmount;
      const netAfterTax = currentAmount - tax;

      setResult({
        inflationPercent,
        inflationAdjustedDeposit,
        realProfit,
        tax,
        profitBeforeInflationAdjust,
        netAfterTax,
      });
    } catch (e) {
      console.error(e);
      setError('נכשל בחישוב האינפלציה מול מדד המחירים. נסה שוב מאוחר יותר.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0d4027] via-[#105330] to-[#1a7a4a] shadow-2xl">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[#c8a863]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl" />

      <div className="relative p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#c8a863] to-[#d4b87a] flex items-center justify-center shadow-lg ring-2 ring-white/30">
            <Coins className="w-6 h-6 text-[#105330]" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white tracking-tight">מחשבון מס לקרן כספית</h3>
            <p className="text-white/70 text-sm">חישוב אוטומטי של האינפלציה המצטברת מתוך מדד המחירים לצרכן</p>
          </div>
        </div>

        {/* Info banner */}
        <div className="mb-5 bg-white/10 backdrop-blur-sm rounded-2xl p-3.5 flex gap-3 border border-white/15">
          <Info className="w-4 h-4 text-[#c8a863] shrink-0 mt-0.5" />
          <p className="text-xs text-white/85 leading-relaxed">
            המיסוי על קרן כספית הוא ריאלי — משלמים מס 25% רק על הרווח שעוקף את האינפלציה. האינפלציה המצטברת מחושבת אוטומטית על בסיס תאריכי ההפקדה ומכירה ומדד המחירים לצרכן הרשמי.
          </p>
        </div>

        {/* Inputs grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm text-white/85 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              תאריך הפקדה
            </Label>
            <Input
              type="date"
              value={depositDate}
              onChange={(e) => setDepositDate(e.target.value)}
              className="bg-white/95 border-white/15 rounded-xl font-medium"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-white/85 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              תאריך מכירה
            </Label>
            <Input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="bg-white/95 border-white/15 rounded-xl font-medium"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-white/85 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" />
              סכום הפקדה (₪)
            </Label>
            <FormattedNumberInput
              value={depositAmount}
              onChange={setDepositAmount}
              className="bg-white/95 border-white/15 rounded-xl font-semibold"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-white/85 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              צבירה נוכחית (₪)
            </Label>
            <FormattedNumberInput
              value={currentAmount}
              onChange={setCurrentAmount}
              className="bg-white/95 border-white/15 rounded-xl font-semibold"
            />
          </div>
        </div>

        {/* CTA */}
        <Button
          onClick={handleCalc}
          disabled={loading}
          className="mt-5 w-full md:w-auto bg-gradient-to-r from-[#c8a863] to-[#d4b87a] hover:from-[#b8983f] hover:to-[#c8a863] text-[#105330] font-bold rounded-xl text-base px-8 py-3 shadow-lg ring-2 ring-white/20"
        >
          {loading ? <Loader2 className="w-5 h-5 ml-2 animate-spin" /> : <ReceiptText className="w-5 h-5 ml-2" />}
          {loading ? 'מחשב אינפלציה מול מדד המחירים...' : 'חשב לי כמה מס אשלם'}
        </Button>

        {error && (
          <div className="mt-4 bg-red-500/20 border border-red-300/30 text-red-100 rounded-xl p-3 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-6 space-y-4">
            {/* Top row: inflation + adjusted */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/15">
                <p className="text-xs text-[#c8a863] font-medium mb-1">אינפלציה מצטברת</p>
                <p className="text-2xl font-bold text-white">
                  {result.inflationPercent.toFixed(2)}<span className="text-lg">%</span>
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/15">
                <p className="text-xs text-white/70 mb-1">סכום הפקדה מוצמד</p>
                <p className="text-lg font-bold text-white">{formatShekel(result.inflationAdjustedDeposit)}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/15">
                <p className="text-xs text-white/70 mb-1">רווח נומינלי</p>
                <p className="text-lg font-bold text-white">{formatShekel(result.profitBeforeInflationAdjust)}</p>
              </div>
            </div>

            {/* Real profit highlight */}
            <div
              className={`rounded-2xl p-5 text-center border-2 ${
                result.realProfit > 0
                  ? 'bg-emerald-500/15 border-emerald-300/40'
                  : 'bg-white/5 border-white/15'
              }`}
            >
              <p className={`text-sm mb-2 font-medium ${result.realProfit > 0 ? 'text-emerald-200' : 'text-white/70'}`}>
                רווח ריאלי (לאחר הצמדה למדד)
              </p>
              <p className={`text-3xl font-bold ${result.realProfit > 0 ? 'text-emerald-200' : 'text-white/80'}`}>
                {formatShekel(result.realProfit)}
              </p>
            </div>

            {/* Bottom row: tax + net */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-red-500/15 backdrop-blur-sm rounded-2xl p-5 text-center border border-red-300/30">
                <p className="text-xs text-red-100 mb-1">מס לתשלום (25%)</p>
                <p className="text-2xl font-bold text-white">{formatShekel(result.tax)}</p>
              </div>
              <div className="bg-gradient-to-br from-[#c8a863]/25 to-[#d4b87a]/15 backdrop-blur-sm rounded-2xl p-5 text-center border border-[#c8a863]/40 shadow-lg">
                <p className="text-xs text-[#f5e7b8] font-medium mb-1">נטו לקבלתך אחרי מס</p>
                <p className="text-3xl font-bold text-white drop-shadow">{formatShekel(result.netAfterTax)}</p>
              </div>
            </div>

            <p className="text-xs text-white/50 text-center">
              האינפלציה מחושבת אוטומטית מתוך נתוני מדד המחירים לצרכן הרשמיים. אין בכך ייעוץ מס.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MonetaryFunds() {
  const [search, setSearch] = useState('');

  const filteredFunds = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return FUNDS;
    return FUNDS.filter(
      (f) =>
        f.name.toLowerCase().includes(q) || String(f.paper).includes(q.replace(/\D/g, ''))
    );
  }, [search]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page header */}
      <div className="mb-2">
        <h2 className="text-2xl font-bold text-[#105330]">קרנות כספיות</h2>
        <p className="text-[#105330]/70 text-sm">רשימת קרנות כספיות ומחשבון מיסוי</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#105330]/50" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש לפי שם קרן או מספר נייר"
          className="pr-10 rounded-xl border-[#105330]/20 bg-white shadow-sm text-base"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-[#105330]/40 hover:text-[#105330] rounded-full p-1"
            aria-label="נקה חיפוש"
          >
            ✕
          </button>
        )}
      </div>

      {/* Funds table */}
      {filteredFunds.length > 0 ? (
        <FundsTable funds={filteredFunds} />
      ) : (
        <div className="text-center text-[#105330]/60 py-12 bg-white rounded-2xl border border-[#105330]/10">
          <p className="text-lg font-medium">לא נמצאו קרנות תואמות לחיפוש</p>
          <p className="text-sm mt-1">נסה לחפש לפי שם או מספר נייר אחר</p>
        </div>
      )}

      {/* Tax calculator */}
      <TaxCalculator />
    </div>
  );
}