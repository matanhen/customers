import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

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

function ETFSection() {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('desc');

  const columns = [
    { key: 'name',         label: 'שם הקרן',         sortable: false },
    { key: 'mgmt',         label: 'דמי ניהול',         sortable: true  },
    { key: 'market',       label: 'שוק',               sortable: false },
    { key: 'symbol',       label: 'סימול',             sortable: true  },
    { key: 'accumulation', label: 'צוברת / מחלקת',     sortable: true  },
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
      let av, bv;
      if (sortKey === 'accumulation') {
        av = a.accumulation ? 1 : 0;
        bv = b.accumulation ? 1 : 0;
      } else {
        av = parseNumeric(a[sortKey]);
        bv = parseNumeric(b[sortKey]);
        av = isNaN(av) ? -Infinity : av;
        bv = isNaN(bv) ? -Infinity : bv;
      }
      return sortDir === 'desc' ? bv - av : av - bv;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
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

      {/* Table or empty state */}
      {sorted.length === 0 ? (
        <div className="text-center text-[#105330]/60 py-12 bg-white rounded-2xl border border-[#105330]/10">
          <p className="text-lg font-medium">לא נמצאו קרנות סל תואמות לחיפוש</p>
          <p className="text-sm mt-1">נסה לחפש לפי שם או סימול אחר</p>
        </div>
      ) : (
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
              {sorted.map((e, idx) => (
                <tr
                  key={e.symbol}
                  className={`border-b border-[#105330]/10 hover:bg-[#c8a863]/10 transition-colors ${idx % 2 === 1 ? 'bg-[#105330]/[0.03]' : 'bg-white'}`}
                >
                  <td className="px-4 py-2.5 font-semibold text-[#105330] text-right">{e.name}</td>
                  <td className="px-4 py-2.5 text-slate-700 text-center">{e.mgmt}</td>
                  <td className="px-4 py-2.5 text-slate-700 text-center">{e.market}</td>
                  <td className="px-4 py-2.5 text-slate-600 dir-ltr text-center font-mono">{e.symbol}</td>
                  <td
                    className={`px-4 py-2.5 font-semibold text-center ${
                      e.accumulation ? 'text-blue-600' : 'text-orange-700'
                    }`}
                  >
                    {e.accumulation ? 'צוברת דיבידנדים' : 'מחלקת דיבידנדים'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    <div className="overflow-x-auto rounded-2xl border border-[#0095cc]/30 shadow-lg">
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
          <p className="text-[#105330]/70 text-sm">רשימת קרנות סל צוברות ומחלקות (ETF)</p>
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