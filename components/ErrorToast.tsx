import React, { useEffect } from 'react';
import { AlertCircle, X, CheckCircle } from 'lucide-react';

interface ErrorToastProps {
    message: string;
    type?: 'error' | 'success' | 'warning';
    onClose: () => void;
}

const ErrorToast: React.FC<ErrorToastProps> = ({ message, type = 'error', onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const getStyles = () => {
        switch (type) {
            case 'success': return 'bg-emerald-500/90 border-emerald-400/50 shadow-emerald-500/20';
            case 'warning': return 'bg-amber-500/90 border-amber-400/50 shadow-amber-500/20';
            case 'error': default: return 'bg-red-500/90 border-red-400/50 shadow-red-500/20';
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle size={20} className="text-white" />;
            case 'warning': return <AlertCircle size={20} className="text-white" />;
            case 'error': default: return <AlertCircle size={20} className="text-white" />;
        }
    };

    return (
        <div className={`
      fixed top-6 left-1/2 -translate-x-1/2 z-[100]
      flex items-center gap-3 px-6 py-3 rounded-2xl
      backdrop-blur-md border shadow-2xl
      animate-in fade-in slide-in-from-top-4 duration-300
      max-w-[90vw] md:max-w-md
      ${getStyles()}
    `}>
            {getIcon()}
            <p className="text-white font-medium text-sm md:text-base leading-tight">
                {message}
            </p>
            <button
                onClick={onClose}
                className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors text-white/80 hover:text-white"
            >
                <X size={16} />
            </button>
        </div>
    );
};

export default ErrorToast;
