import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDestructive?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    onConfirm,
    onCancel,
    isDestructive = false
}) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setVisible(true);
        } else {
            setTimeout(() => setVisible(false), 300); // Wait for exit anim
        }
    }, [isOpen]);

    if (!visible) return null;

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onCancel}
            />

            {/* Dialog Card */}
            <div
                className={`
          relative w-full max-w-sm 
          bg-surface border border-[var(--border-color)]
          rounded-3xl shadow-2xl overflow-hidden
          transform transition-all duration-300
          ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}
        `}
            >
                <div className="p-6 flex flex-col items-center text-center">
                    {/* Icon */}
                    <div className={`mb-4 p-4 rounded-full ${isDestructive ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                        {isDestructive ? <AlertTriangle size={32} /> : <AlertTriangle size={32} />}
                    </div>

                    <h3 className="text-xl font-bold text-text mb-2">{title}</h3>
                    <p className="text-muted text-sm mb-6 leading-relaxed">
                        {message}
                    </p>

                    <div className="flex gap-3 w-full">
                        <button
                            onClick={onCancel}
                            className="flex-1 py-3 bg-surface border border-[var(--border-color)] rounded-xl font-bold text-muted hover:bg-slate-700/5 transition"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition transform hover:scale-105 ${isDestructive ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-sky-400'}`}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
