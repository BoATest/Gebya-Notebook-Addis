import { Component } from 'react';
import { isErrorReportingEnabled } from '../sentry';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env?.DEV) console.error('[ErrorBoundary]', error, info);
    // Production render crashes were previously swallowed here and invisible to
    // monitoring. Report to Sentry only when the user's error-reporting consent
    // is on (same privacy gate as initSentry).
    try {
      if (!import.meta.env?.DEV && isErrorReportingEnabled()) {
        void import('@sentry/react').then((Sentry) =>
          Sentry.captureException(error, { extra: { componentStack: info?.componentStack } }),
        );
      }
    } catch {
      // never let reporting break the fallback UI
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '16px',
          border: '1px solid var(--color-danger)',
          borderRadius: 8,
          background: 'var(--color-bg-accent-red)',
          color: 'var(--color-danger)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>
            ⚠️ {this.props.title || 'Something went wrong'}
          </div>
          <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: 12 }}>
            {this.props.message || 'An unexpected error occurred. Please try refreshing.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              if (this.props.onRetry) this.props.onRetry();
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid var(--color-danger)',
              background: 'transparent',
              color: 'var(--color-danger)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
          >
            {this.props.retryLabel || 'Try Again'}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
