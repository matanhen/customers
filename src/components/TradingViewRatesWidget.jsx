import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';

const SYMBOLS = [
  { symbol: 'FX_IDC:USDILS', label: 'שער הדולר', sub: 'USD/ILS' },
  { symbol: 'FX_IDC:EURILS', label: 'שער האירו', sub: 'EUR/ILS' },
  { symbol: 'BINANCE:BTCUSD', label: 'ביטקוין', sub: 'BTC/USD' },
  { symbol: 'TASE:TA125',    label: 'ת"א 125',  sub: 'תל אביב 125' },
];

function RatesTickerTape() {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.innerHTML = '';

    const holder = document.createElement('div');
    holder.className = 'tradingview-widget-container__widget';
    el.appendChild(holder);

    const script = document.createElement('script');
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: 'FX_IDC:USDILS', title: 'שער הדולר' },
        { proName: 'FX_IDC:EURILS', title: 'שער האירו' },
        { proName: 'BINANCE:BTCUSD', title: 'ביטקוין' },
        { proName: 'TASE:TA125', title: 'ת"א 125' },
      ],
      showSymbolLogo: true,
      colorTheme: 'light',
      isTransparent: true,
      displayMode: 'adaptive',
      locale: 'he_IL',
    });
    el.appendChild(script);
  }, []);

  return (
    <div ref={containerRef} className="tradingview-widget-container rounded-xl overflow-hidden border border-[#105330]/10 bg-white" />
  );
}

function MiniSymbolWidget({ symbol, label, sub }) {
  const containerRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.innerHTML = '';

    const holder = document.createElement('div');
    holder.className = 'tradingview-widget-container__widget';
    el.appendChild(holder);

    const script = document.createElement('script');
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol,
      width: '100%',
      // Enough height to render both the symbol/price overlay and the chart
      height: isMobile ? 140 : 160,
      locale: 'he_IL',
      dateRange: '1M',
      colorTheme: 'light',
      isTransparent: true,
      autosize: false,
      largeChartUrl: '',
      chartOnly: false,
      noTimeScale: true,
    });
    el.appendChild(script);
  }, [symbol, isMobile]);

  return (
    <Card className="border-0 shadow-lg overflow-hidden h-full">
      <div className="flex items-center justify-between md:px-3 md:pt-2.5 md:pb-1 px-2 pt-1.5 pb-1">
        <span className="text-[11px] md:text-sm font-bold text-[#105330] truncate">
          {label}
        </span>
        <span className="text-[8px] md:text-[10px] text-[#c8a863] font-medium hidden md:inline">
          {sub}
        </span>
      </div>
      <CardContent className="pt-0 pb-1.5 md:pb-2 px-1 md:px-1">
        <div ref={containerRef} className="tradingview-widget-container" />
      </CardContent>
    </Card>
  );
}

export default function TradingViewRatesWidget() {
  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 md:gap-3 mb-2">
        {SYMBOLS.map((sym) => (
          <MiniSymbolWidget key={sym.symbol} {...sym} />
        ))}
      </div>
      {/* Explicit change strip — current price, daily change in absolute number, and % */}
      <RatesTickerTape />
    </div>
  );
}