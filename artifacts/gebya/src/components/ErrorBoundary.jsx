import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, info);
    }
  }

  handleReload() {
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
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
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>😕</div>
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
              marginBottom: '24px',
              textAlign: 'center',
            }}
          >
            ችግር ተፈጥሯል — tap to reload
          </p>
          <button
            onClick={this.handleReload}
            style={{
              background: '#7c3d12',
              color: '#fff',
              border: 'none',
              borderRadius: '16px',
              padding: '14px 32px',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              minHeight: '52px',
            }}
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
