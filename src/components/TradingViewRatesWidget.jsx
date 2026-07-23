import React, { useEffect, useRef } from 'react';

const SYMBOLS = [
  { proName: 'FX_IDC:USDILS', title: 'שער הדולר' },
  { proName: 'FX_IDC:EURILS', title: 'שער האירו' },
  { proName: 'BINANCE:BTCUSD', title: 'ביטקוין' },
  { proName: 'TASE:TA125',   title: 'ת"א 125' },
];

export default function TradingViewRatesWidget() {
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
      symbols: SYMBOLS,
      showSymbolLogo: true,
      colorTheme: 'light',
      isTransparent: true,
      displayMode: 'adaptive',
      locale: 'he_IL',
    });
    el.appendChild(script);
  }, []);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container rounded-xl overflow-hidden border border-[#105330]/10 bg-white"
    />
  );
}