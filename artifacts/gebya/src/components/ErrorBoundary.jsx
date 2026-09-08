import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white rounded-2xl border border-red-200 px-5 py-4 text-sm text-gray-600">
          {this.props.fallback || 'Something went wrong. Please refresh to try again.'}
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
