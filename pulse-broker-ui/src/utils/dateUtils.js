export const formatDate = (dateString) => {
    if (!dateString) return '';
    const dates = dateString.split(',').map(d => d.trim());
    const formattedDates = dates.map(date => {
        const parts = date.split('-');
        if (parts.length === 3) {
            const [year, month, day] = parts;
            return `${day}-${month}-${year}`;
        }
        return date;
    });
    return formattedDates.join(', ');
};
