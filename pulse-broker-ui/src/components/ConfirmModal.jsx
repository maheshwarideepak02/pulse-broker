import React from 'react';

const ConfirmModal = ({ isOpen, title, message, confirmText, confirmColor, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    const colorClass = confirmColor === 'blue' ? 'bg-primary hover:bg-blue-700 border-t-primary' : 'bg-red-600 hover:bg-red-700 border-t-red-500';
    const borderClass = confirmColor === 'blue' ? 'border-t-primary' : 'border-t-red-500';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
            <div className={`bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-slide-in border-t-8 ${borderClass}`}>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{title || 'Confirm Action'}</h3>
                <p className="text-gray-600 mb-6 font-medium">{message || 'Are you sure you want to proceed?'}</p>
                <div className="flex justify-end gap-3">
                    <button 
                        onClick={onCancel}
                        className="px-5 py-2.5 rounded-lg font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={onConfirm}
                        className={`px-5 py-2.5 rounded-lg font-bold text-white shadow-md transition-colors ${colorClass}`}
                    >
                        {confirmText || 'Yes, Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
