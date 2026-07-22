import React, { useEffect, useRef } from 'react';

/**
 * TradingView "Market Overview" widget showing live FX, Bitcoin and TA-125 quotes.
 * Renders TradingView's external embed script; the JSON config drives the widget.
 */
export default function TradingViewRatesWidget() {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Avoid duplicate widgets if the effect re-runs
    el.innerHTML = '';

    const widgetHolder = document.createElement('div');
    widgetHolder.className = 'tradingview-widget-container__widget';
    el.appendChild(widgetHolder);

    const script = document.createElement('script');
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: 'light',
      dateRange: '12M',
      showChart: false,
      locale: 'he_IL',
      width: '100%',
      height: 320,
      largeChartUrl: '',
      isTransparent: false,
      showSymbolLogo: true,
      showFloatingTooltip: false,
      tabs: [
        {
          title: 'שערים ומדדים מובילים',
          symbols: [
            { s: 'FX_IDC:USDILS', d: 'שער הדולר (USD/ILS)' },
            { s: 'FX_IDC:EURILS', d: 'שער האירו (EUR/ILS)' },
            { s: 'BINANCE:BTCUSD', d: 'ביטקוין (BTC/USD)' },
            { s: 'TASE:TA125', d: 'מדד תל אביב 125' },
          ],
        },
      ],
    });
    el.appendChild(script);
  }, []);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ maxWidth: 450, margin: '20px auto', fontFamily: 'sans-serif' }}
    />
  );
}