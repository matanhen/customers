import { useRef, useEffect, useCallback } from 'react';

/**
 * Robust auto-save hook that prevents data loss across desktop and mobile.
 *
 * Key guarantees:
 * 1. Debounced saves with configurable delay.
 * 2. Flushes pending save on `visibilitychange` (mobile background / tab switch).
 * 3. Flushes pending save on `pagehide` and `beforeunload` (page close / navigation).
 * 4. Flushes pending save on component unmount (in-app navigation).
 * 5. Keeps `pendingDataRef` until the debounced timer fires (not cleared prematurely),
 *    so a flush always has the latest data to save.
 *
 * @param {Function} saveFn  - Receives the data to save (e.g. `saveMutation.mutate`).
 * @param {number}   debounceMs - Debounce delay in milliseconds.
 * @returns {{ triggerSave: Function, flushSave: Function }}
 */
export function useAutoSave(saveFn, debounceMs = 500) {
  const timerRef = useRef(null);
  const pendingDataRef = useRef(null);
  const saveFnRef = useRef(saveFn);

  useEffect(() => { saveFnRef.current = saveFn; }, [saveFn]);

  const flushSave = useCallback(() => {
    if (pendingDataRef.current) {
      clearTimeout(timerRef.current);
      const data = pendingDataRef.current;
      pendingDataRef.current = null;
      saveFnRef.current(data);
    }
  }, []);

  const triggerSave = useCallback((data) => {
    pendingDataRef.current = data;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (pendingDataRef.current) {
        const d = pendingDataRef.current;
        pendingDataRef.current = null;
        saveFnRef.current(d);
      }
    }, debounceMs);
  }, [debounceMs]);

  // Flush on visibility change (mobile background / tab switch), page hide, and before unload
  useEffect(() => {
    const handleVisibility = () => { if (document.hidden) flushSave(); };
    const handlePageHide = () => flushSave();
    const handleBeforeUnload = () => flushSave();

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      flushSave(); // Flush on unmount (in-app navigation)
    };
  }, [flushSave]);

  return { triggerSave, flushSave };
}