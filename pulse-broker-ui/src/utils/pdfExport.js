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

export const createInvoicePdf = async (element, fileName) => {
    if (!element) throw new Error('Invoice is not ready for export.');
    if (document.fonts?.ready) await document.fonts.ready;
    
    // Create html2pdf worker instance
    const worker = html2pdf().set(getPdfOptions(fileName)).from(element);
    
    // Get Blob
    const blob = await worker.outputPdf('blob');
    const resolvedName = `${safeFileName(fileName)}.pdf`;
    
    return { blob, fileName: resolvedName, worker };
};

export const downloadInvoicePdf = async (element, fileName) => {
    const { worker } = await createInvoicePdf(element, fileName);
    // Let html2pdf handle the save
    await worker.save();
    return { success: true };
};

export const shareInvoice = async ({ element, fileName, title, text }) => {
    const { blob, fileName: resolvedName, worker } = await createInvoicePdf(element, fileName);
    const file = new File([blob], resolvedName, { type: 'application/pdf' });

    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ title, text, files: [file] });
        return { method: 'native' };
    }

    // Fallback: trigger download and open WhatsApp Web
    await worker.save();
    const fallbackText = `${text}\n\nPDF downloaded as ${resolvedName}. Please attach it in WhatsApp.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(fallbackText)}`, '_blank', 'noopener,noreferrer');
    return { method: 'whatsapp-fallback' };
};
