import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { getFirms, previewBill, generateBill, getAllBills, clearBill, deleteBill, revertDeal, getBillDetail, getContacts } from '../api';
import DateInput from './DateInput';
import ConfirmModal from './ConfirmModal';
import { formatDate, getLocalTodayDateString } from '../utils/dateUtils';

const safeFileName = (value, fallback = 'invoice') => {
    const cleaned = String(value || fallback).trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
    return cleaned || fallback;
};

const Ledger = () => {
    const { t } = useLanguage();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState('generate'); // 'generate' or 'history'
    
    // Generate Bill State
    const [firms, setFirms] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [filterParty, setFilterParty] = useState('');
    const [filterFirm, setFilterFirm] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [billPreview, setBillPreview] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // History State
    const [billsHistory, setBillsHistory] = useState([]);
    const [historyParty, setHistoryParty] = useState('');
    const [historyFirm, setHistoryFirm] = useState('');
    
    // Invoice View State
    const [showInvoice, setShowInvoice] = useState(false);
    const [invoiceData, setInvoiceData] = useState(null);
    const [showMultiInvoice, setShowMultiInvoice] = useState(false);
    const [multiInvoiceData, setMultiInvoiceData] = useState([]);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: '', id: null, message: '' }); 
    const [clearBillDialog, setClearBillDialog] = useState({ isOpen: false, id: null, clearanceDate: getLocalTodayDateString(), discountAmount: '' });
    const [isExporting, setIsExporting] = useState(false);
    const invoiceRef = useRef(null);

    const [isInitialLoading, setIsInitialLoading] = useState(true);

    const invoiceFileName = () => safeFileName(`${invoiceData?.billNumber || 'brokerage-invoice'}-${invoiceData?.firmName || ''}`);

    const handlePdfDownload = async () => {
        setIsExporting(true);
        try {
            const { downloadInvoicePdf } = await import('../utils/pdfExport');
            await downloadInvoicePdf(invoiceRef.current, invoiceFileName());
            addToast(t('PDF downloaded successfully', 'पीडीएफ सफलतापूर्वक डाउनलोड हो गया'), 'success');
        } catch (error) {
            console.error(error);
            addToast(t('Could not create PDF', 'पीडीएफ नहीं बन सका'), 'error');
        } finally {
            setIsExporting(false);
        }
    };

    const handleInvoiceShare = async () => {
        setIsExporting(true);
        try {
            const { shareInvoice } = await import('../utils/pdfExport');
            const total = Number(invoiceData?.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
            const result = await shareInvoice({
                element: invoiceRef.current,
                fileName: invoiceFileName(),
                title: `${t('Brokerage Invoice', 'दलाली बिल')} ${invoiceData?.billNumber || ''}`,
                text: `${t('Brokerage invoice for', 'दलाली बिल')}: ${invoiceData?.firmName || ''}\n${t('Total', 'कुल')}: ₹${total}`,
            });
            addToast(result.method === 'native' ? t('Invoice ready to share', 'बिल साझा करने के लिए तैयार है') : t('PDF downloaded; WhatsApp opened', 'पीडीएफ डाउनलोड हुआ; व्हाट्सऐप खोला गया'), 'success');
        } catch (error) {
            if (error?.name !== 'AbortError') addToast(t('Could not share invoice', 'बिल साझा नहीं हो सका'), 'error');
        } finally {
            setIsExporting(false);
        }
    };

    useEffect(() => {
        setIsInitialLoading(true);
        Promise.all([
            getFirms().then(setFirms),
            getContacts().then(setContacts),
            activeTab === 'history' ? getAllBills().then(setBillsHistory) : Promise.resolve()
        ])
        .catch(console.error)
        .finally(() => setIsInitialLoading(false));
    }, [activeTab]);

    const filteredGenerateFirms = filterParty
        ? firms.filter(f => f.contact?.id === Number(filterParty) || f.contact === Number(filterParty))
        : firms;

    const filteredHistoryFirms = historyParty
        ? firms.filter(f => f.contact?.id === Number(historyParty) || f.contact === Number(historyParty))
        : firms;

    const filteredHistoryBills = billsHistory.filter(b => {
        if (historyParty && b.firm?.contact?.id !== Number(historyParty) && b.firm?.contact !== Number(historyParty)) return false;
        if (historyFirm && b.firm?.id !== Number(historyFirm)) return false;
        return true;
    });

    const loadHistory = async () => {
        setIsLoading(true);
        try {
            const data = await getAllBills();
            setBillsHistory(data);
        } catch (e) {
            console.error(e);
            addToast('Failed to load bill history', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const groupBillItems = (items) => {
        if (!items) return [];
        const grouped = new Map();
        items.forEach(item => {
            const key = item.parentDealId ? `parent_${item.parentDealId}` : `deal_${item.dealId}`;
            if (!grouped.has(key)) {
                grouped.set(key, { ...item, _allLoadDates: item.loadDate ? item.loadDate.split(',').map(s=>s.trim()) : [] });
            } else {
                const existing = grouped.get(key);
                existing.weight += item.weight;
                existing.numberOfPackets = (existing.numberOfPackets || 0) + (item.numberOfPackets || 0);
                existing.computedBrokerage += item.computedBrokerage;
                existing.pBrokerage += item.pBrokerage;
                existing.sBrokerage += item.sBrokerage;
                if (item.loadDate) {
                    const dates = item.loadDate.split(',').map(s=>s.trim());
                    dates.forEach(date => {
                        if (!existing._allLoadDates.includes(date)) existing._allLoadDates.push(date);
                    });
                }
            }
        });
        return Array.from(grouped.values()).map(item => {
            if (item._allLoadDates && item._allLoadDates.length > 0) {
                item.loadDate = item._allLoadDates.join(', ');
            }
            return item;
        }).sort((a, b) => new Date(a.dealDate) - new Date(b.dealDate));
    };

    const fetchPreview = async () => {
        if (!filterFirm) return;
        setIsLoading(true);
        try {
            const data = await previewBill(filterFirm, fromDate, toDate);
            if (data.items) {
                data.items = groupBillItems(data.items);
            }
            setBillPreview(data);
        } catch (e) {
            console.error(e);
            addToast('Failed to fetch ledger calculations from server', 'error');
            setBillPreview(null);
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-fetch when filters change or tab changes
    useEffect(() => {
        if (filterFirm && activeTab === 'generate') fetchPreview();
        else setBillPreview(null);
    }, [filterFirm, fromDate, toDate, activeTab]);

    const handleRevertDeal = (dealId) => {
        setConfirmDialog({
            isOpen: true,
            type: 'revert',
            id: dealId,
            message: t('Are you sure you want to revert this loaded dispatch back to pending?', 'क्या आप इस लोड किए गए सौदे को वापस लंबित करना चाहते हैं?')
        });
    };

    const executeRevertDeal = async (dealId) => {
        setIsProcessing(true);
        try {
            await revertDeal(dealId);
            addToast('Deal reverted to Pending status successfully.', 'success');
            fetchPreview();
        } catch (e) {
            console.error(e);
            addToast(e.response?.data?.message || 'Failed to revert deal', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFinalize = async () => {
        setConfirmDialog({
            isOpen: true,
            type: 'finalize',
            id: null,
            message: t('WARNING: Finalizing will permanently lock these deals as BILLED. Are you sure?', 'चेतावनी: बिल पक्का करने से ये सौदे स्थायी रूप से लॉक हो जाएंगे। क्या आप सुनिश्चित हैं?')
        });
    };

    const executeFinalize = async () => {
        setIsProcessing(true);
        try {
            const bill = await generateBill(filterFirm, fromDate, toDate);
            // After generating, fetch the full bill detail for viewing
            const detail = await getBillDetail(bill.id);
            if (detail.items) {
                detail.items = groupBillItems(detail.items);
            }
            setInvoiceData({
                billNumber: detail.billNumber,
                billDate: detail.billDate,
                firmName: detail.firmName,
                totalAmount: detail.totalAmount,
                items: detail.items,
                status: detail.status
            });
            addToast(`Bill ${bill.billNumber} Generated & Locked!`, 'success');
            setShowInvoice(true);
        } catch (e) {
            console.error(e);
            addToast(e.response?.data?.message || 'Failed to generate bill', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleViewPreview = () => {
        if (!billPreview) return;
        setInvoiceData({
            billNumber: 'PREVIEW',
            billDate: getLocalTodayDateString(),
            firmName: billPreview.firmName,
            totalAmount: billPreview.totalAmount,
            items: billPreview.items,
            status: 'PREVIEW'
        });
        setShowInvoice(true);
    };

    const handleViewBillDetail = async (billId) => {
        try {
            const detail = await getBillDetail(billId);
            if (detail.items) {
                detail.items = groupBillItems(detail.items);
            }
            setInvoiceData({
                billNumber: detail.billNumber,
                billDate: detail.billDate,
                firmName: detail.firmName,
                totalAmount: detail.totalAmount,
                items: detail.items,
                status: detail.status,
                clearanceDate: detail.clearanceDate
            });
            setShowInvoice(true);
        } catch (e) {
            console.error(e);
            addToast('Failed to load bill detail', 'error');
        }
    };

    const handleClearBill = (billId) => {
        setClearBillDialog({
            isOpen: true,
            id: billId,
            clearanceDate: getLocalTodayDateString(),
            discountAmount: ''
        });
    };

    const executeClearBill = async () => {
        setIsProcessing(true);
        const { id, clearanceDate, discountAmount } = clearBillDialog;
        setClearBillDialog({ isOpen: false, id: null, clearanceDate: '', discountAmount: '' });
        try {
            await clearBill(id, clearanceDate, discountAmount || null);
            addToast('Bill marked as Cleared successfully!', 'success');
            loadHistory(); // refresh list
        } catch (e) {
            console.error(e);
            addToast(e.response?.data?.message || 'Failed to clear bill', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteBill = (billId) => {
        setConfirmDialog({
            isOpen: true,
            type: 'delete',
            id: billId,
            message: t('WARNING: Cancelling/Deleting this bill will remove it permanently and revert all associated deals back to LOADED status. Are you sure?', 'चेतावनी: इस बिल को रद्द/मिटाने से सभी सौदे वापस लोडेड स्थिति में आ जाएंगे। क्या आप सुनिश्चित हैं?')
        });
    };

    const executeDeleteBill = async (billId) => {
        setIsProcessing(true);
        try {
            await deleteBill(billId);
            addToast('Bill Deleted Successfully & deals unlocked!', 'success');
            loadHistory();
        } catch (e) {
            console.error(e);
            addToast(e.response?.data?.message || 'Failed to delete bill', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const executeConfirmAction = async () => {
        if (confirmDialog.type === 'finalize') await executeFinalize();
        if (confirmDialog.type === 'delete') await executeDeleteBill(confirmDialog.id);
        if (confirmDialog.type === 'revert') await executeRevertDeal(confirmDialog.id);
        setConfirmDialog({ isOpen: false, type: '', id: null, message: '' });
    };

    // Render brokerage cell with breakdown for PURCHASER_BOTH / SELLER_BOTH
    const renderBrokerageCell = (item) => {
        const isBothMode = item.brokeragePayer === 'PURCHASER_BOTH' || item.brokeragePayer === 'SELLER_BOTH';
        
        if (isBothMode && item.pBrokerage != null && item.sBrokerage != null) {
            const pBrok = parseFloat(item.pBrokerage) || 0;
            const sBrok = parseFloat(item.sBrokerage) || 0;
            return (
                <div>
                    <div className="font-black text-primary">₹ {item.computedBrokerage?.toFixed(2)}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                        <span className="bg-red-50 px-1 py-0.5 rounded border border-red-100">P: ₹{pBrok.toFixed(0)}</span>
                        <span className="mx-0.5">+</span>
                        <span className="bg-blue-50 px-1 py-0.5 rounded border border-blue-100">S: ₹{sBrok.toFixed(0)}</span>
                    </div>
                        <div className="text-[9px] text-gray-400 italic mt-0.5">
                            {item.brokeragePayer === 'PURCHASER_BOTH' ? t('Purchaser', 'खरीदार') : t('Seller', 'विक्रेता')} {t('pays both', 'दोनों देगा')}
                        </div>
                </div>
            );
        }
        
        return <span className="font-black text-primary">₹ {item.computedBrokerage?.toFixed(2)}</span>;
    };

    const handlePrintAllFirmBills = async () => {
        if (filteredHistoryBills.length === 0) {
            addToast(t('No invoices match the current filter to print.', 'प्रिंट करने के लिए कोई बिल नहीं मिला।'), 'error');
            return;
        }
        setIsProcessing(true);
        try {
            const details = await Promise.all(filteredHistoryBills.map(b => getBillDetail(b.id)));
            const groupedDetails = details.map(detail => {
                if (detail.items) detail.items = groupBillItems(detail.items);
                return detail;
            });
            setMultiInvoiceData(groupedDetails);
            setShowMultiInvoice(true);
        } catch (e) {
            console.error(e);
            addToast(t('Could not load bills for printing', 'बिल लोड नहीं हो सके'), 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    // ===== INVOICE VIEW =====
    if (showInvoice && invoiceData) {
        return (
            <div className="max-w-5xl mx-auto p-4 py-8 animate-slide-in">
                <div className="mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white p-4 sm:p-5 rounded-xl shadow-md border border-gray-100 print:hidden sticky top-4 z-50">
                    <button data-testid="back-btn" onClick={() => { setShowInvoice(false); setInvoiceData(null); if(activeTab==='generate') fetchPreview(); else loadHistory(); }} className="text-gray-500 hover:text-primary transition-colors font-bold flex items-center gap-2 bg-gray-50 hover:bg-red-50 px-4 py-2 rounded-lg">
                        {t('← Back', '← वापस')}
                    </button>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        {invoiceData.status !== 'PREVIEW' && (
                            <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${invoiceData.status === 'PAID' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-yellow-100 text-yellow-800 border border-yellow-200'}`}>
                                {invoiceData.status === 'PAID' ? t('✓ CLEARED', '✓ भुगतान') : t('⏳ UNPAID', '⏳ बकाया')}
                            </span>
                        )}
                        <button onClick={handlePdfDownload} disabled={isExporting} className="bg-primary hover:bg-red-800 disabled:opacity-60 transition-colors text-white px-4 py-2.5 rounded-lg font-bold shadow-md flex items-center gap-2">
                            <span>↓</span> {isExporting ? t('Preparing…', 'बन रहा है…') : t('Download PDF', 'पीडीएफ डाउनलोड')}
                        </button>
                        <button onClick={handleInvoiceShare} disabled={isExporting} className="bg-[#128c4b] hover:bg-[#0d713c] disabled:opacity-60 transition-colors text-white px-4 py-2.5 rounded-lg font-bold shadow-md flex items-center gap-2">
                            <span>↗</span> {t('Share / WhatsApp', 'शेयर / व्हाट्सऐप')}
                        </button>
                        <button onClick={() => window.print()} className="bg-white border border-gray-200 hover:bg-gray-50 transition-colors text-gray-700 px-4 py-2.5 rounded-lg font-bold flex items-center gap-2">
                            <span>⎙</span> {t('Print', 'प्रिंट')}
                        </button>
                    </div>
                </div>
                
                <div className="overflow-x-auto w-full pb-4">
                    <div ref={invoiceRef} className="invoice-preview relative bg-white border border-gray-200 min-w-[600px] sm:min-w-0">
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>
                        <span>Pan No. ANOPM1632M</span><span>📞 9837052398</span>
                    </div>
                    <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                        <div style={{ fontSize: '24px', color: '#9e1b22', marginBottom: '-5px' }}>ॐ</div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold' }}>श्री गुरुचरण कमलेभ्यो: नम:</div>
                        <h1 style={{ fontSize: '26px', fontWeight: 'bold', margin: '4px 0' }}>संजीव कुमार माहेश्वरी</h1>
                        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>ब्रोकर: दलहन, गल्ला, चावल आदि</div>
                    </div>
                    <div style={{ textAlign: 'center', borderTop: '1px solid #9e1b22', borderBottom: '1px solid #9e1b22', padding: '4px 0', marginBottom: '10px', position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 0, bottom: '4px', fontWeight: 'bold', fontSize: '14px' }}>
                            क्रमांक <span className="bill-line" style={{ minWidth: '80px' }}>{invoiceData.billNumber}</span>
                        </span>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', display: 'inline-block' }}>बिल दलाली</h2>
                        <span style={{ position: 'absolute', right: 0, bottom: '4px', fontWeight: 'bold', fontSize: '14px' }}>
                            दिनांक <span className="bill-line" style={{ minWidth: '100px' }}>{formatDate(invoiceData.billDate)}</span>
                        </span>
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>
                        <span className="bill-line" style={{ minWidth: '300px' }}>{invoiceData.firmName}</span>
                    </div>
                    {invoiceData.items && (
                    <div className="overflow-x-auto w-full pb-2">
                    <table style={{ minWidth: '600px' }}>
                        <thead>
                            <tr>
                                <th style={{ width: '11%' }}>सौदे की तारीख</th>
                                <th style={{ width: '11%' }}>लोडिंग<br/>तारीख</th>
                                <th style={{ width: '23%' }}>फर्म का नाम</th>
                                <th style={{ width: '15%' }}>जिन्स का नाम</th>
                                <th style={{ width: '10%' }}>वजन (कु.मे.)</th>
                                <th style={{ width: '10%' }}>बोरा/कट्टा</th>
                                <th style={{ width: '10%' }}>दर</th>
                                <th style={{ width: '10%' }}>दलाली</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoiceData.items.map((d, i) => {
                                const isBothMode = d.brokeragePayer === 'PURCHASER_BOTH' || d.brokeragePayer === 'SELLER_BOTH';
                                const pBrok = parseFloat(d.pBrokerage) || 0;
                                const sBrok = parseFloat(d.sBrokerage) || 0;
                                
                                return (
                                    <React.Fragment key={d.dealId || i}>
                                        <tr>
                                            <td>{formatDate(d.dealDate)}</td>
                                            <td>{formatDate(d.loadDate)}</td>
                                            <td>{d.oppositePartyName}</td>
                                            <td>{d.itemMarka}</td>
                                            <td>{d.weight}</td>
                                            <td>{d.numberOfPackets || '-'}</td>
                                            <td>{d.rate}</td>
                                            <td>{isBothMode ? `₹ ${pBrok.toFixed(0)}` : `₹ ${d.computedBrokerage?.toFixed(2)}`}</td>
                                        </tr>
                                        {isBothMode && (
                                        <tr className="sub-row">
                                            <td>"</td>
                                            <td>"</td>
                                            <td>"</td>
                                            <td style={{ fontWeight: 'bold' }}>विक्रेता की दलाली</td>
                                            <td>---</td>
                                            <td>---</td>
                                            <td>---</td>
                                            <td>₹ {sBrok.toFixed(0)}</td>
                                        </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                    </div>
                    )}
                    <div style={{ marginTop: '15px', position: 'relative', height: '100px' }}>
                        <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: 'bold', width: '100%' }}>
                            <div style={{ marginBottom: '2px' }}>कार्यालय एवं निवास</div>
                            <div>कमला मेन्सन, फ्लेट नं. 104, अलखनाथ मन्दिर रोड, निकट गंगा मन्दिर, बरेली (उ.प्र.) - 243003</div>
                        </div>
                        <div style={{ position: 'absolute', right: 0, bottom: '20px', border: '1px solid #9e1b22', padding: '2px 10px', fontWeight: 'bold', fontSize: '14px' }}>
                            कुल दलाली: <span className="bill-line" style={{ minWidth: '80px' }}>₹ {invoiceData.totalAmount?.toFixed(2)}</span>
                        </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (showMultiInvoice && multiInvoiceData.length > 0) {
        return (
            <div className="max-w-5xl mx-auto p-4 py-8 animate-slide-in">
                <div className="mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white p-4 sm:p-5 rounded-xl shadow-md border border-gray-100 print:hidden sticky top-4 z-50">
                    <button onClick={() => { setShowMultiInvoice(false); setMultiInvoiceData([]); }} className="text-gray-500 hover:text-primary transition-colors font-bold flex items-center gap-2 bg-gray-50 hover:bg-red-50 px-4 py-2 rounded-lg">
                        {t('← Back', '← वापस')}
                    </button>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <button onClick={() => window.print()} className="bg-primary hover:bg-red-800 transition-colors text-white px-6 py-2.5 rounded-lg font-bold shadow-md flex items-center gap-2">
                            <span>⎙</span> {t('Print All Bills', 'सभी बिल प्रिंट करें')}
                        </button>
                    </div>
                </div>
                <div className="flex flex-col gap-8 print:gap-0">
                    {multiInvoiceData.map((inv, index) => (
                        <div key={inv.id || index} className="overflow-x-auto w-full pb-4 print:pb-0" style={{ pageBreakAfter: 'always', breakAfter: 'page' }}>
                            <div className="invoice-preview relative bg-white border border-gray-200 min-w-[600px] sm:min-w-0">
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>
                                    <span>Pan No. ANOPM1632M</span><span>📞 9837052398</span>
                                </div>
                                <div style={{ textAlign: 'center', borderBottom: '2px solid #9e1b22', paddingBottom: '6px', marginBottom: '10px' }}>
                                    <h1 style={{ fontSize: '26px', fontWeight: 'bold', margin: '4px 0' }}>संजीव कुमार माहेश्वरी</h1>
                                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>ब्रोकर: दलहन, गल्ला, चावल आदि</div>
                                </div>
                                <div style={{ textAlign: 'center', borderTop: '1px solid #9e1b22', borderBottom: '1px solid #9e1b22', padding: '4px 0', marginBottom: '10px', position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 0, bottom: '4px', fontWeight: 'bold', fontSize: '14px' }}>
                                        क्रमांक <span className="bill-line" style={{ minWidth: '80px' }}>{inv.billNumber}</span>
                                    </span>
                                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', display: 'inline-block' }}>बिल दलाली</h2>
                                    <span style={{ position: 'absolute', right: 0, bottom: '4px', fontWeight: 'bold', fontSize: '14px' }}>
                                        दिनांक <span className="bill-line" style={{ minWidth: '100px' }}>{formatDate(inv.billDate)}</span>
                                    </span>
                                </div>
                                <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>
                                    <span className="bill-line" style={{ minWidth: '300px' }}>{inv.firmName}</span>
                                </div>
                                {inv.items && (
                                    <div className="overflow-x-auto w-full pb-2">
                                        <table style={{ minWidth: '600px' }}>
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '11%' }}>सौदे की तारीख</th>
                                                    <th style={{ width: '11%' }}>लोडिंग<br/>तारीख</th>
                                                    <th style={{ width: '23%' }}>फर्म का नाम</th>
                                                    <th style={{ width: '15%' }}>जिन्स का नाम</th>
                                                    <th style={{ width: '10%' }}>वजन (कु.मे.)</th>
                                                    <th style={{ width: '10%' }}>बोरा/कट्टा</th>
                                                    <th style={{ width: '10%' }}>दर</th>
                                                    <th style={{ width: '10%' }}>दलाली</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {inv.items.map((d, i) => {
                                                    const isBothMode = d.brokeragePayer === 'PURCHASER_BOTH' || d.brokeragePayer === 'SELLER_BOTH';
                                                    const pBrok = parseFloat(d.pBrokerage) || 0;
                                                    const sBrok = parseFloat(d.sBrokerage) || 0;
                                                    return (
                                                        <React.Fragment key={d.dealId || i}>
                                                            <tr>
                                                                <td>{formatDate(d.dealDate)}</td>
                                                                <td>{formatDate(d.loadDate)}</td>
                                                                <td>{d.oppositePartyName}</td>
                                                                <td>{d.itemMarka}</td>
                                                                <td>{d.weight}</td>
                                                                <td>{d.numberOfPackets || '-'}</td>
                                                                <td>{d.rate}</td>
                                                                <td>{isBothMode ? `₹ ${pBrok.toFixed(0)}` : `₹ ${d.computedBrokerage?.toFixed(2)}`}</td>
                                                            </tr>
                                                            {isBothMode && (
                                                                <tr className="sub-row">
                                                                    <td>"</td><td>"</td><td>"</td>
                                                                    <td style={{ fontWeight: 'bold' }}>विक्रेता की दलाली</td>
                                                                    <td>---</td><td>---</td><td>---</td>
                                                                    <td>₹ {sBrok.toFixed(0)}</td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                <div style={{ marginTop: '15px', position: 'relative', height: '100px' }}>
                                    <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: 'bold', width: '100%' }}>
                                        <div style={{ marginBottom: '2px' }}>कार्यालय एवं निवास</div>
                                        <div>कमला मेन्सन, फ्लेट नं. 104, अलखनाथ मन्दिर रोड, निकट गंगा मन्दिर, बरेली (उ.प्र.) - 243003</div>
                                    </div>
                                    <div style={{ position: 'absolute', right: 0, bottom: '20px', border: '1px solid #9e1b22', padding: '2px 10px', fontWeight: 'bold', fontSize: '14px' }}>
                                        कुल दलाली: <span className="bill-line" style={{ minWidth: '80px' }}>₹ {inv.totalAmount?.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 relative">
            {isProcessing && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center animate-slide-in">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mb-4"></div>
                        <p className="text-gray-900 font-extrabold text-lg tracking-tight">{t('Processing...', 'प्रक्रिया चल रही है...')}</p>
                        <p className="text-xs text-gray-400 mt-2">{t('Please do not close this window', 'कृपया इस विंडो को बंद न करें')}</p>
                    </div>
                </div>
            )}
            
            <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.16em] text-primary mb-2">
                        <span className="w-6 h-px bg-primary/50"></span>{t('Financials', 'वित्तीय')}
                    </div>
                    <h1 className="text-2xl sm:text-[32px] font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        <span className="text-3xl sm:text-4xl text-primary">📒</span> {t('Ledger & Billing', 'खाता बही और बिलिंग')}
                    </h1>
                </div>
                <div className="flex bg-gray-100 p-1.5 rounded-2xl shadow-inner w-full sm:w-auto">
                    <button 
                        onClick={() => setActiveTab('generate')}
                        className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${activeTab === 'generate' ? 'bg-white text-primary shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {t('Generate Bills', 'बिल जनरेट करें')}
                    </button>
                    <button data-testid="invoice-history-btn"
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${activeTab === 'history' ? 'bg-white text-primary shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {t('Invoice History', 'बिल इतिहास')}
                    </button>
                </div>
            </div>
            
            {isInitialLoading ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mb-4"></div>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">{t('Loading Ledger...', 'लोड हो रहा है...')}</p>
                </div>
            ) : (
                <>
            {activeTab === 'generate' && (
            <>
                <div className="bg-white border border-gray-100 p-8 rounded-2xl shadow-lg mb-8 border-t-8 border-t-primary relative">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary opacity-5 rounded-bl-full rounded-tr-xl pointer-events-none"></div>
                    <h2 className="font-bold text-primary uppercase tracking-widest mb-6 text-sm flex items-center gap-2">
                        <span>🔍</span> {t('Filter & Generate Bill for Firm', 'फर्म के लिए बिल फ़िल्टर करें')}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end relative z-10">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t('Select Party', 'पार्टी चुनें')}</label>
                            <select value={filterParty} onChange={e => { setFilterParty(e.target.value); setFilterFirm(''); }} className="w-full bg-white border-2 border-gray-200 rounded-lg px-4 py-3 text-textMain font-bold focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none shadow-sm">
                                <option value="">-- {t('All Parties', 'सभी पार्टियां')} --</option>
                                {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t('Select Firm', 'फर्म चुनें')}</label>
                            <select value={filterFirm} onChange={e => {
                                const val = e.target.value;
                                setFilterFirm(val);
                                if (val) {
                                    const found = firms.find(f => f.id === Number(val));
                                    if (found?.contact) setFilterParty(String(found.contact.id || found.contact));
                                }
                            }} className="w-full bg-white border-2 border-gray-200 rounded-lg px-4 py-3 text-textMain font-bold focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none shadow-sm">
                                <option value="">-- {t('Select Firm', 'फर्म चुनें')} --</option>
                                {filteredGenerateFirms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <DateInput
                                label={t('From Date', 'से (तारीख)')}
                                value={fromDate}
                                onChange={e => setFromDate(e.target.value)}
                                variant="filter"
                            />
                        </div>
                        <div>
                            <DateInput
                                label={t('To Date', 'तक (तारीख)')}
                                value={toDate}
                                onChange={e => setToDate(e.target.value)}
                                variant="filter"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-xl shadow-md overflow-hidden mb-8 animate-fade-in">
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-sm text-textMain">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 font-bold">{t('Date', 'तारीख')}</th>
                                    <th className="px-6 py-4 font-bold">{t('Opposite Party', 'दूसरी फर्म')}</th>
                                    <th className="px-6 py-4 font-bold">{t('Item (Marka)', 'आइटम (मार्का)')}</th>
                                    <th className="px-6 py-4 font-bold text-right">{t('Weight', 'वजन')}</th>
                                    <th className="px-6 py-4 font-bold text-right">{t('Bags', 'बोरा')}</th>
                                    <th className="px-6 py-4 font-bold text-right">{t('Brokerage', 'दलाली')}</th>
                                    <th className="px-6 py-4 font-bold text-center w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {isLoading ? (
                                    <tr><td colSpan="7" className="p-8 text-center text-gray-500 animate-pulse">{t('Calculating via secure server...', 'सर्वर से कैलकुलेट हो रहा है...')}</td></tr>
                                ) : !billPreview || billPreview.items.length === 0 ? (
                                    <tr><td colSpan="7" className="p-12 text-center text-gray-500 font-medium">{filterFirm ? t('No unbilled deals match the selected filter.', 'चुने गए फिल्टर में कोई अनबिल्ड सौदा नहीं मिला।') : t('Please select a firm to view their ledger.', 'खाता देखने के लिए फर्म चुनें।')}</td></tr>
                                ) : billPreview.items.map(d => (
                                    <tr key={d.dealId} className="hover:bg-red-50/30 transition-colors">
                                        <td className="px-6 py-4 text-gray-500">{formatDate(d.dealDate)}</td>
                                        <td className="px-6 py-4 font-bold text-primary">{d.oppositePartyName}</td>
                                        <td className="px-6 py-4"><span className="bg-gray-100 px-2 py-1 rounded border border-gray-200 font-bold text-xs">{d.itemMarka}</span></td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-600">{d.weight}</td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-500">{d.numberOfPackets || '-'}</td>
                                        <td className="px-6 py-4 text-right">{renderBrokerageCell(d)}</td>
                                        <td className="px-4 py-4 text-center">
                                            <button onClick={() => handleRevertDeal(d.dealId)} className="text-gray-400 hover:text-red-500 transition-colors" title={t('Undo Load / Revert to Pending', 'लोड वापस करें / लंबित में लौटाएं')}>
                                                ↩️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {billPreview && billPreview.items.length > 0 && (
                                <tfoot className="bg-gradient-to-r from-gray-50 to-red-50 border-t-2 border-gray-200">
                                    <tr>
                                        <td colSpan="5" className="px-6 py-4">
                                            <div className="flex gap-4">
                                                <button onClick={handleViewPreview} className="bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all px-6 py-2 rounded-lg font-bold shadow-sm flex items-center gap-2">
                                                    <span>👀</span> {t('Preview PDF', 'पूर्वावलोकन')}
                                                </button>
                                                <button data-testid="finalize-bill-btn" onClick={handleFinalize} className="bg-primary hover:bg-red-800 transition-all text-white px-6 py-2 rounded-lg font-bold shadow-lg hover:-translate-y-0.5 flex items-center gap-2">
                                                    <span>🔒</span> {t('Finalize & Lock Bill', 'बिल पक्का करें')}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="text-right font-bold uppercase py-5 text-gray-500 tracking-wider">{t('Total to Bill:', 'कुल बिल:')}</td>
                                        <td className="text-right font-black text-moneyGreen text-2xl pr-6">₹ {billPreview.totalAmount.toFixed(2)}</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>

                    {/* Mobile Card Layout for Generate Bill */}
                    <div className="md:hidden flex flex-col gap-3 p-3 bg-gray-50/50">
                        {isLoading ? (
                            <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-100 animate-pulse">{t('Calculating via secure server...', 'सर्वर से कैलकुलेट हो रहा है...')}</div>
                        ) : !billPreview || billPreview.items.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 font-medium bg-white rounded-xl border border-gray-100">{filterFirm ? t('No unbilled deals match the selected filter.', 'चुने गए फिल्टर में कोई अनबिल्ड सौदा नहीं मिला।') : t('Please select a firm to view their ledger.', 'खाता देखने के लिए फर्म चुनें।')}</div>
                        ) : (
                            <>
                                {billPreview.items.map(d => (
                                    <div key={d.dealId} className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-primary transition-colors relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-secondary"></div>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-primary text-lg">{d.oppositePartyName}</span>
                                            <div className="text-right">{renderBrokerageCell(d)}</div>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200 font-bold text-xs">{d.itemMarka}</span>
                                            <span className="font-bold text-gray-600">{d.weight} {t('qtl', 'क्विंटल')} {d.numberOfPackets ? `(${d.numberOfPackets} ${t('Bags', 'बोरी')})` : ''}</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                                            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{formatDate(d.dealDate)}</div>
                                            <button onClick={() => handleRevertDeal(d.dealId)} className="text-[11px] font-bold text-gray-500 hover:text-red-600 flex items-center gap-1 bg-white border border-gray-200 shadow-sm px-2 py-1 rounded-md active:scale-95 transition-all">
                                                ↩️ {t('Revert', 'वापस')}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 mt-2 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-moneyGreen to-green-500"></div>
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="font-bold uppercase text-gray-500 tracking-wider text-sm">{t('Total to Bill:', 'कुल बिल:')}</span>
                                        <span className="font-black text-moneyGreen text-2xl">₹ {billPreview?.totalAmount?.toFixed(2) || '0.00'}</span>
                                    </div>
                                    {billPreview && billPreview.items.length > 0 && (
                                        <div className="flex flex-col gap-3">
                                            <button onClick={handleViewPreview} className="w-full bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all px-4 py-3 rounded-lg font-bold shadow-sm flex items-center justify-center gap-2">
                                                <span>👀</span> {t('Preview PDF', 'पूर्वावलोकन')}
                                            </button>
                                            <button data-testid="finalize-bill-btn-mobile" onClick={handleFinalize} className="w-full bg-primary hover:bg-red-800 transition-all text-white px-4 py-3 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2">
                                                <span>🔒</span> {t('Finalize & Lock Bill', 'बिल पक्का करें')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </>
            )}

            {activeTab === 'history' && (
            <div className="bg-white border border-gray-100 rounded-xl shadow-md overflow-hidden mb-8 animate-fade-in">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="font-bold text-gray-700 uppercase tracking-wider text-sm flex items-center gap-2">
                        <span>📜</span> {t('All Generated Invoices', 'सभी बिल')}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        <select value={historyParty} onChange={e => { setHistoryParty(e.target.value); setHistoryFirm(''); }} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-primary">
                            <option value="">-- {t('All Parties', 'सभी पार्टियां')} --</option>
                            {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <select value={historyFirm} onChange={e => {
                            const val = e.target.value;
                            setHistoryFirm(val);
                            if (val) {
                                const found = firms.find(f => f.id === Number(val));
                                if (found?.contact) setHistoryParty(String(found.contact.id || found.contact));
                            }
                        }} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-primary">
                            <option value="">-- {t('All Firms', 'सभी फर्म')} --</option>
                            {filteredHistoryFirms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                        <button onClick={handlePrintAllFirmBills} className="bg-primary text-white hover:bg-red-800 transition-colors px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm ml-auto">
                            <span>🖨️</span> {t('Print Bills', 'बिल प्रिंट')}
                        </button>
                        <button onClick={() => window.print()} className="bg-white border border-gray-200 hover:bg-gray-50 transition-colors text-gray-700 px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm">
                            <span>⎙</span> {t('Print List', 'प्रिंट सूची')}
                        </button>
                    </div>
                </div>
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-sm text-textMain">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 font-bold">{t('Bill No.', 'बिल नंबर')}</th>
                                    <th className="px-6 py-4 font-bold">{t('Firm', 'फर्म')}</th>
                                    <th className="px-6 py-4 font-bold">{t('Date', 'तारीख')}</th>
                                    <th className="px-6 py-4 font-bold text-right">{t('Amount', 'रकम')}</th>
                                    <th className="px-6 py-4 font-bold text-center">{t('Status', 'स्थिति')}</th>
                                    <th className="px-6 py-4 font-bold text-right">{t('Action', 'कार्य')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredHistoryBills.length === 0 ? (
                                    <tr><td colSpan="6" className="p-12 text-center text-gray-500 font-medium">{t('No invoices generated yet.', 'अभी तक कोई बिल नहीं बनाया गया है।')}</td></tr>
                                ) : filteredHistoryBills.map(b => (
                                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-600">{b.billNumber}</td>
                                        <td className="px-6 py-4 font-bold text-primary">{b.firm?.name}</td>
                                        <td className="px-6 py-4 text-gray-500">{b.billDate}</td>
                                        <td className="px-6 py-4 text-right font-black text-moneyGreen">₹ {b.totalAmount?.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-center">
                                            {b.status === 'PAID' ? (
                                                <span className="inline-flex items-center gap-1 bg-moneyGreen/10 text-moneyGreen border border-moneyGreen/20 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                                                    <span>✓</span> {t('CLEARED', 'भुगतान')}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 border border-yellow-200 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                                                    <span>⏳</span> {t('UNPAID', 'बकाया')}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <button 
                                                    onClick={() => handleViewBillDetail(b.id)}
                                                    className="bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-primary hover:text-primary transition-colors px-3 py-1 rounded-md text-xs font-bold shadow-sm"
                                                >
                                                    👁️ {t('View', 'देखें')}
                                                </button>
                                                {b.status === 'UNPAID' && (
                                                    <button 
                                                        data-testid="clear-bill-btn"
                                                        onClick={() => handleClearBill(b.id)}
                                                        className="bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white transition-colors px-3 py-1 rounded-md text-xs font-bold shadow-sm"
                                                    >
                                                        {t('Mark Cleared', 'भुगतान प्राप्त')}
                                                    </button>
                                                )}
                                                {b.status === 'PAID' && (
                                                    <div className="flex flex-col items-end mr-2 text-xs">
                                                        <span className="text-gray-400 font-bold">{b.clearanceDate}</span>
                                                        {b.discountAmount > 0 && <span className="text-red-500 font-bold bg-red-50 px-1 mt-0.5 rounded border border-red-100">{t('Kasar', 'कसर')}: ₹{b.discountAmount}</span>}
                                                    </div>
                                                )}
                                                {b.status === 'UNPAID' && (
                                                    <button 
                                                        onClick={() => handleDeleteBill(b.id)}
                                                        className="bg-white border-2 border-red-200 text-red-600 hover:bg-red-50 transition-colors px-3 py-1 rounded-md text-xs font-bold shadow-sm"
                                                        title={t('Cancel/Delete Bill', 'बिल रद्द/मिटाएं')}
                                                    >
                                                        🗑️ {t('Cancel', 'रद्द करें')}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card Layout for History */}
                    <div className="md:hidden flex flex-col gap-3 p-3 bg-gray-50/50">
                        {filteredHistoryBills.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 font-medium bg-white rounded-xl border border-gray-100">{t('No invoices generated yet.', 'अभी तक कोई बिल नहीं बनाया गया है।')}</div>
                        ) : filteredHistoryBills.map(b => (
                            <div key={b.id} className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                                <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${b.status === 'PAID' ? 'from-moneyGreen to-green-500' : 'from-yellow-400 to-yellow-600'}`}></div>
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <div className="font-bold text-gray-600 text-xs mb-1">{b.billNumber}</div>
                                        <div className="font-bold text-primary text-lg">{b.firm?.name}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-black text-moneyGreen text-xl">₹ {b.totalAmount?.toFixed(2)}</div>
                                        <div className="mt-1">
                                            {b.status === 'PAID' ? (
                                                <span className="inline-flex items-center gap-1 bg-moneyGreen/10 text-moneyGreen border border-moneyGreen/20 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                    ✓ {t('CLEARED', 'भुगतान')}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 border border-yellow-200 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                    ⏳ {t('UNPAID', 'बकाया')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-end mt-4 pt-3 border-t border-gray-50">
                                    <div className="flex flex-col gap-1">
                                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{formatDate(b.billDate)}</div>
                                        {b.status === 'PAID' && b.discountAmount > 0 && (
                                            <span className="text-[10px] text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-100 inline-block w-max">{t('Kasar', 'कसर')}: ₹{b.discountAmount}</span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleViewBillDetail(b.id)} className="bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-xs font-bold shadow-sm active:scale-95 transition-all">👁️</button>
                                        {b.status === 'UNPAID' && (
                                            <>
                                                <button data-testid="clear-bill-btn" onClick={() => handleClearBill(b.id)} className="bg-white border border-primary text-primary px-3 py-1.5 rounded-md text-xs font-bold shadow-sm active:scale-95 transition-all">✓ {t('Pay', 'भुगतान')}</button>
                                                <button onClick={() => handleDeleteBill(b.id)} className="bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-md text-xs font-bold shadow-sm active:scale-95 transition-all">🗑️</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
            </div>
            )}

            <ConfirmModal 
                isOpen={confirmDialog.isOpen}
                title={t('Confirm Action', 'कार्यवाई की पुष्टि करें')}
                message={confirmDialog.message}
                onConfirm={executeConfirmAction}
                onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
            />

            {/* Clear Bill Modal (Kasar) */}
            {clearBillDialog.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-slide-in border-t-8 border-t-green-500">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{t('Clear Bill', 'बिल भुगतान करें')}</h3>
                        <p className="text-gray-500 text-sm mb-6">{t('Mark this bill as paid and apply any Kasar (discount) if necessary.', 'इस बिल को भुगतान के रूप में चिह्नित करें और यदि आवश्यक हो तो कसर (छूट) लागू करें।')}</p>
                        
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('Clearance Date', 'भुगतान तारीख')}</label>
                                <input type="date" value={clearBillDialog.clearanceDate} onChange={e => setClearBillDialog({...clearBillDialog, clearanceDate: e.target.value})} className="w-full border-2 border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('Kasar / Discount (₹)', 'कसर / छूट (₹)')}</label>
                                <input type="number" placeholder={t('Optional', 'वैकल्पिक')} value={clearBillDialog.discountAmount} onChange={e => setClearBillDialog({...clearBillDialog, discountAmount: e.target.value})} className="w-full border-2 border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" min="0" step="0.01" />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button onClick={() => setClearBillDialog({ ...clearBillDialog, isOpen: false })} className="px-5 py-2.5 rounded-lg font-bold text-gray-500 hover:bg-gray-100 transition-colors">{t('Cancel', 'रद्द करें')}</button>
                            <button data-testid="mark-paid-btn" onClick={executeClearBill} disabled={isProcessing} className={`px-5 py-2.5 rounded-lg font-bold text-white shadow-md transition-colors ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}>
                                {isProcessing ? t('Processing...', 'प्रक्रिया चल रही है...') : t('✓ Mark Paid', '✓ भुगतान करें')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </>
            )}
        </div>
    );
};

export default Ledger;
