import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Calendar, ExternalLink } from 'lucide-react';

const FUND_TYPE_SELECTOR = [
  { key: 'keren_hishtalmut', label: 'קרנות השתלמות' },
  { key: 'gemel_lehashkaa',  label: 'קופת גמל להשקעה' },
  { key: 'kupot_gemel',      label: 'קופות גמל' },
  { key: 'keren_pensia',    label: 'קרנות פנסיה' },
  { key: 'polisot_hisachon', label: 'פוליסות חיסכון' },
];

function formatPct(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const sign = n >= 0 ? '+' : '-';
  return `${sign}${Math.abs(n).toFixed(2)}%`;
}

function cellColorClass(n) {
  if (n === null || n === undefined || isNaN(n)) return 'text-slate-400';
  return n >= 0 ? 'text-green-600' : 'text-red-600';
}

function FundTable({ route }) {
  if (!route.funds || !route.funds.length) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-[#105330]/10 p-4">
        <h3 className="font-bold text-[#105330] mb-2">{route.label}</h3>
        <p className="text-sm text-[#105330]/60">אין נתונים זמינים למסלול זה</p>
      </div>
    );
  }

  const columns =
    route.columns && route.columns.length === 5
      ? route.columns
      : ['שם', 'חודש', 'שנה', '3 שנים', '5 שנים'];

  return (
    <div className="rounded-2xl border border-[#105330]/10 shadow-sm overflow-hidden bg-white">
      <div className="bg-gradient-to-l from-[#f97316] to-[#ea580c] px-4 py-2.5">
        <h3 className="font-bold text-white text-sm md:text-base">{route.label}</h3>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#105330]/5">
              <th className="px-3 py-2 text-right font-semibold text-[#105330] w-10">#</th>
              {columns.map((c, i) => (
                <th
                  key={i}
                  className={`px-3 py-2 font-semibold text-[#105330] ${i === 0 ? 'text-right' : 'text-center'}`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {route.funds.map((fund, idx) => (
              <tr
                key={idx}
                className={`border-b border-[#105330]/5 ${idx % 2 === 1 ? 'bg-[#105330]/[0.02]' : 'bg-white'}`}
              >
                <td className="px-3 py-2 text-slate-500 text-center">{fund.rank || idx + 1}</td>
                <td className="px-3 py-2 text-right font-medium text-[#105330]">{fund.name}</td>
                <td className={`px-3 py-2 text-center dir-ltr font-mono font-medium ${cellColorClass(fund.ytd)}`}>
                  {formatPct(fund.ytd)}
                </td>
                <td className={`px-3 py-2 text-center dir-ltr font-mono font-medium ${cellColorClass(fund.year)}`}>
                  {formatPct(fund.year)}
                </td>
                <td className={`px-3 py-2 text-center dir-ltr font-mono font-medium ${cellColorClass(fund.three_year)}`}>
                  {formatPct(fund.three_year)}
                </td>
                <td className={`px-3 py-2 text-center dir-ltr font-mono font-medium ${cellColorClass(fund.five_year)}`}>
                  {formatPct(fund.five_year)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-[#105330]/10">
        {route.funds.map((fund, idx) => (
          <div key={idx} className={`p-3 ${idx % 2 === 1 ? 'bg-[#105330]/[0.02]' : 'bg-white'}`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-xs text-slate-400 shrink-0">#{fund.rank || idx + 1}</span>
              <span className="font-medium text-[#105330] flex-1 text-right text-sm leading-snug">
                {fund.name}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-x-1 text-xs">
              <div className="text-slate-500">{columns[1]}</div>
              <div className="text-slate-500">{columns[2]}</div>
              <div className="text-slate-500">{columns[3]}</div>
              <div className="text-slate-500">{columns[4]}</div>
              <div className={`dir-ltr font-mono font-bold ${cellColorClass(fund.ytd)}`}>
                {formatPct(fund.ytd)}
              </div>
              <div className={`dir-ltr font-mono font-bold ${cellColorClass(fund.year)}`}>
                {formatPct(fund.year)}
              </div>
              <div className={`dir-ltr font-mono font-bold ${cellColorClass(fund.three_year)}`}>
                {formatPct(fund.three_year)}
              </div>
              <div className={`dir-ltr font-mono font-bold ${cellColorClass(fund.five_year)}`}>
                {formatPct(fund.five_year)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ManagedFundsYields() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFundType, setSelectedFundType] = useState('keren_hishtalmut');
  const [fetchedAt, setFetchedAt] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (!cancelled) setLoading(true);
        const response = await base44.functions.invoke('fetchManagedFunds', {});
        if (cancelled) return;
        if (response?.data?.fund_types && response.data.fund_types.length > 0) {
          setData(response.data);
          setFetchedAt(response.data.fetchedAt);
          setError('');
        } else {
          setData(null);
          setError('נתונים אינם זמינים כעת. נסה רענון ידני.');
        }
      } catch (e) {
        if (!cancelled) setError('נכשל בטעינת נתונים מ-mygemel.net');
        console.error('Managed funds fetch failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  const selectedFundTypeData =
    data && data.fund_types
      ? data.fund_types.find((ft) => ft.key === selectedFundType)
      : null;

  const sourceUrl = selectedFundTypeData?.source_url;
  const formattedFetchedAt = fetchedAt
    ? new Date(fetchedAt).toLocaleString('he-IL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  return (
    <div dir="rtl" className="space-y-4">
      {/* Header note */}
      <p className="text-sm text-[#105330]/70 leading-relaxed">
        השוואת מסלולים בקופות גמל, קרנות השתלמות ופנסיה. הנתונים מתעדכנים אוטומטית פעם בחודש
        (ב-30 לחודש) ישירות מאתר mygemel.net.
      </p>

      {/* Fund type selector */}
      <div className="flex flex-wrap gap-2">
        {FUND_TYPE_SELECTOR.map((ft) => {
          const active = ft.key === selectedFundType;
          return (
            <button
              key={ft.key}
              onClick={() => setSelectedFundType(ft.key)}
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all shadow-sm
                ${active
                  ? 'bg-gradient-to-l from-[#f97316] to-[#ea580c] text-white shadow-md'
                  : 'bg-white text-[#105330] border border-[#105330]/15 hover:bg-[#f97316]/10'}`}
            >
              {ft.label}
            </button>
          );
        })}
      </div>

      {/* Last updated */}
      <div className="flex items-center gap-2 text-sm text-[#105330]/70">
        <Calendar className="w-4 h-4" />
        <span>עדכון אחרון: {formattedFetchedAt}</span>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-3 p-8 text-[#105330]">
          <Loader2 className="w-5 h-5 animate-spin" />
          טוען נתונים מ-mygemel.net...
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="p-4 bg-[#105330]/5 border border-[#105330]/15 rounded-2xl text-[#105330]/80">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && (!selectedFundTypeData || !selectedFundTypeData.routes || selectedFundTypeData.routes.length === 0) && (
        <div className="p-8 text-center text-[#105330]/60">אין נתונים זמינים {selectedFundTypeData?.error ? `(${selectedFundTypeData.error})` : ''}</div>
      )}

      {/* Fund type content */}
      {selectedFundTypeData && selectedFundTypeData.routes && selectedFundTypeData.routes.length > 0 && !loading && (
        <div className="space-y-6">
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#105330]/60 hover:text-[#105330] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              צפייה במקור ב-mygamel.net
            </a>
          )}
          {selectedFundTypeData.routes.map((route) => (
            <FundTable key={route.key} route={route} />
          ))}
        </div>
      )}
    </div>
  );
}