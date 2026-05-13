import { useState, useRef, useCallback } from 'react';

const THRESHOLD = 72;

export default function PullToRefresh({ onRefresh, children }) {
  const [pulling, setPulling] = useState(false);
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);

  const onTouchStart = useCallback((e) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const onTouchMove = useCallback((e) => {
    if (startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0 && window.scrollY === 0) {
      setPulling(true);
      setPullY(Math.min(delta * 0.5, THRESHOLD + 20));
    }
  }, []);

  const onTouchEnd = useCallback(async () => {
    if (pullY >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullY(THRESHOLD);
      await onRefresh();
      setRefreshing(false);
    }
    startY.current = null;
    setPulling(false);
    setPullY(0);
  }, [pullY, refreshing, onRefresh]);

  const showIndicator = pulling || refreshing;

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="relative"
    >
      {showIndicator && (
        <div
          className="flex items-center justify-center overflow-hidden transition-all duration-200"
          style={{ height: pullY }}
        >
          <div className={`w-7 h-7 border-4 border-[#105330]/30 border-t-[#105330] rounded-full ${refreshing ? 'animate-spin' : ''}`} />
        </div>
      )}
      {children}
    </div>
  );
}