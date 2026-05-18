import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  handleRetry = () => {
    this.setState(prev => ({ hasError: false, error: null, retryCount: prev.retryCount + 1 }));
  };

  render() {
    if (this.state.hasError) {
      // For inline (non-fullscreen) errors — if a parent prop says so, show minimal UI
      if (this.props.inline) {
        return (
          <div dir="rtl" className="p-6 text-center">
            <p className="text-slate-500 text-sm mb-3">אירעה שגיאה בטעינת החלק הזה.</p>
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-[#105330] text-white rounded-lg text-sm font-medium hover:bg-[#0d4027] transition-colors"
            >
              נסה שוב
            </button>
          </div>
        );
      }

      return (
        <div dir="rtl" className="min-h-[60vh] bg-gradient-to-br from-[#f8f9f7] via-[#f5f6f4] to-[#f0f2ef] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
            <div className="h-2 bg-gradient-to-r from-[#105330] to-[#1a7a4a] rounded-full mb-8" />
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">משהו השתבש</h2>
            <p className="text-slate-500 text-sm mb-6">אירעה שגיאה בטעינת הדף. ניתן לנסות שוב.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-6 py-3 bg-[#105330] text-white rounded-xl font-semibold hover:bg-[#0d4027] transition-colors"
              >
                נסה שוב
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
              >
                רענן דף
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}