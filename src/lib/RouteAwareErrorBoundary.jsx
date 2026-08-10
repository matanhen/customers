import React from 'react';
import { useLocation } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary';

/**
 * Wraps ErrorBoundary so it auto-resets when the user navigates to a different route.
 * This lets users recover from a crashed page by simply navigating away and back.
 */
export default function RouteAwareErrorBoundary({ children, inline }) {
  const location = useLocation();
  return (
    <ErrorBoundary resetKey={location.pathname} inline={inline}>
      {children}
    </ErrorBoundary>
  );
}