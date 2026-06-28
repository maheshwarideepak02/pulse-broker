import html2pdf from 'html2pdf.js';

export const safeFileName = (value, fallback = 'invoice') => {
    const cleaned = String(value || fallback)
        .trim()
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return cleaned || fallback;
};

const getPdfOptions = (fileName) => ({
    margin: [10, 10, 10, 10], // top, left, bottom, right margins in mm
    filename: `${safeFileName(fileName)}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
});

export const downloadInvoicePdf = async (element, fileName) => {
    if (!element) throw new Error('Invoice is not ready for export.');
    if (document.fonts?.ready) await document.fonts.ready;
    
    const originalMinWidth = element.style.minWidth;
    const originalWidth = element.style.width;
    try {
        element.style.minWidth = '750px';
        element.style.width = '750px';
        await html2pdf().set(getPdfOptions(fileName)).from(element).save();
    } finally {
        element.style.minWidth = originalMinWidth;
        element.style.width = originalWidth;
    }
    return { success: true };
};

export const shareInvoice = async ({ element, fileName, title, text }) => {
    if (!element) throw new Error('Invoice is not ready for export.');
    if (document.fonts?.ready) await document.fonts.ready;
    
    const originalMinWidth = element.style.minWidth;
    const originalWidth = element.style.width;
    let blob;
    const resolvedName = `${safeFileName(fileName)}.pdf`;
    
    try {
        element.style.minWidth = '750px';
        element.style.width = '750px';
        blob = await html2pdf().set(getPdfOptions(fileName)).from(element).outputPdf('blob');
    } finally {
        element.style.minWidth = originalMinWidth;
        element.style.width = originalWidth;
    }

    const file = new File([blob], resolvedName, { type: 'application/pdf' });

    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        try {
            await navigator.share({ title, text, files: [file] });
            return { method: 'native' };
        } catch (err) {
            if (err?.name === 'AbortError') throw err;
            console.warn('Native share failed or rejected, falling back to WhatsApp download', err);
        }
    }

    // Fallback: reliable download via object URL + WhatsApp redirect
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = resolvedName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);

    const fallbackText = `${text}\n\nPDF downloaded as ${resolvedName}. Please attach it in WhatsApp.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(fallbackText)}`, '_blank', 'noopener,noreferrer');
    return { method: 'whatsapp-fallback' };
};
