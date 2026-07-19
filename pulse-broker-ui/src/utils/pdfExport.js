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
 * Find safe page break points by detecting table row boundaries.
 * Returns an array of Y-positions (in DOM pixels) where we can safely break.
 */
const findRowBreakPoints = (element) => {
    const breakPoints = new Set();
    const containerRect = element.getBoundingClientRect();
    const containerTop = containerRect.top + window.scrollY;

    // Find all table rows and major block elements
    const rows = element.querySelectorAll('tr, .invoice-row, [style*="page-break"]');
    rows.forEach(row => {
        const rect = row.getBoundingClientRect();
        const rowTop = rect.top + window.scrollY - containerTop;
        const rowBottom = rowTop + rect.height;
        breakPoints.add(Math.round(rowBottom));
    });

    // Also add div boundaries for non-table content
    const divs = element.querySelectorAll(':scope > div, :scope > div > div');
    divs.forEach(div => {
        const rect = div.getBoundingClientRect();
        const divBottom = rect.top + window.scrollY - containerTop + rect.height;
        breakPoints.add(Math.round(divBottom));
    });

    return Array.from(breakPoints).sort((a, b) => a - b);
};

/**
 * Given the max height for a page slice, find the best break point
 * that doesn't cut through a row.
 */
const findBestBreak = (breakPoints, startY, maxSliceHeight, totalHeight) => {
    const idealEnd = startY + maxSliceHeight;
    
    // If we can fit everything remaining, just take it all
    if (idealEnd >= totalHeight) return totalHeight;

    // Find the last break point that fits within the page
    let bestBreak = startY + maxSliceHeight * 0.5; // fallback: at least half page
    for (const bp of breakPoints) {
        if (bp <= startY) continue;
        if (bp <= idealEnd) {
            bestBreak = bp; // this row fits, take it
        } else {
            break; // past the page, stop
        }
    }

    return bestBreak;
};

/**
 * Captures an HTML element and creates a professional multi-page A4 PDF
 * with smart page breaks that never cut through table rows.
 */
const elementToPdfBlob = async (element, fileName) => {
    if (!element) throw new Error('Element not found for PDF export.');

    // Wait for fonts and a render tick
    if (document.fonts?.ready) await document.fonts.ready;
    await new Promise(r => setTimeout(r, 300));

    // --- Find row break points BEFORE modifying the element ---
    const breakPoints = findRowBreakPoints(element);

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

    // Small delay for layout to settle after style changes
    await new Promise(r => setTimeout(r, 100));

    const SCALE = 2;
    let fullCanvas;
    try {
        fullCanvas = await html2canvas(element, {
            scale: SCALE,
            useCORS: true,
            allowTaint: true,
            logging: false,
            windowWidth: 820,
            scrollX: 0,
            scrollY: -window.scrollY,
            backgroundColor: '#ffffff',
        });
    } finally {
        Object.assign(element.style, origStyles);
        hiddenEls.forEach((el, i) => {
            el.style.display = origDisplays[i];
        });
    }

    // --- PDF dimensions ---
    const MARGIN_MM = 8;
    const PAGE_W_MM = 210;
    const PAGE_H_MM = 297;
    const CONTENT_W_MM = PAGE_W_MM - MARGIN_MM * 2;
    const CONTENT_H_MM = PAGE_H_MM - MARGIN_MM * 2;

    const canvasW = fullCanvas.width;
    const canvasH = fullCanvas.height;
    
    // DOM pixels per mm (before canvas scale)
    const domWidth = canvasW / SCALE;
    const domPxPerMm = domWidth / CONTENT_W_MM;
    const maxSliceHeightDom = CONTENT_H_MM * domPxPerMm; // max DOM px per page
    const totalHeightDom = canvasH / SCALE;

    const pdf = new jsPDF('portrait', 'mm', 'a4');
    let currentY = 0; // in DOM pixels
    let pageNum = 0;

    while (currentY < totalHeightDom - 1) {
        if (pageNum > 0) pdf.addPage();

        // Find smart break point (in DOM pixels)
        const nextBreak = findBestBreak(breakPoints, currentY, maxSliceHeightDom, totalHeightDom);
        const sliceHeightDom = nextBreak - currentY;

        // Convert to canvas pixels
        const srcY = Math.round(currentY * SCALE);
        const srcH = Math.round(sliceHeightDom * SCALE);
        const actualSrcH = Math.min(srcH, canvasH - srcY);

        // Create a clean slice canvas
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvasW;
        sliceCanvas.height = actualSrcH;
        const ctx = sliceCanvas.getContext('2d');

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasW, actualSrcH);

        // Copy this page's portion
        ctx.drawImage(
            fullCanvas,
            0, srcY, canvasW, actualSrcH,
            0, 0, canvasW, actualSrcH
        );

        const sliceImgData = sliceCanvas.toDataURL('image/jpeg', 0.92);
        const sliceHeightMm = sliceHeightDom / domPxPerMm;

        pdf.addImage(
            sliceImgData, 'JPEG',
            MARGIN_MM, MARGIN_MM,
            CONTENT_W_MM, sliceHeightMm
        );

        currentY = nextBreak;
        pageNum++;

        // Safety: prevent infinite loops
        if (pageNum > 50) break;
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
