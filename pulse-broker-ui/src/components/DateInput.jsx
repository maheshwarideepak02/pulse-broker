import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_HI = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];

const DateInput = ({ value, onChange, label, labelHi, variant = 'deal', required = false, placeholderText = "Select date", className = '' }) => {
    const chipClass = variant === 'deal' ? 'deal-date' : variant === 'load' ? 'load-date' : 'filter-date';
    
    const getFormattedLabel = () => {
        if (!value) return null;
        try {
            const date = new Date(value + 'T00:00:00');
            const dayName = DAYS[date.getDay()];
            const day = date.getDate();
            const month = date.toLocaleDateString('en-IN', { month: 'short' });
            const year = date.getFullYear();
            return { formatted: `${dayName}, ${day} ${month} ${year}` };
        } catch {
            return null;
        }
    };

    const dateInfo = getFormattedLabel();
    const dateValue = value ? new Date(value + 'T00:00:00') : null;

    const handleChange = (date) => {
        if (!date) {
            onChange({ target: { value: '' } });
            return;
        }
        // Format to YYYY-MM-DD
        const offset = date.getTimezoneOffset();
        date = new Date(date.getTime() - (offset * 60 * 1000));
        const formatted = date.toISOString().split('T')[0];
        onChange({ target: { value: formatted } });
    };

    return (
        <div className={className}>
            {label && (
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    {label}{required && ' *'}
                </label>
            )}
            <div className="date-input-wrapper relative w-full flex items-center gap-2">
                <div className="flex-1">
                    <DatePicker
                        selected={dateValue}
                        onChange={handleChange}
                        dateFormat="dd/MM/yyyy"
                        placeholderText={placeholderText}
                        className="w-full padding-for-icon border-2 border-gray-200 rounded-lg px-4 py-3 font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none bg-white shadow-sm"
                        isClearable={!required}
                    />
                </div>
            </div>
            
            {/* Show badge for selected date */}
            {dateInfo && (
                <div className="mt-2">
                    <div className={`date-label-chip ${chipClass} text-xs px-2 py-1 rounded-md inline-block`}>
                        <span>{dateInfo.formatted}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DateInput;
