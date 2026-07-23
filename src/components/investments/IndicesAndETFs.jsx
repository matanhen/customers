import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, Loader2, Activity } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// ETF funds data
const ETFS = [
  { name: 'INVESCO S&P 500 UCITS ETF',                           mgmt: '0.05%',  market: 'מניות ארה"ב',                symbol: '1183441', accumulation: true  },
  { name: 'iShares Core MSCI Europe UCITS ETF EUR',             mgmt: '0.12%',  market: 'מניות אירופה',                symbol: '1159094', accumulation: true  },
  { name: 'iShares Core MSCI EM IMI UCITS ETF',                 mgmt: '0.18%',  market: 'שווקים עולמיים מתפתחים',     symbol: '1159169', accumulation: true  },
  { name: 'iShares MSCI ACWI UCITS ETF',                        mgmt: '0.20%',  market: 'מניות עולמי',                symbol: '1159235', accumulation: true  },
  { name: 'INVESCO NASDAQ-100 SWAP UCITS ETF',                  mgmt: '0.20%',  market: 'מניות ארה"ב',                symbol: '1186063', accumulation: true  },
  { name: 'iShares $ NASDAQ 100',                               mgmt: '0.33%',  market: 'מניות ארה"ב',                symbol: '1159243', accumulation: true  },
  { name: 'Bitcoin',                                            mgmt: '0.12%',  market: 'ביטקוין (קריפטו)',          symbol: 'IBIT',    accumulation: true  },
  { name: 'Ethereum',                                           mgmt: '0.25%',  market: "את'ריום (קריפטו)",           symbol: 'ETHA',    accumulation: true  },
  { name: 'Roundhill Magnificent Seven ETF',                    mgmt: '0.29%',  market: 'שבע המניות הגדולות בארה"ב', symbol: 'MAGS',    accumulation: true  },
  { name: 'iShares Core S&P 500 UCITS ETF',                     mgmt: '0.07%',  market: 'מניות ארה"ב',                symbol: '1159250', accumulation: true  },
  { name: 'iShares Core S&P 500 ETF',                           mgmt: '0.07%',  market: 'מניות ארה"ב',                symbol: 'CSPX',    accumulation: true  },
  { name: 'תכלית סל תא 125',                                    mgmt: '0.10%',  market: 'מניות ישראל',               symbol: '1143718', accumulation: true  },
  { name: 'קסם ממשלתי כללי',                                    mgmt: '0.15%',  market: 'אג"ח ישראל (ממשלתי)',      symbol: '1146646', accumulation: true  },
  { name: 'הראל מחקה כללי',                                      mgmt: '0.12%',  market: 'אג"ח ישראל (ממשלתי)',      symbol: '5131792', accumulation: true  },
  { name: 'קסם ETF תל גוב-שקלי',                                 mgmt: '0.02%',  market: 'אג"ח קצר',                  symbol: '1146166', accumulation: true  },
  { name: 'Core MSCI World ETF',                                mgmt: '0.20%',  market: 'מניות עולמי',                symbol: 'SWDA',    accumulation: true  },
  { name: 'Global Aggregate Bond UCITS ETF - USD Hedged Accumulating', mgmt: '0.10%', market: 'אג"ח עולמי',     symbol: 'VAGU',    accumulation: true  },
  { name: 'Total Stock Market ETF',                            mgmt: '0.06%',  market: 'ארה"ב - כל שוק המניות',      symbol: 'VTI',     accumulation: false },
  { name: 'S&P 500 ETF',                                       mgmt: '0.03%',  market: 'מניות ארה"ב',                symbol: 'VOO',     accumulation: false },
  { name: 'Long-Term Treasury ETF',                            mgmt: '0.05%',  market: 'אג"ח ארה"ב ארוך טווח',       symbol: 'VGLT',    accumulation: false },
  { name: 'Total Bond Market ETF',                             mgmt: '0.035%', market: 'אג"ח ארה"ב',                symbol: 'BND',     accumulation: false },
  { name: 'Total World Bond ETF',                              mgmt: '0.06%',  market: 'אג"ח עולמי',                symbol: 'BNDW',    accumulation: false },
  { name: 'Total World Stock ETF',                             mgmt: '0.08%',  market: 'מניות עולמי',                symbol: 'VT',      accumulation: false },
  { name: 'Total World Stock ETF ex-USA',                      mgmt: '0.08%',  market: 'שוק המניות העולמי - ללא ארה"ב', symbol: 'VXUS',  accumulation: false },
  { name: 'iShares Core S&P 500 ETF',                          mgmt: '0.03%',  market: 'מניות ארה"ב',                symbol: 'IVV',     accumulation: false },
  { name: 'iShares U.S. Treasury Bond ETF',                   mgmt: '0.15%',  market: 'אג"ח ארה"ב',                symbol: 'GOVT',    accumulation: false },
  { name: 'iShares International Treasury Bond ETF',           mgmt: '0.35%',  market: 'אג"ח עולמי',                symbol: 'IGOV',    accumulation: false },
  { name: 'iShares MSCI World ETF',                            mgmt: '0.24%',  market: 'מניות עולמי',                symbol: 'URTH',    accumulation: false },
  { name: 'iShares MSCI ACWI ETF',                             mgmt: '0.03%',  market: 'מניות עולמי',                symbol: 'ACWI',    accumulation: false },
];

// Indices data
const INDICES = [
  { region: 'ארה"ב',  name: 'S&P 500',       desc: 'מדד אמריקאי המייצג 500 החברות הגדולות והמובילות בבורסת ארצות הברית' },
  { region: 'ארה"ב',  name: 'NASDAQ 100',    desc: 'מדד המייצג את 100 החברות הטכנולוגיות בבורסת ארצות הברית' },
  { region: 'ארה"ב',  name: 'DOW JONES 30',  desc: 'מדד המייצג 30 מהחברות הגדולות ביותר בארצות הברית' },
  { region: 'ארה"ב',  name: 'RUSSELL 2000',   desc: 'מדד המייצג 2000 חברות קטנות ובינוניות בארצות הברית' },
  { region: 'ישראל', name: 'תל אביב 35',    desc: 'המדד הראשי של בורסת תל אביב, מודד 35 החברות הגדולות ביותר בשוק' },
  { region: 'ישראל', name: 'תל אביב 125',    desc: 'מדד בבורסה הישראלית שמודד את 125 החברות הגדולות בישראל' },
  { region: 'עולמי',  name: 'MSCI',           desc: 'מדד בורסה זה כולל 1500 המניות הגדולות של השווקים המפותחים ב-23 מדינות, כ 85% מהעולם. הוא נחשב לכלי למדידת הביצועים של השוק העולמי' },
  { region: 'עולמי',  name: 'FTSE',           desc: 'מדד זה כולל את המניות מהשווקים המפותחים וגם את השווקים המתפתחים. כולל כ 90% מהעולם עם כ 4000 מניות' },
  { region: 'עולמי',  name: 'DOW JONES 50',   desc: 'המדד כולל 50 מהחברות הגדולות ביותר בעולם לפי שווי השוק' },
  { region: 'אירופה', name: 'MSCI EUROPE',    desc: 'המדד כולל כ-400 חברות גדולות-בינוניות מהמדינות המפותחות באירופה' },
];

function parseNumeric(v) {
  if (typeof v !== 'string') return NaN;
  if (v === '—') return NaN;
  const m = v.match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
}

function formatPrice(n, currency) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const formatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  return currency ? `${formatted} ${currency}` : formatted;
}

function formatSigned(n, decimals = 2) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const formatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(Math.abs(n));
  return n >= 0 ? `+${formatted}` : `-${formatted}`;
}

function MarketStatusPill({ q }) {
  if (!q) return <span className="text-slate-400">—</span>;
  return (
    <div className="flex items-center justify-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${q.marketOpen ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
      <span className={`text-xs font-semibold ${q.marketOpen ? 'text-green-600' : 'text-slate-500'}`}>
        {q.marketOpen ? 'פתוח' : 'סגור'}
      </span>
    </div>
  );
}

function ETFSection() {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('desc');
  const [quotes, setQuotes] = useState({});
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quotesError, setQuotesError] = useState('');
  const [lastFetchAt, setLastFetchAt] = useState(null);
  const prevPricesRef = useRef({});
  const [flashes, setFlashes] = useState({});

  // Fetch live quotes on mount + refresh every 30s. Visual flash (green/red)
  // is fired on the price cell whenever the price changes between refreshes
  // while that instrument's market is open.
  useEffect(() => {
    let cancelled = false;
    let intervalId = null;

    const refresh = async () => {
      try {
        if (!cancelled) setQuotesLoading(true);
        const response = await base44.functions.invoke('fetchEtfQuotes', {});
        if (cancelled) return;
        const map = {};
        if (response?.data?.quotes) {
          for (const q of response.data.quotes) {
            if (q && q.symbol) map[q.symbol] = q;
          }
        }
        // Detect price changes during market hours for live color flashing
        const newFlashes = {};
        for (const [symbol, q] of Object.entries(map)) {
          const prev = prevPricesRef.current[symbol];
          if (q.marketOpen && prev !== undefined && prev !== q.currentPrice) {
            newFlashes[symbol] = q.currentPrice > prev ? 'up' : 'down';
          }
          prevPricesRef.current[symbol] = q.currentPrice;
        }
        setQuotes(map);
        setLastFetchAt(response?.data?.fetchedAt || new Date().toISOString());
        if (Object.keys(newFlashes).length > 0) {
          setFlashes(newFlashes);
          setTimeout(() => setFlashes({}), 1300);
        }
        if (!cancelled) setQuotesError('');
      } catch (e) {
        if (!cancelled) setQuotesError('נכשל עדכון שערים');
        console.error('ETF quotes fetch failed', e);
      } finally {
        if (!cancelled) setQuotesLoading(false);
      }
    };

    refresh();
    intervalId = setInterval(refresh, 30_000);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const columns = [
    { key: 'name',         label: 'שם הקרן',         sortable: false },
    { key: 'mgmt',         label: 'דמי ניהול',         sortable: true },
    { key: 'market',       label: 'שוק',               sortable: false },
    { key: 'symbol',       label: 'סימול',             sortable: true },
    { key: 'accumulation', label: 'צוברת / מחלקת',     sortable: true },
  ];

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ETFS;
    return ETFS.filter(
      (e) => e.name.toLowerCase().includes(q) || String(e.symbol).toLowerCase().includes(q)
    );
  }, [search]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const arr = filtered.slice();
    arr.sort((a, b) => {
      if (sortKey === 'accumulation') {
        const av = a.accumulation ? 1 : 0;
        const bv = b.accumulation ? 1 : 0;
        return sortDir === 'desc' ? bv - av : av - bv;
      }
      const av = parseNumeric(a[sortKey]);
      const bv = parseNumeric(b[sortKey]);
      const va = isNaN(av) ? -Infinity : av;
      const vb = isNaN(bv) ? -Infinity : bv;
      return sortDir === 'desc' ? vb - va : va - vb;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  return (
    <div className="space-y-4">
      {/* Header row: search + last update indicator */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#105330]/50" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם קרן או סימול"
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
        <div className="flex items-center gap-2 text-xs text-[#105330]/70 px-3 py-1.5 rounded-full bg-[#105330]/5 border border-[#105330]/10">
          <Activity className={`w-3.5 h-3.5 ${quotesLoading ? 'animate-spin' : 'text-green-600'}`} />
          {quotesLoading ? (
            'מעדכן שערים...'
          ) : quotesError ? (
            <span className="text-red-500">{quotesError}</span>
          ) : (
            <span>עדכון אחרון: {lastFetchAt ? new Date(lastFetchAt).toLocaleTimeString('he-IL') : '—'}</span>
          )}
        </div>
      </div>

      {/* Mobile sort selector */}
      <div className="md:hidden flex items-center gap-2">
        <span className="text-sm font-semibold text-[#105330] shrink-0">מיון:</span>
        <select
          value={sortKey || ''}
          onChange={(e) => { setSortKey(e.target.value || null); setSortDir('desc'); }}
          className="flex-1 rounded-xl border-[#105330]/20 bg-white px-3 py-2 text-sm shadow-sm"
        >
          <option value="">ברירת מחדל</option>
          {columns.filter((c) => c.sortable).map((col) => (
            <option key={col.key} value={col.key}>{col.label}</option>
          ))}
        </select>
        <button
          onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
          disabled={!sortKey}
          className="px-3 py-2 rounded-xl bg-[#105330]/10 text-[#105330] disabled:opacity-30 text-sm font-bold"
          aria-label="הפוך כיוון מיון"
        >
          {sortDir === 'desc' ? '↓' : '↑'}
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center text-[#105330]/60 py-12 bg-white rounded-2xl border border-[#105330]/10">
          <p className="text-lg font-medium">לא נמצאו קרנות סל תואמות לחיפוש</p>
          <p className="text-sm mt-1">נסה לחפש לפי שם או סימול אחר</p>
        </div>
      ) : (
        <>
          {/* Desktop table view */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-[#105330]/10 shadow-lg">
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
                  <th className="px-4 py-3 font-semibold text-center">שווי נוכחי</th>
                  <th className="px-4 py-3 font-semibold text-center">שינוי יומי</th>
                  <th className="px-4 py-3 font-semibold text-center">שוק פעיל</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((e, idx) => {
                  const q = quotes[e.symbol];
                  const flashClass = flashes[e.symbol] === 'up' ? 'animate-flash-up' : flashes[e.symbol] === 'down' ? 'animate-flash-down' : '';
                  return (
                    <tr
                      key={e.symbol}
                      className={`border-b border-[#105330]/10 hover:bg-[#c8a863]/10 transition-colors ${idx % 2 === 1 ? 'bg-[#105330]/[0.03]' : 'bg-white'}`}
                    >
                      <td className="px-4 py-2.5 font-semibold text-[#105330] text-right">{e.name}</td>
                      <td className="px-4 py-2.5 text-slate-700 text-center">{e.mgmt}</td>
                      <td className="px-4 py-2.5 text-slate-700 text-center">{e.market}</td>
                      <td className="px-4 py-2.5 text-slate-600 dir-ltr text-center font-mono">{e.symbol}</td>
                      <td className={`px-4 py-2.5 font-semibold text-center ${e.accumulation ? 'text-blue-600' : 'text-orange-700'}`}>
                        {e.accumulation ? 'צוברת דיבידנדים' : 'מחלקת דיבידנדים'}
                      </td>
                      <td className={`px-3 py-2.5 text-sm font-mono font-bold text-slate-800 dir-ltr text-center rounded-lg ${flashClass}`}>
                        {q ? formatPrice(q.currentPrice, q.currency) : (quotesLoading ? <Loader2 className="w-4 h-4 animate-spin text-[#105330]/40 mx-auto" /> : '—')}
                      </td>
                      <td className={`px-3 py-2.5 text-xs dir-ltr text-center font-semibold ${q ? (q.changeToday >= 0 ? 'text-green-600' : 'text-red-600') : 'text-slate-400'}`}>
                        {q ? `${formatSigned(q.changeToday)} (${formatSigned(q.changePercent)}%)` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center"><MarketStatusPill q={q} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="md:hidden space-y-3">
            {sorted.map((e, idx) => {
              const q = quotes[e.symbol];
              const flashClass = flashes[e.symbol] === 'up' ? 'animate-flash-up' : flashes[e.symbol] === 'down' ? 'animate-flash-down' : '';
              return (
                <div
                  key={e.symbol}
                  className={`rounded-2xl border border-[#105330]/15 shadow-sm p-4 ${idx % 2 === 1 ? 'bg-[#105330]/[0.03]' : 'bg-white'}`}
                >
                  <div className="flex items-start justify-between gap-3 pb-3 mb-3 border-b border-[#105330]/10">
                    <div className="font-semibold text-[#105330] text-base leading-snug flex-1">{e.name}</div>
                    <div className="text-xs text-slate-500 dir-ltr font-mono whitespace-nowrap">#{e.symbol}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-sm">
                    <div className="text-slate-500">דמי ניהול</div>
                    <div className="text-slate-800 font-medium text-left dir-ltr">{e.mgmt}</div>
                    <div className="text-slate-500">שוק</div>
                    <div className="text-slate-800 text-left">{e.market}</div>
                    <div className="text-slate-500">סוג</div>
                    <div className={`text-left font-medium ${e.accumulation ? 'text-blue-600' : 'text-orange-700'}`}>
                      {e.accumulation ? 'צוברת דיבידנדים' : 'מחלקת דיבידנדים'}
                    </div>
                  </div>
                  {/* Live quote panel */}
                  <div className="mt-3 pt-3 border-t border-[#105330]/10 flex items-center justify-between gap-2">
                    <div className="text-right">
                      <div className="text-xs text-slate-500 mb-0.5">שווי נוכחי</div>
                      <div className={`font-mono font-bold text-slate-800 dir-ltr text-sm rounded px-1 ${flashClass}`}>
                        {q ? formatPrice(q.currentPrice, q.currency) : (quotesLoading ? '...' : '—')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500 mb-0.5">שינוי יומי</div>
                      <div className={`dir-ltr font-semibold text-sm ${q ? (q.changeToday >= 0 ? 'text-green-600' : 'text-red-600') : 'text-slate-400'}`}>
                        {q ? `${formatSigned(q.changeToday)} (${formatSigned(q.changePercent)}%)` : '—'}
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-xs text-slate-500 mb-0.5">שוק</div>
                      <MarketStatusPill q={q} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function IndicesSection() {
  const grouped = useMemo(() => {
    const map = new Map();
    for (const row of INDICES) {
      if (!map.has(row.region)) map.set(row.region, []);
      map.get(row.region).push(row);
    }
    return Array.from(map.entries());
  }, []);

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-[#0095cc]/30 shadow-lg">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th colSpan={3} className="px-4 py-3 font-bold text-white text-center text-lg bg-[#00b4ff]">
                מדדים
              </th>
            </tr>
            <tr className="bg-[#0095cc] text-white">
              <th className="px-4 py-3 font-semibold text-center w-24">אזור</th>
              <th className="px-4 py-3 font-semibold text-center w-40">שם המדד</th>
              <th className="px-4 py-3 font-semibold text-center">פירוט</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map(([region, rows]) =>
              rows.map((row, idx) => (
                <tr
                  key={`${region}-${row.name}`}
                  className={`border-b border-[#105330]/10 ${idx % 2 === 1 ? 'bg-[#105330]/[0.03]' : 'bg-white'}`}
                >
                  {idx === 0 && (
                    <td
                      rowSpan={rows.length}
                      className="px-4 py-3 font-bold text-[#105330] text-center align-middle bg-[#105330]/[0.05]"
                    >
                      {region}
                    </td>
                  )}
                  <td className="px-4 py-3 font-semibold text-slate-800 text-center">{row.name}</td>
                  <td className="px-4 py-3 text-slate-700 text-right whitespace-normal leading-relaxed">
                    {row.desc}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {grouped.map(([region, rows]) =>
          rows.map((row) => (
            <div
              key={`${region}-${row.name}`}
              className="rounded-2xl border border-[#0095cc]/30 bg-white shadow-sm p-4"
            >
              <div className="flex items-center justify-start gap-2 mb-2">
                <span className="inline-block rounded-full px-3 py-1 text-xs font-bold text-white bg-[#00b4ff]">
                  {region}
                </span>
                <span className="font-semibold text-slate-800 text-base">{row.name}</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{row.desc}</p>
            </div>
          ))
        )}
      </div>
    </>
  );
}

export default function IndicesAndETFs() {
  return (
    <div className="space-y-8" dir="rtl">
      <div className="mb-2">
        <h2 className="text-2xl font-bold text-[#105330]">מדדים וקרנות סל</h2>
        <p className="text-[#105330]/70 text-sm">טבלת קרנות סל (ETF) וטבלת מדדים פיננסיים</p>
      </div>

      {/* ETFs */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold text-[#105330]">קרנות סל</h3>
          <p className="text-[#105330]/70 text-sm">רשימת קרנות סל צוברות ומחלקות (ETF) — שערים מעודכנים אונליין וסטטוס מסחר</p>
        </div>
        <ETFSection />
      </div>

      {/* Indices */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold text-[#105330]">מדדים</h3>
          <p className="text-[#105330]/70 text-sm">הסברים על המדדים הפיננסיים המובילים</p>
        </div>
        <IndicesSection />
      </div>
    </div>
  );
}