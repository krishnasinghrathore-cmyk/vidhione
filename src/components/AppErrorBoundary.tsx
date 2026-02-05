'use client';
import React from 'react';

interface State {
  hasError: boolean;
  message?: string;
}

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('UI error caught by AppErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4">
          <h2 className="m-0">Something went wrong</h2>
          <p className="mt-2 mb-3 text-600">{this.state.message ?? 'Unexpected error'}</p>
          <a className="p-button p-component" href="/">
            <span className="p-button-label">Go to Dashboard</span>
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}

