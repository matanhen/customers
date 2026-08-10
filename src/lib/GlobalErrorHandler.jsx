import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Global listener for unhandled errors and promise rejections.
 * Logs them to analytics so the admin can investigate crashes that
 * don't trigger the React ErrorBoundary (async callbacks, event handlers, etc.).
 */
export default function GlobalErrorHandler() {
  useEffect(() => {
    const handleError = (event) => {
      try {
        base44.analytics.track({
          eventName: 'unhandled_error',
          properties: {
            error_message: String(event.error?.message || event.message || '').slice(0, 500),
            url: window.location.href,
          },
        });
      } catch (e) { /* swallow */ }
    };

    const handleRejection = (event) => {
      try {
        base44.analytics.track({
          eventName: 'unhandled_promise_rejection',
          properties: {
            error_message: String(event.reason?.message || event.reason || '').slice(0, 500),
            url: window.location.href,
          },
        });
      } catch (e) { /* swallow */ }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return null;
}