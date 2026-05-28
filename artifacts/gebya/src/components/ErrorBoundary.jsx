import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Always log — production visibility is essential to diagnose real reports.
    // eslint-disable-next-line no-console
    console.error('[Gebya] ErrorBoundary caught:', error?.message, error?.stack, info?.componentStack);
    this.setState({ info });
  }

  handleReload() {
    window.location.reload();
  }

  handleCopy() {
    const { error, info } = this.state;
    const text = [
      `Error: ${error?.message || 'unknown'}`,
      `Stack: ${error?.stack || ''}`,
      `Component: ${info?.componentStack || ''}`,
      `Time: ${new Date().toISOString()}`,
      `URL: ${typeof window !== 'undefined' ? window.location.href : ''}`,
      `UA: ${typeof navigator !== 'undefined' ? navigator.userAgent : ''}`,
    ].join('\n\n');
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text);
      }
    } catch {}
  }

  render() {
    if (this.state.hasError) {
      const errMsg = this.state.error?.message || 'Unknown error';
      return (
        <div
          style={{
            minHeight: '100svh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fdf8f0',
            padding: '24px',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>!</div>
          <h1
            style={{
              fontSize: '1.25rem',
              fontWeight: 900,
              color: '#7c3d12',
              marginBottom: '8px',
              textAlign: 'center',
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: '0.875rem',
              color: '#9ca3af',
              marginBottom: '16px',
              textAlign: 'center',
            }}
          >
            A problem occurred. Tap reload to continue.
          </p>
          <div
            style={{
              maxWidth: '480px',
              width: '100%',
              padding: '12px',
              background: '#fff',
              border: '1px solid #f5c993',
              borderRadius: '8px',
              fontSize: '0.75rem',
              color: '#7c3d12',
              fontFamily: 'monospace',
              wordBreak: 'break-word',
              marginBottom: '16px',
              maxHeight: '120px',
              overflowY: 'auto',
            }}
          >
            {errMsg}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => this.handleReload()}
              style={{
                background: '#7c3d12',
                color: '#fff',
                border: 'none',
                borderRadius: '16px',
                padding: '14px 24px',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: 'pointer',
                minHeight: '48px',
              }}
            >
              Reload
            </button>
            <button
              onClick={() => this.handleCopy()}
              style={{
                background: '#fff',
                color: '#7c3d12',
                border: '1px solid #7c3d12',
                borderRadius: '16px',
                padding: '14px 24px',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: 'pointer',
                minHeight: '48px',
              }}
            >
              Copy error
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
