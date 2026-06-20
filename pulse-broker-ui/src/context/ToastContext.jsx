import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'success') => {
        const id = Date.now() + Math.random().toString(36);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(toast => toast.id !== id));
        }, 3000);
    }, []);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="fixed top-20 right-4 z-50 flex flex-col gap-2">
                {toasts.map(toast => (
                    <div 
                        key={toast.id} 
                        role="status"
                        aria-live="polite"
                        className={`animate-slide-in flex items-center p-4 mb-2 text-white rounded-lg shadow-xl max-w-[90vw] min-w-[250px] transition-all transform ${
                            toast.type === 'success' ? 'bg-moneyGreen' : 'bg-primary'
                        }`}
                        style={{ animation: 'slideIn 0.3s ease-out forwards' }}
                    >
                        <div className="ml-3 text-sm font-bold tracking-wide">{toast.message}</div>
                    </div>
                ))}
            </div>
            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </ToastContext.Provider>
    );
};

export const useToast = () => useContext(ToastContext);
