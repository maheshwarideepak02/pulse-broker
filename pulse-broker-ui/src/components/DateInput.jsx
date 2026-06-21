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
            const dateParts = value.split('-');
            if (dateParts.length !== 3) return null;
            const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
            if (isNaN(date.getTime())) return null;
            
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
    
    // Safely parse the incoming "YYYY-MM-DD" string into a local Date object without timezone shifting
    let dateValue = null;
    if (value && typeof value === 'string' && value.includes('-')) {
        const parts = value.split('-');
        if (parts.length === 3) {
            const parsedDate = new Date(parts[0], parts[1] - 1, parts[2]);
            if (!isNaN(parsedDate.getTime())) {
                dateValue = parsedDate;
            }
        }
    }

    const handleChange = (date) => {
        // Handle cleared input or invalid manual typing
        if (!date || isNaN(date.getTime())) {
            onChange({ target: { value: '' } });
            return;
        }
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const formatted = `${y}-${m}-${d}`;
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
            {dateInfo && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-gray-500 animate-slide-in">
                    <span className="opacity-80 text-primary">📅</span> {dateInfo.formatted}
                </div>
            )}
        </div>
    );
};

export default DateInput;
