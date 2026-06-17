import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_HI = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];

const DateInput = ({ value, onChange, label, labelHi, variant = 'deal', required = false, placeholderText = "Select date", className = '', isMulti = false }) => {
    const chipClass = variant === 'deal' ? 'deal-date' : variant === 'load' ? 'load-date' : 'filter-date';
    
    // Parse value string into Date objects
    const parseDates = (valStr) => {
        if (!valStr) return [];
        return valStr.split(',').map(d => new Date(d.trim() + 'T00:00:00')).filter(d => !isNaN(d));
    };

    const datesList = isMulti ? parseDates(value) : [];
    const dateValue = !isMulti && value ? new Date(value + 'T00:00:00') : null;

    const getFormattedLabel = (dObj) => {
        if (!dObj || isNaN(dObj)) return null;
        try {
            const dayName = DAYS[dObj.getDay()];
            const day = dObj.getDate();
            const month = dObj.toLocaleDateString('en-IN', { month: 'short' });
            const year = dObj.getFullYear();
            return `${dayName}, ${day} ${month} ${year}`;
        } catch {
            return null;
        }
    };

    const formatSingleDate = (date) => {
        const offset = date.getTimezoneOffset();
        const adj = new Date(date.getTime() - (offset * 60 * 1000));
        return adj.toISOString().split('T')[0];
    };

    const handleChange = (dateOrDates) => {
        if (!dateOrDates || (Array.isArray(dateOrDates) && dateOrDates.length === 0)) {
            onChange({ target: { value: '' } });
            return;
        }
        
        if (isMulti) {
            const formattedDates = dateOrDates.map(formatSingleDate);
            // Sort dates
            formattedDates.sort();
            onChange({ target: { value: formattedDates.join(', ') } });
        } else {
            onChange({ target: { value: formatSingleDate(dateOrDates) } });
        }
    };

    return (
        <div className={className}>
            {label && (
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    {label}{required && ' *'}
                </label>
            )}
            <div className="date-input-wrapper relative w-full">
                <DatePicker
                    selectsMultiple={isMulti}
                    selectedDates={isMulti ? datesList : undefined}
                    selected={!isMulti ? dateValue : undefined}
                    onChange={handleChange}
                    dateFormat="dd/MM/yyyy"
                    placeholderText={placeholderText}
                    className="w-full padding-for-icon border-2 border-gray-200 rounded-lg px-4 py-3 font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none bg-white shadow-sm"
                    isClearable={!required}
                />
            </div>
            
            {/* Show badges for selected dates */}
            <div className="mt-2 flex flex-wrap gap-2">
                {!isMulti && dateValue && getFormattedLabel(dateValue) && (
                    <div className={`date-label-chip ${chipClass} text-xs px-2 py-1 rounded-md inline-block`}>
                        <span>{getFormattedLabel(dateValue)}</span>
                    </div>
                )}
                {isMulti && datesList.map((dObj, idx) => (
                    <div key={idx} className={`date-label-chip ${chipClass} text-xs px-2 py-1 rounded-md inline-block`}>
                        <span>{getFormattedLabel(dObj)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DateInput;
