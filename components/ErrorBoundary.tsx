import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    private handleReset = () => {
        window.location.reload();
    };

    private handleGoHome = () => {
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 text-red-500">
                        <AlertTriangle size={40} />
                    </div>
                    <h1 className="text-3xl font-bold mb-4">Something went wrong</h1>
                    <p className="text-zinc-400 max-w-md mb-8">
                        An unexpected error occurred. Don't worry, your reading progress is likely safe in our local database.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs">
                        <button
                            onClick={this.handleReset}
                            className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition active:scale-95"
                        >
                            <RefreshCw size={20} />
                            Reload App
                        </button>
                        <button
                            onClick={this.handleGoHome}
                            className="flex items-center justify-center gap-2 bg-zinc-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-zinc-700 transition active:scale-95"
                        >
                            <Home size={20} />
                            Return Home
                        </button>
                    </div>

                    {process.env.NODE_ENV === 'development' && (
                        <div className="mt-12 p-4 bg-zinc-900 rounded-lg text-left w-full max-w-2xl overflow-auto border border-zinc-800">
                            <p className="text-red-400 font-mono text-sm mb-2">{this.state.error?.name}: {this.state.error?.message}</p>
                            <pre className="text-xs text-zinc-500 font-mono leading-relaxed">
                                {this.state.error?.stack}
                            </pre>
                        </div>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
