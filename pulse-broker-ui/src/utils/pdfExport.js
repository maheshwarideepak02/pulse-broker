import html2pdf from 'html2pdf.js';

export const safeFileName = (value, fallback = 'invoice') => {
    const cleaned = String(value || fallback)
        .trim()
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return cleaned || fallback;
};

const getPdfOptions = (fileName) => ({
    margin: [5, 5, 5, 5],
    filename: `${safeFileName(fileName)}.pdf`,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 800,
        width: 780,
        scrollX: 0,
        scrollY: 0,
        allowTaint: true,
        removeContainer: true
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
});

const prepareElement = (element) => {
    // Hide print:hidden elements during capture
    const hiddenEls = element.querySelectorAll('.print\\:hidden, [class*="print:hidden"]');
    const origDisplays = [];
    hiddenEls.forEach(el => {
        origDisplays.push(el.style.display);
        el.style.display = 'none';
    });

    // Set fixed width for consistent rendering
    const originalMinWidth = element.style.minWidth;
    const originalWidth = element.style.width;
    const originalOverflow = element.style.overflow;
    element.style.minWidth = '780px';
    element.style.width = '780px';
    element.style.overflow = 'visible';

    return () => {
        element.style.minWidth = originalMinWidth;
        element.style.width = originalWidth;
        element.style.overflow = originalOverflow;
        hiddenEls.forEach((el, i) => {
            el.style.display = origDisplays[i];
        });
    };
};

export const downloadInvoicePdf = async (element, fileName) => {
    if (!element) throw new Error('Invoice element not found. Please try again.');
    
    // Wait for fonts and images to load
    if (document.fonts?.ready) await document.fonts.ready;
    await new Promise(r => setTimeout(r, 300));

    const restore = prepareElement(element);
    try {
        await html2pdf().set(getPdfOptions(fileName)).from(element).save();
    } catch (err) {
        console.error('[PDF Export] Error:', err);
        throw new Error(`PDF generation failed: ${err.message}`);
    } finally {
        restore();
    }
    return { success: true };
};

export const shareInvoice = async ({ element, fileName, title, text }) => {
    if (!element) throw new Error('Invoice element not found. Please try again.');
    
    if (document.fonts?.ready) await document.fonts.ready;
    await new Promise(r => setTimeout(r, 300));
    
    const resolvedName = `${safeFileName(fileName)}.pdf`;
    const restore = prepareElement(element);
    let blob;
    
    try {
        blob = await html2pdf().set(getPdfOptions(fileName)).from(element).outputPdf('blob');
    } catch (err) {
        console.error('[PDF Share] Error:', err);
        throw new Error(`PDF generation failed: ${err.message}`);
    } finally {
        restore();
    }

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
