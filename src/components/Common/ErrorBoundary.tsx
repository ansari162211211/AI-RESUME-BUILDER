import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const raw = error instanceof Error ? error.message : 'An unexpected error occurred.';
    const safeMessage =
      raw.startsWith('{') || raw.includes('FirebaseError:')
        ? 'Something unexpected happened while loading this page.'
        : raw;
    return { hasError: true, errorMessage: safeMessage };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo): void {
    console.error('Application ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = (): void => {
    this.setState({ hasError: false, errorMessage: null });
    window.location.assign('/');
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg shadow-xs p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Something went wrong</h1>
              <p className="text-sm text-slate-600 mt-1">
                {this.state.errorMessage || 'Please reload the page to continue.'}
              </p>
            </div>
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center justify-center px-4 py-2 bg-[#0f2b5c] hover:bg-[#0a1e42] text-white text-sm font-semibold rounded transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              <span>Return to Home</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
