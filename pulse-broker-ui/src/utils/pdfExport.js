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
 * Captures an HTML element as a high-quality canvas, then slices it into
 * clean A4 pages with no row cutting. Each page gets its own canvas slice.
 */
const elementToPdfBlob = async (element, fileName) => {
    if (!element) throw new Error('Element not found for PDF export.');

    // Wait for fonts and a render tick
    if (document.fonts?.ready) await document.fonts.ready;
    await new Promise(r => setTimeout(r, 300));

    // --- Prepare element for capture ---
    const hiddenEls = element.querySelectorAll('[class*="print:hidden"], .print\\:hidden');
    const origDisplays = [];
    hiddenEls.forEach(el => {
        origDisplays.push(el.style.display);
        el.style.display = 'none';
    });

    const origStyles = {
        minWidth: element.style.minWidth,
        width: element.style.width,
        overflow: element.style.overflow,
    };
    element.style.minWidth = '780px';
    element.style.width = '780px';
    element.style.overflow = 'visible';

    let fullCanvas;
    try {
        fullCanvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            windowWidth: 820,
            scrollX: 0,
            scrollY: -window.scrollY,
            backgroundColor: '#ffffff',
        });
    } finally {
        // Restore original styles
        Object.assign(element.style, origStyles);
        hiddenEls.forEach((el, i) => {
            el.style.display = origDisplays[i];
        });
    }

    // --- PDF dimensions ---
    const MARGIN_MM = 8;
    const PAGE_W_MM = 210;                          // A4 width
    const PAGE_H_MM = 297;                          // A4 height
    const CONTENT_W_MM = PAGE_W_MM - MARGIN_MM * 2; // printable width
    const CONTENT_H_MM = PAGE_H_MM - MARGIN_MM * 2; // printable height

    // Pixels per mm at the canvas scale
    const canvasW = fullCanvas.width;
    const canvasH = fullCanvas.height;
    const pxPerMm = canvasW / CONTENT_W_MM;
    const sliceHeightPx = Math.floor(CONTENT_H_MM * pxPerMm); // px height per page

    const totalPages = Math.ceil(canvasH / sliceHeightPx);
    const pdf = new jsPDF('portrait', 'mm', 'a4');

    for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();

        const srcY = page * sliceHeightPx;
        const srcH = Math.min(sliceHeightPx, canvasH - srcY);

        // Create a clean slice canvas for this page
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvasW;
        sliceCanvas.height = srcH;
        const ctx = sliceCanvas.getContext('2d');

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasW, srcH);

        // Draw the slice from the full canvas
        ctx.drawImage(
            fullCanvas,
            0, srcY,       // source x, y
            canvasW, srcH,  // source width, height
            0, 0,           // dest x, y
            canvasW, srcH   // dest width, height
        );

        const sliceImgData = sliceCanvas.toDataURL('image/jpeg', 0.92);
        const sliceHeightMm = (srcH / pxPerMm);

        pdf.addImage(
            sliceImgData,
            'JPEG',
            MARGIN_MM,          // x
            MARGIN_MM,          // y
            CONTENT_W_MM,       // width in mm
            sliceHeightMm       // height in mm
        );
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
