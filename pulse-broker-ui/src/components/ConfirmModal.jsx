import { useEffect, useId, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';

const ConfirmModal = ({ isOpen, title, message, confirmText, cancelText, confirmColor, onConfirm, onCancel }) => {
    const { t } = useLanguage();
    const cancelRef = useRef(null);
    const dialogRef = useRef(null);
    const titleId = useId();
    const descriptionId = useId();

    useEffect(() => {
        if (!isOpen) return undefined;
        const previousFocus = document.activeElement;
        const frame = requestAnimationFrame(() => cancelRef.current?.focus());
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onCancel();
            }
            if (event.key === 'Tab') {
                const focusable = dialogRef.current?.querySelectorAll('button:not([disabled])');
                if (!focusable?.length) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            cancelAnimationFrame(frame);
            document.removeEventListener('keydown', handleKeyDown);
            previousFocus?.focus?.();
        };
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    const colorClass = confirmColor === 'blue' ? 'bg-primary hover:bg-blue-700 border-t-primary' : 'bg-red-600 hover:bg-red-700 border-t-red-500';
    const borderClass = confirmColor === 'blue' ? 'border-t-primary' : 'border-t-red-500';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
            <div ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className={`bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-slide-in border-t-8 ${borderClass}`}>
                <h3 id={titleId} className="text-xl font-bold text-gray-900 mb-2">{title || t('Confirm Action', 'कार्रवाई की पुष्टि करें')}</h3>
                <p id={descriptionId} className="text-gray-600 mb-6 font-medium">{message || t('Are you sure you want to proceed?', 'क्या आप वाकई आगे बढ़ना चाहते हैं?')}</p>
                <div className="flex justify-end gap-3">
                    <button 
                        ref={cancelRef}
                        onClick={onCancel}
                        className="px-5 py-2.5 rounded-lg font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                        {cancelText || t('Cancel', 'रद्द करें')}
                    </button>
                    <button 
                        data-testid="modal-confirm-btn"
                        onClick={onConfirm}
                        className={`px-5 py-2.5 rounded-lg font-bold text-white shadow-md transition-colors ${colorClass}`}
                    >
                        {confirmText || t('Yes, Proceed', 'हां, आगे बढ़ें')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
