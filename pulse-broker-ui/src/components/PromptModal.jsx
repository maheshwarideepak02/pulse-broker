import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';

const PromptModal = ({ isOpen, title, message, defaultValue = '', placeholder = '', inputLabel = '', type = 'text', secret = false, isBusy = false, onConfirm, onCancel, confirmText, cancelText }) => {
    const { t } = useLanguage();
    const [value, setValue] = useState(defaultValue);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setValue(defaultValue);
            // Small delay to allow transition before focusing
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                    inputRef.current.select();
                }
            }, 100);
        }
    }, [isOpen, defaultValue]);

    // Handle escape to cancel and enter to submit
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen || isBusy) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                onConfirm(value);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, value, onConfirm, onCancel, isBusy]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="prompt-title">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={isBusy ? undefined : onCancel}></div>
            
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 animate-slide-in overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
                <div className="p-6">
                    <h2 id="prompt-title" className="text-xl font-extrabold text-gray-900 mb-2">{title}</h2>
                    {message && <p className="text-sm font-bold text-gray-500 mb-6">{message}</p>}
                    
                    {inputLabel && <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{inputLabel}</label>}
                    <input
                        ref={inputRef}
                        type={secret ? 'password' : type}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={placeholder}
                        disabled={isBusy}
                        className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none disabled:opacity-50"
                    />
                </div>
                
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end gap-3 rounded-b-2xl">
                    <button 
                        onClick={onCancel}
                        disabled={isBusy}
                        className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                        {cancelText || t('Cancel', 'रद्द करें')}
                    </button>
                    <button 
                        onClick={() => onConfirm(value)}
                        disabled={isBusy}
                        className="btn-primary bg-primary hover:bg-red-800 transition-colors text-white px-6 py-2.5 rounded-xl font-bold shadow-md active:scale-95 transform disabled:opacity-50 flex items-center gap-2"
                    >
                        {isBusy && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                        {confirmText || t('Confirm', 'पुष्टि करें')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PromptModal;
