export const formatDate = (dateString) => {
    if (!dateString) return '';
    // Ensure dateString is a string in case a Date object is passed
    const str = typeof dateString === 'string' ? dateString : String(dateString);
    const dates = str.split(',').map(d => d.trim());
    const formattedDates = dates.map(date => {
        // Strip out time part if present (e.g. from ISO string)
        const datePart = date.split('T')[0];
        const parts = datePart.split('-');
        if (parts.length === 3) {
            const [year, month, day] = parts;
            // Handle if year is accidentally the day (e.g. DD-MM-YYYY was passed)
            if (year.length === 4) {
                return `${day}-${month}-${year}`;
            } else if (day.length === 4) {
                return `${year}-${month}-${day}`;
            }
        }
        return datePart;
    });
    return formattedDates.join(', ');
};
