import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white rounded-3xl p-8 border border-red-200 shadow-xl text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">
              Terjadi Kendala Memuat Laporan
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Komponen laporan mengalami kesalahan sementara. Data Anda tetap aman.
            </p>
            {this.state.error && (
              <div className="bg-red-50 text-red-800 p-3 rounded-xl text-xs font-mono mb-6 text-left overflow-x-auto max-h-32 border border-red-100">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
              >
                <RefreshCw size={16} /> Coba Muat Ulang
              </button>
              {this.props.onGoHome && (
                <button
                  onClick={this.props.onGoHome}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Home size={16} /> Kembali ke Menu Utama
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
