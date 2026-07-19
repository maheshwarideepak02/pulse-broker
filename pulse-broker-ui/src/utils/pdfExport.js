import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export const safeFileName = (value, fallback = 'invoice') => {
    const cleaned = String(value || fallback)
        .trim()
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return cleaned || fallback;
};

/**
 * Captures an HTML element as a canvas, then converts it to a multi-page A4 PDF.
 * Uses jsPDF + html2canvas directly (bypassing html2pdf.js which has known issues).
 */
const elementToPdfBlob = async (element, fileName) => {
    if (!element) throw new Error('Element not found for PDF export.');

    // Wait for fonts
    if (document.fonts?.ready) await document.fonts.ready;
    await new Promise(r => setTimeout(r, 200));

    // Hide print:hidden elements during capture
    const hiddenEls = element.querySelectorAll('[class*="print:hidden"], .print\\:hidden');
    const origDisplays = [];
    hiddenEls.forEach(el => {
        origDisplays.push(el.style.display);
        el.style.display = 'none';
    });

    // Set fixed width for consistent rendering
    const origStyles = {
        minWidth: element.style.minWidth,
        width: element.style.width,
        overflow: element.style.overflow,
        position: element.style.position,
    };
    element.style.minWidth = '780px';
    element.style.width = '780px';
    element.style.overflow = 'visible';

    let canvas;
    try {
        canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            windowWidth: 800,
            width: 780,
            scrollX: 0,
            scrollY: -window.scrollY,
        });
    } finally {
        // Restore original styles
        Object.assign(element.style, origStyles);
        hiddenEls.forEach((el, i) => {
            el.style.display = origDisplays[i];
        });
    }

    // A4 dimensions in mm
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 5; // mm
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = pageHeight - margin * 2;

    // Calculate image dimensions
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF('portrait', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    let heightLeft = imgHeight;
    let position = margin;
    let page = 0;

    // Add pages as needed
    while (heightLeft > 0) {
        if (page > 0) {
            pdf.addPage();
        }
        pdf.addImage(imgData, 'JPEG', margin, position - (page * contentHeight), imgWidth, imgHeight);
        heightLeft -= contentHeight;
        page++;
        position = margin;
    }

    const resolvedName = `${safeFileName(fileName)}.pdf`;
    return { pdf, blob: pdf.output('blob'), resolvedName };
};

export const downloadInvoicePdf = async (element, fileName) => {
    const { pdf, resolvedName } = await elementToPdfBlob(element, fileName);
    pdf.save(resolvedName);
    return { success: true };
};

export const shareInvoice = async ({ element, fileName, title, text }) => {
    const { blob, resolvedName } = await elementToPdfBlob(element, fileName);
    const file = new File([blob], resolvedName, { type: 'application/pdf' });

    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        try {
            await navigator.share({ title, text, files: [file] });
            return { method: 'native' };
        } catch (err) {
            if (err?.name === 'AbortError') throw err;
            console.warn('Native share failed, falling back to WhatsApp download', err);
        }
    }

    // Fallback: download + WhatsApp redirect
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
