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

const elementToPdfBlob = async (element, fileName, firmName = '') => {
    if (!element) throw new Error('Element not found for PDF export.');

    // Try to extract firm name from the DOM if not provided
    if (!firmName) {
        const billLine = element.querySelector('.bill-line');
        if (billLine) firmName = billLine.textContent?.trim() || '';
    }

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
    const MARGIN_MM = 4; // Reduced margin to occupy more width
    const PAGE_W_MM = 210;
    const PAGE_H_MM = 297;
    const CONTENT_W_MM = PAGE_W_MM - MARGIN_MM * 2;
    const CONTENT_H_MM = PAGE_H_MM - MARGIN_MM * 2;
    const HEADER_H_MM = 8;  // space reserved for continuation header on page 2+
    const FOOTER_H_MM = 6;  // space reserved for page number footer

    const canvasW = fullCanvas.width;
    const canvasH = fullCanvas.height;
    
    // DOM pixels per mm (before canvas scale)
    const domWidth = canvasW / SCALE;
    const domPxPerMm = domWidth / CONTENT_W_MM;
    const totalHeightDom = canvasH / SCALE;

    // First pass: calculate total pages for "Page X of Y" footer
    const pageBreaks = [0];
    let tempY = 0;
    let tempPage = 0;
    while (tempY < totalHeightDom - 1) {
        const availableH = tempPage === 0
            ? (CONTENT_H_MM - FOOTER_H_MM) * domPxPerMm
            : (CONTENT_H_MM - HEADER_H_MM - FOOTER_H_MM) * domPxPerMm;
        const nextBreak = findBestBreak(breakPoints, tempY, availableH, totalHeightDom);
        pageBreaks.push(nextBreak);
        tempY = nextBreak;
        tempPage++;
        if (tempPage > 50) break;
    }
    const totalPages = tempPage;

    // Second pass: render pages
    const pdf = new jsPDF('portrait', 'mm', 'a4');

    for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();

        const startY = pageBreaks[page];
        const endY = pageBreaks[page + 1];
        const sliceHeightDom = endY - startY;

        // Where to place the image on this page
        const imgTopMm = page === 0 ? MARGIN_MM : (MARGIN_MM + HEADER_H_MM);

        // Convert to canvas pixels
        const srcY = Math.round(startY * SCALE);
        const srcH = Math.round(sliceHeightDom * SCALE);
        const actualSrcH = Math.min(srcH, canvasH - srcY);

        // Create a clean slice canvas
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvasW;
        sliceCanvas.height = actualSrcH;
        const ctx = sliceCanvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasW, actualSrcH);

        ctx.drawImage(
            fullCanvas,
            0, srcY, canvasW, actualSrcH,
            0, 0, canvasW, actualSrcH
        );

        const sliceImgData = sliceCanvas.toDataURL('image/jpeg', 0.92);
        const sliceHeightMm = sliceHeightDom / domPxPerMm;

        pdf.addImage(
            sliceImgData, 'JPEG',
            MARGIN_MM, imgTopMm,
            CONTENT_W_MM, sliceHeightMm
        );

        // --- Continuation header on page 2+ ---
        if (page > 0 && firmName) {
            pdf.setFontSize(9);
            pdf.setTextColor(120, 120, 120);
            pdf.text(`${firmName} (contd.)`, MARGIN_MM, MARGIN_MM + 4);
            // Thin separator line
            pdf.setDrawColor(200, 200, 200);
            pdf.setLineWidth(0.3);
            pdf.line(MARGIN_MM, MARGIN_MM + HEADER_H_MM - 1, PAGE_W_MM - MARGIN_MM, MARGIN_MM + HEADER_H_MM - 1);
        }

        // --- Page number footer on all pages (only if multi-page) ---
        if (totalPages > 1) {
            pdf.setFontSize(8);
            pdf.setTextColor(150, 150, 150);
            const pageText = `Page ${page + 1} / ${totalPages}`;
            const textWidth = pdf.getTextWidth(pageText);
            pdf.text(pageText, PAGE_W_MM - MARGIN_MM - textWidth, PAGE_H_MM - MARGIN_MM + 2);
        }
    }

    const resolvedName = `${safeFileName(fileName)}.pdf`;
    return { pdf, blob: pdf.output('blob'), resolvedName };
};

export const downloadInvoicePdf = async (element, fileName, firmName) => {
    const { pdf, resolvedName } = await elementToPdfBlob(element, fileName, firmName);
    pdf.save(resolvedName);
    return { success: true };
};

export const shareInvoice = async ({ element, fileName, title, text, firmName }) => {
    const { blob, resolvedName } = await elementToPdfBlob(element, fileName, firmName);
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
