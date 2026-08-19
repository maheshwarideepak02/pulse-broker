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
 * We use the TOP of each row as the break point — this means we break
 * BEFORE a row starts, guaranteeing the row above is fully captured
 * and the row below starts cleanly on the next page.
 *
 * A small SAFETY_PAD is added so the slice always captures a few
 * extra pixels below the last visible row's bottom edge, preventing
 * the bottom border/text from being clipped due to rounding.
 */
const findRowBreakPoints = (element) => {
    const breakPoints = new Set();
    const containerRect = element.getBoundingClientRect();
    const containerTop = containerRect.top + window.scrollY;

    const addRectTop = (el) => {
        const rect = el.getBoundingClientRect();
        if (rect.height === 0) return;
        const top = rect.top + window.scrollY - containerTop;
        breakPoints.add(Math.round(top));
    };

    const addRectTopAndBottom = (el) => {
        const rect = el.getBoundingClientRect();
        if (rect.height === 0) return;
        const top = rect.top + window.scrollY - containerTop;
        const bottom = top + rect.height;
        breakPoints.add(Math.round(top));
        breakPoints.add(Math.round(bottom));
    };

    // 1. Table rows (exclude sub-rows so main row + sub row are kept together)
    // ONLY add the top of the main row. Do not add the bottom, because the bottom of
    // the main row is the exact top of the sub-row (which has 0 padding and cuts text).
    element.querySelectorAll('tr:not(.sub-row)').forEach(addRectTop);

    // 2. All main blocks inside the invoice (headers, footers, tables)
    element.querySelectorAll('.invoice-preview > div').forEach(addRectTopAndBottom);

    // 3. Invoice container boundaries
    element.querySelectorAll('.invoice-preview').forEach(addRectTopAndBottom);

    // Add 0 and the total height to be safe
    breakPoints.add(0);
    breakPoints.add(Math.round(containerRect.height));

    return Array.from(breakPoints).sort((a, b) => a - b);
};

/**
 * Given the max height for a page slice, find the best break point
 * that doesn't cut through a row or text block.
 */
const findBestBreak = (breakPoints, startY, maxSliceHeight, totalHeight) => {
    const idealEnd = startY + maxSliceHeight;
    
    if (idealEnd >= totalHeight) return totalHeight;

    // Find the largest break point that fits within the page
    let bestBreak = -1;
    for (const bp of breakPoints) {
        if (bp <= startY + 5) continue; // skip break points too close to start
        if (bp <= idealEnd) {
            bestBreak = bp;
        } else {
            break;
        }
    }

    // If no break point found within the slice, we MUST fall back to idealEnd
    // to prevent infinite loops, but with the new breakPoints logic this should 
    // almost never happen unless a single div is taller than an entire A4 page.
    if (bestBreak === -1) {
        bestBreak = idealEnd;
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

    // --- Prepare element for capture (resize FIRST, then measure) ---
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

    // Wait for layout to settle AFTER resize (minimal delay to keep user gesture alive)
    await new Promise(r => setTimeout(r, 50));

    // --- Find row break points AFTER resize so positions match the 780px layout ---
    const breakPoints = findRowBreakPoints(element);

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
        
        // Safety: ensure we always make forward progress (at least 10px)
        const safeNext = nextBreak <= tempY ? Math.min(tempY + availableH, totalHeightDom) : nextBreak;
        
        pageBreaks.push(safeNext);
        tempY = safeNext;
        tempPage++;
        if (tempPage > 50) break;
    }
    const totalPages = Math.max(tempPage, 1); // at least 1 page

    // Second pass: render pages
    const pdf = new jsPDF('portrait', 'mm', 'a4');

    for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();

        const startY = pageBreaks[page] || 0;
        const endY = pageBreaks[page + 1] || totalHeightDom;
        const sliceHeightDom = Math.max(endY - startY, 1); // at least 1px to avoid zero-height canvas

        // Where to place the image on this page
        const imgTopMm = page === 0 ? MARGIN_MM : (MARGIN_MM + HEADER_H_MM);

        // Convert to canvas pixels
        const srcY = Math.round(startY * SCALE);
        const srcH = Math.round(sliceHeightDom * SCALE);
        const actualSrcH = Math.max(Math.min(srcH, canvasH - srcY), 1); // at least 1px

        // Skip if source position is beyond canvas
        if (srcY >= canvasH) continue;

        // Create a clean slice canvas
        try {
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
        } catch (sliceErr) {
            console.warn(`[PDF] Skipping page ${page + 1} due to canvas error:`, sliceErr);
            continue;
        }

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
