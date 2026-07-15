// ErrorBoundary.jsx — Catches chapter errors without crashing the whole page.

import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Chapter error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
        }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: '#991b1b' }}>
            Something went wrong in this section.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            style={{
              marginTop: 8,
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #dc2626',
              background: '#fff',
              color: '#dc2626',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
