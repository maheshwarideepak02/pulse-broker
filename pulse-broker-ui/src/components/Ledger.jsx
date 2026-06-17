import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { getFirms, previewBill, generateBill, getAllBills, clearBill, deleteBill, revertDeal } from '../api';
import DateInput from './DateInput';
import ConfirmModal from './ConfirmModal';
import { formatDate } from '../utils/dateUtils';

const Ledger = () => {
    const { t } = useLanguage();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState('generate'); // 'generate' or 'history'
    
    // Generate Bill State
    const [firms, setFirms] = useState([]);
    const [filterFirm, setFilterFirm] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [billPreview, setBillPreview] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // History State
    const [billsHistory, setBillsHistory] = useState([]);
    
    // Invoice View State
    const [showInvoice, setShowInvoice] = useState(false);
    const [invoiceData, setInvoiceData] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: '', id: null, message: '' }); 
    const [clearBillDialog, setClearBillDialog] = useState({ isOpen: false, id: null, clearanceDate: new Date().toISOString().split('T')[0], discountAmount: '' });

    useEffect(() => {
        getFirms().then(setFirms).catch(console.error);
        if (activeTab === 'history') {
            loadHistory();
        }
    }, [activeTab]);

    const loadHistory = async () => {
        try {
            const data = await getAllBills();
            setBillsHistory(data);
        } catch (e) {
            console.error(e);
            addToast('Failed to load bill history', 'error');
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

    const handleRevertDeal = async (dealId) => {
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
            message: 'WARNING: Finalizing will permanently lock these deals as BILLED. Are you sure?'
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
            billDate: new Date().toISOString().split('T')[0],
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
            clearanceDate: new Date().toISOString().split('T')[0],
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
            message: 'WARNING: Cancelling/Deleting this bill will remove it permanently and revert all associated deals back to LOADED status. Are you sure?'
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
        setConfirmDialog({ isOpen: false, type: '', id: null, message: '' });
    };

    // Render brokerage cell with breakdown for PURCHASER_BOTH / SELLER_BOTH
    const renderBrokerageCell = (item) => {
        const isBothMode = item.brokeragePayer === 'PURCHASER_BOTH' || item.brokeragePayer === 'SELLER_BOTH';
        
        if (isBothMode && item.pBrokerage != null && item.sBrokerage != null) {
            const pBrok = parseFloat(item.pBrokerage) || 0;
            const sBrok = parseFloat(item.sBrokerage) || 0;
            const payerLabel = item.brokeragePayer === 'PURCHASER_BOTH' ? 'Purchaser' : 'Seller';
            
            return (
                <div>
                    <div className="font-black text-primary">₹ {item.computedBrokerage?.toFixed(2)}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                        <span className="bg-red-50 px-1 py-0.5 rounded border border-red-100">P: ₹{pBrok.toFixed(0)}</span>
                        <span className="mx-0.5">+</span>
                        <span className="bg-blue-50 px-1 py-0.5 rounded border border-blue-100">S: ₹{sBrok.toFixed(0)}</span>
                    </div>
                    <div className="text-[9px] text-gray-400 italic mt-0.5">
                        {payerLabel} pays both
                    </div>
                </div>
            );
        }
        
        return <span className="font-black text-primary">₹ {item.computedBrokerage?.toFixed(2)}</span>;
    };

    // ===== INVOICE VIEW =====
    if (showInvoice && invoiceData) {
        return (
            <div className="max-w-5xl mx-auto p-4 py-8 animate-slide-in">
                <div className="mb-8 flex justify-between items-center bg-white p-5 rounded-xl shadow-md border border-gray-100 print:hidden sticky top-4 z-50">
                    <button onClick={() => { setShowInvoice(false); setInvoiceData(null); if(activeTab==='generate') fetchPreview(); else loadHistory(); }} className="text-gray-500 hover:text-primary transition-colors font-bold flex items-center gap-2 bg-gray-50 hover:bg-red-50 px-4 py-2 rounded-lg">
                        {t('← Back', '← वापस')}
                    </button>
                    <div className="flex items-center gap-3">
                        {invoiceData.status !== 'PREVIEW' && (
                            <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${invoiceData.status === 'PAID' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-yellow-100 text-yellow-800 border border-yellow-200'}`}>
                                {invoiceData.status === 'PAID' ? '✓ CLEARED' : '⏳ UNPAID'}
                            </span>
                        )}
                        <button onClick={() => window.print()} className="bg-primary hover:bg-red-800 transition-colors text-white px-8 py-2.5 rounded-lg font-bold shadow-lg hover:-translate-y-0.5 hover:shadow-xl uppercase tracking-wider flex items-center gap-2">
                            <span>🖨️</span> {t('Print / Download PDF', 'प्रिंट करें')}
                        </button>
                    </div>
                </div>
                
                <div className="invoice-preview relative bg-white border border-gray-200">
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
                        भै० <span className="bill-line" style={{ minWidth: '300px' }}>{invoiceData.firmName}</span>
                    </div>
                    {invoiceData.items && (
                    <div className="overflow-x-auto w-full pb-2">
                    <table style={{ minWidth: '600px' }}>
                        <thead>
                            <tr>
                                <th style={{ width: '11%' }}>दिनांक</th>
                                <th style={{ width: '11%' }}>लोडिंग<br/>दिनांक</th>
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
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4 py-8 relative">
            {isProcessing && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center animate-slide-in">
                        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-primary font-bold text-lg">{t('Processing...', 'प्रक्रिया चल रही है...')}</p>
                        <p className="text-xs text-gray-400 mt-2">Please do not close this window</p>
                    </div>
                </div>
            )}
            
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">📒</span>
                    <h1 className="text-3xl font-bold text-primary tracking-tight">{t('Ledger & Billing', 'खाता बही और बिलिंग')}</h1>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl shadow-sm">
                    <button 
                        onClick={() => setActiveTab('generate')}
                        className={`px-6 py-2 rounded-lg font-bold transition-all text-sm ${activeTab === 'generate' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {t('Generate Bills', 'बिल जनरेट करें')}
                    </button>
                    <button 
                        onClick={() => setActiveTab('history')}
                        className={`px-6 py-2 rounded-lg font-bold transition-all text-sm ${activeTab === 'history' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {t('Invoice History', 'बिल इतिहास')}
                    </button>
                </div>
            </div>
            
            {activeTab === 'generate' && (
            <>
                <div className="bg-white border border-gray-100 p-8 rounded-2xl shadow-lg mb-8 border-t-8 border-t-primary relative">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary opacity-5 rounded-bl-full rounded-tr-xl pointer-events-none"></div>
                    <h2 className="font-bold text-primary uppercase tracking-widest mb-6 text-sm flex items-center gap-2">
                        <span>🔍</span> {t('Filter & Generate Bill for Firm', 'फर्म के लिए बिल फ़िल्टर करें')}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end relative z-10">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t('Select Firm', 'फर्म चुनें')}</label>
                            <select value={filterFirm} onChange={e => setFilterFirm(e.target.value)} className="w-full bg-white border-2 border-gray-200 rounded-lg px-4 py-3 text-textMain font-bold focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none shadow-sm">
                                <option value="">-- Select Firm --</option>
                                {firms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
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
                                    <tr><td colSpan="7" className="p-8 text-center text-gray-500 animate-pulse">Calculating via secure server...</td></tr>
                                ) : !billPreview || billPreview.items.length === 0 ? (
                                    <tr><td colSpan="7" className="p-12 text-center text-gray-500 font-medium">{filterFirm ? 'No unbilled deals match the selected filter.' : 'Please select a firm to view their ledger.'}</td></tr>
                                ) : billPreview.items.map(d => (
                                    <tr key={d.dealId} className="hover:bg-red-50/30 transition-colors">
                                        <td className="px-6 py-4 text-gray-500">{formatDate(d.dealDate)}</td>
                                        <td className="px-6 py-4 font-bold text-primary">{d.oppositePartyName}</td>
                                        <td className="px-6 py-4"><span className="bg-gray-100 px-2 py-1 rounded border border-gray-200 font-bold text-xs">{d.itemMarka}</span></td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-600">{d.weight}</td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-500">{d.numberOfPackets || '-'}</td>
                                        <td className="px-6 py-4 text-right">{renderBrokerageCell(d)}</td>
                                        <td className="px-4 py-4 text-center">
                                            <button onClick={() => handleRevertDeal(d.dealId)} className="text-gray-400 hover:text-red-500 transition-colors" title="Undo Load / Revert to Pending">
                                                ↩️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gradient-to-r from-gray-50 to-red-50 border-t-2 border-gray-200">
                                <tr>
                                    <td colSpan="5" className="px-6 py-4">
                                        {billPreview && billPreview.items.length > 0 && (
                                            <div className="flex gap-4">
                                                <button onClick={handleViewPreview} className="bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all px-6 py-2 rounded-lg font-bold shadow-sm flex items-center gap-2">
                                                    <span>👀</span> {t('Preview PDF', 'पूर्वावलोकन')}
                                                </button>
                                                <button onClick={handleFinalize} className="bg-primary hover:bg-red-800 transition-all text-white px-6 py-2 rounded-lg font-bold shadow-lg hover:-translate-y-0.5 flex items-center gap-2">
                                                    <span>🔒</span> {t('Finalize & Lock Bill', 'बिल पक्का करें')}
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                    <td className="text-right font-bold uppercase py-5 text-gray-500 tracking-wider flex items-center justify-end h-full mt-1.5">{t('Total to Bill:', 'कुल बिल:')}</td>
                                    <td className="text-right font-black text-moneyGreen text-2xl pr-6">₹ {billPreview?.totalAmount?.toFixed(2) || '0.00'}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Mobile Card Layout for Generate Bill */}
                    <div className="md:hidden divide-y divide-gray-100">
                        {isLoading ? (
                            <div className="p-8 text-center text-gray-500 animate-pulse">Calculating via secure server...</div>
                        ) : !billPreview || billPreview.items.length === 0 ? (
                            <div className="p-12 text-center text-gray-500 font-medium">{filterFirm ? 'No unbilled deals match the selected filter.' : 'Please select a firm to view their ledger.'}</div>
                        ) : (
                            <>
                                {billPreview.items.map(d => (
                                    <div key={d.dealId} className="p-4 hover:bg-red-50/30 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-primary text-lg">{d.oppositePartyName}</span>
                                            <div className="text-right">{renderBrokerageCell(d)}</div>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200 font-bold text-xs">{d.itemMarka}</span>
                                            <span className="font-bold text-gray-600">{d.weight} qtl {d.numberOfPackets ? `(${d.numberOfPackets} Bags)` : ''}</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-2">
                                            <div className="text-xs text-gray-500">{formatDate(d.dealDate)}</div>
                                            <button onClick={() => handleRevertDeal(d.dealId)} className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1 border border-gray-200 px-2 py-1 rounded">
                                                ↩️ Revert
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <div className="p-4 bg-gradient-to-r from-gray-50 to-red-50 border-t-2 border-gray-200">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="font-bold uppercase text-gray-500 tracking-wider text-sm">{t('Total to Bill:', 'कुल बिल:')}</span>
                                        <span className="font-black text-moneyGreen text-2xl">₹ {billPreview?.totalAmount?.toFixed(2) || '0.00'}</span>
                                    </div>
                                    {billPreview && billPreview.items.length > 0 && (
                                        <div className="flex flex-col gap-3">
                                            <button onClick={handleViewPreview} className="w-full bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all px-4 py-3 rounded-lg font-bold shadow-sm flex items-center justify-center gap-2">
                                                <span>👀</span> {t('Preview PDF', 'पूर्वावलोकन')}
                                            </button>
                                            <button onClick={handleFinalize} className="w-full bg-primary hover:bg-red-800 transition-all text-white px-4 py-3 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2">
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
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="font-bold text-gray-700 uppercase tracking-wider text-sm flex items-center gap-2">
                        <span>📜</span> {t('All Generated Invoices', 'सभी बिल')}
                    </h2>
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
                                {billsHistory.length === 0 ? (
                                    <tr><td colSpan="6" className="p-12 text-center text-gray-500 font-medium">No invoices generated yet.</td></tr>
                                ) : billsHistory.map(b => (
                                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-600">{b.billNumber}</td>
                                        <td className="px-6 py-4 font-bold text-primary">{b.firm?.name}</td>
                                        <td className="px-6 py-4 text-gray-500">{b.billDate}</td>
                                        <td className="px-6 py-4 text-right font-black text-moneyGreen">₹ {b.totalAmount?.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-center">
                                            {b.status === 'PAID' ? (
                                                <span className="inline-flex items-center gap-1 bg-moneyGreen/10 text-moneyGreen border border-moneyGreen/20 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                                                    <span>✓</span> CLEARED
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 border border-yellow-200 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                                                    <span>⏳</span> UNPAID
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <button 
                                                    onClick={() => handleViewBillDetail(b.id)}
                                                    className="bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-primary hover:text-primary transition-colors px-3 py-1 rounded-md text-xs font-bold shadow-sm"
                                                >
                                                    👁️ View
                                                </button>
                                                {b.status === 'UNPAID' && (
                                                    <button 
                                                        onClick={() => handleClearBill(b.id)}
                                                        className="bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white transition-colors px-3 py-1 rounded-md text-xs font-bold shadow-sm"
                                                    >
                                                        {t('Mark Cleared', 'भुगतान प्राप्त')}
                                                    </button>
                                                )}
                                                {b.status === 'PAID' && (
                                                    <div className="flex flex-col items-end mr-2 text-xs">
                                                        <span className="text-gray-400 font-bold">{b.clearanceDate}</span>
                                                        {b.discountAmount > 0 && <span className="text-red-500 font-bold bg-red-50 px-1 mt-0.5 rounded border border-red-100">Kasar: ₹{b.discountAmount}</span>}
                                                    </div>
                                                )}
                                                {b.status === 'UNPAID' && (
                                                    <button 
                                                        onClick={() => handleDeleteBill(b.id)}
                                                        className="bg-white border-2 border-red-200 text-red-600 hover:bg-red-50 transition-colors px-3 py-1 rounded-md text-xs font-bold shadow-sm"
                                                        title="Cancel/Delete Bill"
                                                    >
                                                        🗑️ Cancel
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
                    <div className="md:hidden divide-y divide-gray-100">
                        {billsHistory.length === 0 ? (
                            <div className="p-12 text-center text-gray-500 font-medium">No invoices generated yet.</div>
                        ) : billsHistory.map(b => (
                            <div key={b.id} className="p-4 hover:bg-gray-50 transition-colors">
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
                                                    ✓ CLEARED
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 border border-yellow-200 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                    ⏳ UNPAID
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-end mt-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="text-xs text-gray-500">{formatDate(b.billDate)}</div>
                                        {b.status === 'PAID' && b.discountAmount > 0 && (
                                            <span className="text-[10px] text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-100 inline-block w-max">Kasar: ₹{b.discountAmount}</span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleViewBillDetail(b.id)} className="bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-xs font-bold shadow-sm">👁️</button>
                                        {b.status === 'UNPAID' && (
                                            <>
                                                <button onClick={() => handleClearBill(b.id)} className="bg-white border border-primary text-primary px-3 py-1.5 rounded-md text-xs font-bold shadow-sm">✓ Pay</button>
                                                <button onClick={() => handleDeleteBill(b.id)} className="bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-md text-xs font-bold shadow-sm">🗑️</button>
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
                title="Confirm Action"
                message={confirmDialog.message}
                onConfirm={executeConfirmAction}
                onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
            />

            {/* Clear Bill Modal (Kasar) */}
            {clearBillDialog.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-slide-in border-t-8 border-t-green-500">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Clear Bill</h3>
                        <p className="text-gray-500 text-sm mb-6">Mark this bill as paid and apply any Kasar (discount) if necessary.</p>
                        
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Clearance Date</label>
                                <input type="date" value={clearBillDialog.clearanceDate} onChange={e => setClearBillDialog({...clearBillDialog, clearanceDate: e.target.value})} className="w-full border-2 border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kasar / Discount (₹)</label>
                                <input type="number" placeholder="Optional" value={clearBillDialog.discountAmount} onChange={e => setClearBillDialog({...clearBillDialog, discountAmount: e.target.value})} className="w-full border-2 border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" min="0" step="0.01" />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button onClick={() => setClearBillDialog({ ...clearBillDialog, isOpen: false })} className="px-5 py-2.5 rounded-lg font-bold text-gray-500 hover:bg-gray-100 transition-colors">Cancel</button>
                            <button onClick={executeClearBill} className="px-5 py-2.5 rounded-lg font-bold text-white bg-green-600 hover:bg-green-700 shadow-md transition-colors">✓ Mark Paid</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Ledger;
