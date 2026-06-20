import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const PAGE_MARGIN_MM = 8;

export const safeFileName = (value, fallback = 'invoice') => {
    const cleaned = String(value || fallback)
        .trim()
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return cleaned || fallback;
};

export const createInvoicePdf = async (element, fileName) => {
    if (!element) throw new Error('Invoice is not ready for export.');
    if (document.fonts?.ready) await document.fonts.ready;

    const canvas = await html2canvas(element, {
        scale: Math.min(window.devicePixelRatio || 1, 2),
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        windowWidth: Math.max(element.scrollWidth, 800),
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const printableWidth = A4_WIDTH_MM - (PAGE_MARGIN_MM * 2);
    const printableHeight = A4_HEIGHT_MM - (PAGE_MARGIN_MM * 2);
    const imageHeight = (canvas.height * printableWidth) / canvas.width;
    const imageData = canvas.toDataURL('image/jpeg', 0.94);

    let renderedHeight = 0;
    let pageIndex = 0;
    while (renderedHeight < imageHeight) {
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(imageData, 'JPEG', PAGE_MARGIN_MM, PAGE_MARGIN_MM - renderedHeight, printableWidth, imageHeight, undefined, 'FAST');
        renderedHeight += printableHeight;
        pageIndex += 1;
    }

    const resolvedName = `${safeFileName(fileName)}.pdf`;
    return { pdf, blob: pdf.output('blob'), fileName: resolvedName };
};

export const downloadInvoicePdf = async (element, fileName) => {
    const result = await createInvoicePdf(element, fileName);
    result.pdf.save(result.fileName);
    return result;
};

export const shareInvoice = async ({ element, fileName, title, text }) => {
    const result = await createInvoicePdf(element, fileName);
    const file = new File([result.blob], result.fileName, { type: 'application/pdf' });

    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ title, text, files: [file] });
        return { method: 'native' };
    }

    result.pdf.save(result.fileName);
    const fallbackText = `${text}\n\nPDF downloaded as ${result.fileName}. Please attach it in WhatsApp.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(fallbackText)}`, '_blank', 'noopener,noreferrer');
    return { method: 'whatsapp-fallback' };
};
