import React, { useState, useEffect } from 'react';
import { Loader2, ChevronUp, ChevronDown, ChevronsUpDown, Activity, PieChart } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// The data is stored in the ManagedFundData entity, refreshed monthly via
// automation on the 30th. The frontend fetches once on mount; no daily polling needed.

function formatPercent(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function returnColorClass(n) {
  if (n === null || n === undefined || isNaN(n)) return 'text-slate-500';
  if (n > 0) return 'text-green-700 font-semibold';
  if (n < 0) return 'text-red-600 font-semibold';
  return 'text-slate-700 font-medium';
}

function CategoryTable({ category }) {
  const [sortKey, setSortKey] = useState('ytd_return_percent');
  const [sortDir, setSortDir] = useState('desc');

  const columns = [
    { key: 'name',                     label: 'שם הקופה',           sortable: false },
    { key: 'fund_house',               label: 'גוף מנהל',            sortable: false },
    { key: 'ytd_return_percent',       label: 'תשואה מתחילת שנה', sortable: true  },
    { key: 'one_year_return_percent',  label: 'תשואה 1 שנה',       sortable: true  },
    { key: 'three_year_return_percent',label: 'תשואה 3 שנים',      sortable: true  },
    { key: 'five_year_return_percent', label: 'תשואה 5 שנים',      sortable: true  },
    { key: 'management_fee_percent',   label: 'דמי ניהול %',       sortable: true  },
  ];

  const funds = Array.isArray(category.funds) ? category.funds : [];

  const numVal = (f, key) => {
    const v = f[key];
    const n = typeof v === 'number' ? v : parseFloat(v);
    return isNaN(n) ? null : n;
  };

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedFunds = [...funds].sort((a, b) => {
    const av = numVal(a, sortKey);
    const bv = numVal(b, sortKey);
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    return sortDir === 'desc' ? bv - av : av - bv;
  });

  if (funds.length === 0) {
    return (
      <div className="rounded-2xl border border-[#105330]/10 bg-white p-6 text-center">
        <p className="text-[#105330]/60 font-medium">אין נתונים זמינים כעת עבור {category.label}.</p>
        <p className="text-sm text-[#105330]/50 mt-1">הנתונים מתעדכנים אוטומטית מ-mygemel. נסה לרענן מאוחר יותר.</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile sort selector */}
      <div className="md:hidden mb-3 flex items-center gap-2">
        <span className="text-sm font-semibold text-[#105330] shrink-0">מיון:</span>
        <select
          value={sortKey}
          onChange={(e) => { setSortKey(e.target.value); setSortDir('desc'); }}
          className="flex-1 rounded-xl border-[#105330]/20 bg-white px-3 py-2 text-sm shadow-sm"
        >
          {columns.filter((c) => c.sortable).map((col) => (
            <option key={col.key} value={col.key}>{col.label}</option>
          ))}
        </select>
        <button
          onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
          className="px-3 py-2 rounded-xl bg-[#105330]/10 text-[#105330] text-sm font-bold"
          aria-label="הפוך כיוון מיון"
        >
          {sortDir === 'desc' ? '↓' : '↑'}
        </button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-[#105330]/10 shadow-lg">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-gradient-to-l from-[#105330] to-[#1a7a4a] text-white">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                  className={`px-3 py-3 font-semibold text-center ${col.sortable ? 'cursor-pointer hover:bg-white/10 transition-colors select-none' : ''}`}
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
                key={`${f.name}-${idx}`}
                className={`border-b border-[#105330]/10 hover:bg-[#c8a863]/10 transition-colors ${idx % 2 === 1 ? 'bg-[#105330]/[0.03]' : 'bg-white'}`}
              >
                <td className="px-3 py-2.5 font-semibold text-[#105330] text-right">{f.name || '—'}</td>
                <td className="px-3 py-2.5 text-slate-700 text-center">{f.fund_house || '—'}</td>
                <td className={`px-3 py-2.5 text-center ${returnColorClass(numVal(f, 'ytd_return_percent'))}`}>
                  {formatPercent(numVal(f, 'ytd_return_percent'))}
                </td>
                <td className={`px-3 py-2.5 text-center ${returnColorClass(numVal(f, 'one_year_return_percent'))}`}>
                  {formatPercent(numVal(f, 'one_year_return_percent'))}
                </td>
                <td className={`px-3 py-2.5 text-center ${returnColorClass(numVal(f, 'three_year_return_percent'))}`}>
                  {formatPercent(numVal(f, 'three_year_return_percent'))}
                </td>
                <td className={`px-3 py-2.5 text-center ${returnColorClass(numVal(f, 'five_year_return_percent'))}`}>
                  {formatPercent(numVal(f, 'five_year_return_percent'))}
                </td>
                <td className="px-3 py-2.5 text-slate-700 text-center dir-ltr">
                  {numVal(f, 'management_fee_percent') !== null ? `${numVal(f, 'management_fee_percent').toFixed(2)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {sortedFunds.map((f, idx) => (
          <div
            key={`${f.name}-${idx}`}
            className={`rounded-2xl border border-[#105330]/15 shadow-sm p-4 ${idx % 2 === 1 ? 'bg-[#105330]/[0.03]' : 'bg-white'}`}
          >
            <div className="font-semibold text-[#105330] text-base leading-snug">{f.name || '—'}</div>
            {f.fund_house && (
              <div className="text-xs text-slate-500 mb-3">{f.fund_house}</div>
            )}
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-sm">
              <div className="text-slate-500">תשואה מתחילת שנה</div>
              <div className={`text-left ${returnColorClass(numVal(f, 'ytd_return_percent'))}`}>
                {formatPercent(numVal(f, 'ytd_return_percent'))}
              </div>
              <div className="text-slate-500">תשואה 1 שנה</div>
              <div className={`text-left ${returnColorClass(numVal(f, 'one_year_return_percent'))}`}>
                {formatPercent(numVal(f, 'one_year_return_percent'))}
              </div>
              <div className="text-slate-500">תשואה 3 שנים</div>
              <div className={`text-left ${returnColorClass(numVal(f, 'three_year_return_percent'))}`}>
                {formatPercent(numVal(f, 'three_year_return_percent'))}
              </div>
              <div className="text-slate-500">תשואה 5 שנים</div>
              <div className={`text-left ${returnColorClass(numVal(f, 'five_year_return_percent'))}`}>
                {formatPercent(numVal(f, 'five_year_return_percent'))}
              </div>
              <div className="text-slate-500">דמי ניהול</div>
              <div className="text-slate-800 font-medium text-left dir-ltr">
                {numVal(f, 'management_fee_percent') !== null ? `${numVal(f, 'management_fee_percent').toFixed(2)}%` : '—'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default function ManagedFundsYields() {
  const [categories, setCategories] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastFetchAt, setLastFetchAt] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        if (!cancelled) {
          if (!categories) setLoading(true);
          else setRefreshing(true);
        }
        const response = await base44.functions.invoke('fetchManagedFunds', {});
        if (cancelled) return;
        if (response?.data?.categories) {
          setCategories(response.data.categories);
          setLastFetchAt(response.data.fetchedAt || new Date().toISOString());
          if (!cancelled) setError('');
        }
      } catch (e) {
        if (!cancelled) setError('נכשל בטעינת נתונים מ-mygemel');
        console.error('Managed funds fetch failed', e);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    refresh();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#7a4a10] to-[#b06a1a] flex items-center justify-center shadow-lg">
            <PieChart className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-[#105330]">תשואות קופות מנוהלות</h2>
            <p className="text-[#105330]/70 text-sm">השוואת תשואות בין קרנות השתלמות, קופות גמל וקרנות פנסיה — מקור: mygemel.co.il</p>
          </div>
          <button
            onClick={() => {
              setRefreshing(true);
              base44.functions.invoke('fetchManagedFunds', {})
                .then((r) => {
                  if (r?.data?.categories) {
                    setCategories(r.data.categories);
                    setLastFetchAt(r.data.fetchedAt || new Date().toISOString());
                    setError('');
                  }
                })
                .catch((e) => setError('נכשל בעדכון'))
                .finally(() => setRefreshing(false));
            }}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#105330]/10 text-[#105330] text-sm font-semibold hover:bg-[#105330]/15 disabled:opacity-50"
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
            רענן
          </button>
        </div>
        {lastFetchAt && !loading && (
          <div className="flex items-center gap-2 text-xs text-[#105330]/70">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            עדכון אחרון: {new Date(lastFetchAt).toLocaleString('he-IL')}
          </div>
        )}
      </div>

      {loading && !categories && (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#105330]/10">
          <Loader2 className="w-12 h-12 animate-spin text-[#105330]/40 mx-auto mb-3" />
          <p className="text-[#105330] font-medium">טוען נתונים מ-mygemel...</p>
          <p className="text-sm text-[#105330]/60 mt-1">הטעינה הראשונית יכולה לקחת עד דקה</p>
        </div>
      )}

      {error && !loading && (
        <div className="text-center py-12 bg-red-50 rounded-2xl border border-red-200">
          <p className="text-red-700 font-medium text-lg">{error}</p>
          <p className="text-sm text-red-600 mt-1">נסו לרענן מאוחר יותר</p>
        </div>
      )}

      {categories && (
        <div className="space-y-8">
          {categories.map((cat) => (
            <div key={cat.key} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-[#105330]">{cat.label}</h3>
                {cat.funds && cat.funds.length > 0 && (
                  <span className="text-xs text-[#105330]/60 bg-[#105330]/5 px-2 py-1 rounded-full">
                    {cat.funds.length} קופות
                  </span>
                )}
              </div>
              <CategoryTable category={cat} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}