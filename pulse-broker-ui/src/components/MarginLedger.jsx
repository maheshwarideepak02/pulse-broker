import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { getContactsWithMargins, getMarginDeals, clearMargins, unclearMargins } from '../api';
import { formatDate, getLocalTodayDateString } from '../utils/dateUtils';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const safeFileName = (value, fallback = 'invoice') => {
    const cleaned = String(value || fallback).trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
    return cleaned || fallback;
};

const MarginLedger = () => {
    const { t } = useLanguage();
    const { addToast } = useToast();
    const [contacts, setContacts] = useState([]);
    const [selectedParty, setSelectedParty] = useState('');
    const [marginDeals, setMarginDeals] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showInvoice, setShowInvoice] = useState(false);
    
    // Filtering and Clearance State
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'cleared'
    const [selectedDealIds, setSelectedDealIds] = useState([]);
    const [isClearing, setIsClearing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const invoiceRef = useRef(null);

    const [isInitialLoading, setIsInitialLoading] = useState(true);

    const selectedPartyName = contacts.find(c => c.id == selectedParty)?.name || t('Party', 'पार्टी');
    const marginFileName = () => safeFileName(`trade-margin-${selectedPartyName}-${getLocalTodayDateString()}`);

    const handlePdfDownload = async () => {
        setIsExporting(true);
        try {
            const { downloadInvoicePdf } = await import('../utils/pdfExport');
            await downloadInvoicePdf(invoiceRef.current, marginFileName(), selectedPartyName);
            addToast(t('PDF downloaded successfully', 'पीडीएफ सफलतापूर्वक डाउनलोड हो गया'), 'success');
        } catch (error) {
            console.error('[PDF Download Error]', error);
            addToast(`${t('Could not create PDF', 'पीडीएफ नहीं बन सका')}: ${error?.message || 'Unknown error'}`, 'error');
        } finally {
            setIsExporting(false);
        }
    };

    const handleMarginShare = async () => {
        setIsExporting(true);
        try {
            const { shareInvoice } = await import('../utils/pdfExport');
            const total = Number(totalMargin || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
            const result = await shareInvoice({
                element: invoiceRef.current,
                fileName: marginFileName(),
                title: t('Trade Margin Statement', 'ट्रेड मार्जिन स्टेटमेंट'),
                text: `${t('Trade margin statement for', 'ट्रेड मार्जिन स्टेटमेंट')}: ${selectedPartyName}\n${t('Balance', 'बैलेंस')}: ₹${total}`,
                firmName: selectedPartyName
            });
            addToast(result.method === 'native' ? t('Statement ready to share', 'स्टेटमेंट साझा करने के लिए तैयार है') : t('PDF downloaded; WhatsApp opened', 'पीडीएफ डाउनलोड हुआ; व्हाट्सऐप खोला गया'), 'success');
        } catch (error) {
            if (error?.name !== 'AbortError') addToast(t('Could not share statement', 'स्टेटमेंट साझा नहीं हो सका'), 'error');
        } finally {
            setIsExporting(false);
        }
    };

    const handlePrint = () => {
        const originalTitle = document.title;
        document.title = ' ';
        window.print();
        setTimeout(() => { document.title = originalTitle; }, 1000);
    };

    useEffect(() => {
        setIsInitialLoading(true);
        getContactsWithMargins()
            .then(setContacts)
            .catch(console.error)
            .finally(() => setIsInitialLoading(false));
    }, []);

    useEffect(() => {
        if (selectedParty) {
            fetchMargins(selectedParty);
        } else {
            setMarginDeals([]);
        }
    }, [selectedParty]);

    const fetchMargins = async (partyId) => {
        setIsLoading(true);
        try {
            const data = await getMarginDeals(partyId);
            setMarginDeals(data);
            setSelectedDealIds([]); // reset selection on fetch
        } catch {
            addToast('Failed to load margin ledger', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearToggle = async (action) => {
        if (selectedDealIds.length === 0) return;
        setIsClearing(true);
        try {
            if (action === 'clear') {
                await clearMargins(selectedDealIds);
                addToast(t('Margins marked as cleared', 'मार्जिन को क्लीयर के रूप में चिह्नित किया गया'), 'success');
            } else {
                await unclearMargins(selectedDealIds);
                addToast(t('Margins clearance undone', 'मार्जिन क्लीयरेंस पूर्ववत किया गया'), 'success');
            }
            await fetchMargins(selectedParty);
        } catch (err) {
            addToast(t('Action failed', 'कार्रवाई विफल रही'), 'error');
        } finally {
            setIsClearing(false);
        }
    };

    const toggleSelection = (id) => {
        setSelectedDealIds(prev => prev.includes(id) ? prev.filter(dealId => dealId !== id) : [...prev, id]);
    };

    const toggleAllSelection = () => {
        if (selectedDealIds.length === filteredDeals.length && filteredDeals.length > 0) {
            setSelectedDealIds([]);
        } else {
            setSelectedDealIds(filteredDeals.map(d => d.id));
        }
    };

    // Derived State
    const filteredDeals = marginDeals.filter(d => {
        const isCleared = !!d.marginCleared;
        if (activeTab === 'pending' && isCleared) return false;
        if (activeTab === 'cleared' && !isCleared) return false;

        if (startDate || endDate) {
            const dateStr = d.purchaserDealDate || d.dealDate;
            if (!dateStr) return true;
            const [y, m, day] = dateStr.split('-');
            const dealDate = new Date(y, parseInt(m, 10) - 1, parseInt(day, 10));
            dealDate.setHours(0,0,0,0);
            if (startDate && dealDate < startDate) return false;
            if (endDate && dealDate > endDate) return false;
        }
        return true;
    });

    const getNetMargin = (d) => {
        return (d.marginMarkup || 0) * (d.weight || 0);
    };

    const totalMargin = filteredDeals.reduce((sum, d) => sum + getNetMargin(d), 0);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.16em] text-primary mb-2">
                        <span className="w-6 h-px bg-primary/50"></span>{t('Financials', 'वित्तीय')}
                    </div>
                    <h1 className="text-2xl sm:text-[32px] font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        <span className="text-3xl sm:text-4xl text-primary">⚖️</span> {t('Plus/Minus Account', 'प्लस/माइनस खाता')}
                    </h1>
                </div>
            </div>

            {isInitialLoading ? (
                <div className="flex flex-col items-center justify-center py-32 col-span-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mb-4"></div>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">{t('Loading Margins...', 'लोड हो रहा है...')}</p>
                </div>
            ) : (
                <>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-xl p-6 border-t-8 border-t-primary mb-8">
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                        <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">{t('Select Party', 'पार्टी चुनें')}</label>
                        <select value={selectedParty} onChange={(e) => setSelectedParty(e.target.value)} className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 font-bold text-gray-800 focus:ring-2 focus:ring-primary outline-none transition-all">
                            <option value="">{t('Select Party...', 'पार्टी चुनें...')}</option>
                            {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">{t('Start Date', 'आरंभ तिथि')}</label>
                        <div className="date-input-wrapper">
                            <DatePicker
                                selected={startDate}
                                onChange={date => setStartDate(date)}
                                selectsStart
                                startDate={startDate}
                                endDate={endDate}
                                placeholderText={t('From Date', 'तारीख से')}
                                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 font-bold text-gray-800 outline-none"
                                dateFormat="dd-MM-yyyy"
                            />
                        </div>
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">{t('End Date', 'अंतिम तिथि')}</label>
                        <div className="date-input-wrapper">
                            <DatePicker
                                selected={endDate}
                                onChange={date => setEndDate(date)}
                                selectsEnd
                                startDate={startDate}
                                endDate={endDate}
                                minDate={startDate}
                                placeholderText={t('To Date', 'तारीख तक')}
                                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 font-bold text-gray-800 outline-none"
                                dateFormat="dd-MM-yyyy"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {selectedParty && (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden">
                    <div className="bg-gray-50 border-b border-gray-200">
                        <div className="flex px-6 pt-4 gap-4">
                            <button 
                                onClick={() => setActiveTab('pending')}
                                className={`px-4 py-2 font-bold transition-colors border-b-2 ${activeTab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                {t('Pending Margins', 'लंबित मार्जिन')}
                            </button>
                            <button 
                                onClick={() => setActiveTab('cleared')}
                                className={`px-4 py-2 font-bold transition-colors border-b-2 ${activeTab === 'cleared' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                {t('Cleared / Paid', 'क्लीयर / भुगतान किया गया')}
                            </button>
                        </div>
                    </div>
                    
                    <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-bold text-gray-800">{activeTab === 'pending' ? t('Pending Ledger', 'लंबित लेजर') : t('Cleared Ledger', 'क्लीयर लेजर')}</h2>
                            {selectedDealIds.length > 0 && (
                                <button 
                                    onClick={() => handleClearToggle(activeTab === 'pending' ? 'clear' : 'unclear')}
                                    disabled={isClearing}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm transition-colors ${activeTab === 'pending' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                                >
                                    {isClearing ? t('Processing...', 'प्रक्रिया...') : (activeTab === 'pending' ? t(`Mark ${selectedDealIds.length} as Cleared`, `${selectedDealIds.length} क्लीयर करें`) : t(`Undo Clear for ${selectedDealIds.length}`, `${selectedDealIds.length} पूर्ववत करें`))}
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <div className={`px-4 py-2 rounded-xl border-2 font-bold text-lg ${totalMargin >= 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                {t('Total Balance: ', 'कुल बैलेंस: ')} ₹{totalMargin.toFixed(2)}
                            </div>
                            <button 
                                onClick={() => setShowInvoice(true)} 
                                disabled={marginDeals.length === 0}
                                className="bg-primary hover:bg-red-800 transition-colors text-white px-4 py-2 rounded-xl font-bold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <span>🖨️</span> {t('Print Bill', 'बिल प्रिंट करें')}
                            </button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="p-12 text-center text-gray-500 font-bold animate-pulse">{t('Loading...', 'लोड हो रहा है...')}</div>
                    ) : filteredDeals.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">{t('No margin differences found for this party and filters.', 'इस पार्टी और फ़िल्टर के लिए कोई मार्जिन अंतर नहीं मिला।')}</div>
                    ) : (
                        <>
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-primary/5 text-primary text-xs uppercase tracking-wider">
                                        <th className="p-4 border-b border-primary/10">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded text-primary focus:ring-primary"
                                                checked={selectedDealIds.length === filteredDeals.length && filteredDeals.length > 0}
                                                onChange={toggleAllSelection}
                                            />
                                        </th>
                                        <th className="p-4 font-bold border-b border-primary/10">ID</th>
                                        <th className="p-4 font-bold border-b border-primary/10">{t('Date', 'तारीख')}</th>
                                        <th className="p-4 font-bold border-b border-primary/10">{t('Purchaser', 'खरीदार')}</th>
                                        <th className="p-4 font-bold border-b border-primary/10">{t('Seller', 'विक्रेता')}</th>
                                        <th className="p-4 font-bold border-b border-primary/10">{t('Item', 'आइटम')}</th>
                                        <th className="p-4 font-bold border-b border-primary/10 text-right">{t('Weight (Qtl)', 'वजन')}</th>
                                        <th className="p-4 font-bold border-b border-primary/10 text-right">{t('Base Rate', 'मूल दर')}</th>
                                        <th className="p-4 font-bold border-b border-primary/10 text-right">{t('Markup', 'मार्जिन')}</th>
                                        <th className="p-4 font-bold border-b border-primary/10 text-right">{t('Net Margin', 'कुल मार्जिन')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDeals.map(d => {
                                        const netMargin = getNetMargin(d);
                                        const isSelected = selectedDealIds.includes(d.id);
                                        return (
                                            <tr key={d.id} className={`border-b border-gray-100 transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-gray-50'}`}>
                                                <td className="p-4">
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-4 h-4 rounded text-primary focus:ring-primary"
                                                        checked={isSelected}
                                                        onChange={() => toggleSelection(d.id)}
                                                    />
                                                </td>
                                                <td className="p-4 text-sm text-gray-500 font-medium">#{d.id}</td>
                                                <td className="p-4 font-bold text-gray-800">
                                                    <div className="flex flex-col gap-1">
                                                        {d.purchaserDealDate && d.purchaserDealDate !== d.dealDate ? (
                                                            <>
                                                                <span className="text-secondary text-xs" title="Seller Date">S: {formatDate(d.dealDate)}</span>
                                                                <span className="text-primary text-xs" title="Buyer Date">P: {formatDate(d.purchaserDealDate)}</span>
                                                            </>
                                                        ) : (
                                                            <span>{formatDate(d.dealDate)}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-bold text-gray-800">{d.purchaser?.name}</div>
                                                    <div className="text-xs text-gray-500 font-bold uppercase">{d.purchaserContact?.name}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-bold text-gray-800">{d.seller?.name}</div>
                                                    <div className="text-xs text-gray-500 font-bold uppercase">{d.sellerContact?.name}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-bold text-gray-800">{d.item?.name}</div>
                                                    <div className="text-xs text-secondary font-bold">{d.marka?.name}</div>
                                                </td>
                                                <td className="p-4 font-bold text-gray-800 text-right">{d.weight}</td>
                                                <td className="p-4 font-bold text-gray-600 text-right">₹{d.rate}</td>
                                                <td className={`p-4 font-bold text-right ${d.marginMarkup > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {d.marginMarkup > 0 ? '+' : ''}{d.marginMarkup}
                                                </td>
                                                <td className={`p-4 font-bold text-right ${netMargin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    ₹{netMargin.toFixed(2)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card Layout */}
                        <div className="md:hidden flex flex-col gap-3 p-3 bg-gray-50/50">
                            {filteredDeals.map(d => {
                                const netMargin = getNetMargin(d);
                                const isSelected = selectedDealIds.includes(d.id);
                                return (
                                    <div key={d.id} className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden" onClick={() => toggleSelection(d.id)}>
                                        <div className={`absolute top-0 left-0 w-1 h-full ${isSelected ? 'bg-primary' : 'bg-gray-300'}`}></div>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelection(d.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                                    {d.purchaserDealDate && d.purchaserDealDate !== d.dealDate 
                                                        ? `P: ${formatDate(d.purchaserDealDate)}` 
                                                        : formatDate(d.dealDate)}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className={`font-black text-lg ${netMargin > 0 ? 'text-green-600' : 'text-red-600'}`}>₹{netMargin.toFixed(2)}</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                            <div>
                                                <div className="text-[10px] uppercase text-gray-400 font-bold">{t('Purchaser', 'खरीदार')}</div>
                                                <div className="font-bold text-gray-800 text-sm leading-tight">{d.purchaser?.name}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] uppercase text-gray-400 font-bold">{t('Seller', 'विक्रेता')}</div>
                                                <div className="font-bold text-gray-800 text-sm leading-tight">{d.seller?.name}</div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200 font-bold text-xs">{d.item?.name} {d.marka ? `- ${d.marka.name}` : ''}</span>
                                            </div>
                                            <div className="text-right text-xs font-bold text-gray-600">
                                                {d.weight} {t('Qtl', 'क्विंटल')} × <span className={d.marginMarkup > 0 ? 'text-green-600' : 'text-red-600'}>{d.marginMarkup > 0 ? '+' : ''}{d.marginMarkup}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        </>
                    )}
                </div>
            )}

            {/* INVOICE VIEW */}
            {showInvoice && (
                <div className="fixed inset-0 z-50 bg-white overflow-y-auto print:bg-white print:p-0">
                    <div className="max-w-5xl mx-auto p-4 py-8">
                        <div className="mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-gray-50 p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200 print:hidden sticky top-4 z-50">
                            <button onClick={() => setShowInvoice(false)} className="text-gray-500 hover:text-primary transition-colors font-bold flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-300">
                                {t('← Back', '← वापस')}
                            </button>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={handlePdfDownload} disabled={isExporting} className="bg-primary hover:bg-red-800 disabled:opacity-60 transition-colors text-white px-4 py-2.5 rounded-lg font-bold shadow-md flex items-center gap-2"><span>↓</span>{isExporting ? t('Preparing…', 'बन रहा है…') : t('Download PDF', 'पीडीएफ डाउनलोड')}</button>
                                <button onClick={handleMarginShare} disabled={isExporting} className="bg-[#128c4b] hover:bg-[#0d713c] disabled:opacity-60 transition-colors text-white px-4 py-2.5 rounded-lg font-bold shadow-md flex items-center gap-2"><span>↗</span>{t('Share / WhatsApp', 'शेयर / व्हाट्सऐप')}</button>
                                <button onClick={handlePrint} className="bg-white border border-gray-200 hover:bg-gray-50 transition-colors text-gray-700 px-4 py-2.5 rounded-lg font-bold flex items-center gap-2"><span>⎙</span>{t('Print', 'प्रिंट')}</button>
                            </div>
                        </div>

                        <div className="overflow-x-auto w-full pb-4">
                            <div ref={invoiceRef} className="invoice-preview relative bg-white border border-gray-200 w-full p-3 sm:p-6">
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
                                    क्रमांक <span className="bill-line" style={{ minWidth: '80px' }}>-</span>
                                </span>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', display: 'inline-block' }}>ट्रेड मार्जिन / प्लस माइनस खाता</h2>
                                <span style={{ position: 'absolute', right: 0, bottom: '4px', fontWeight: 'bold', fontSize: '14px' }}>
                                    {t('Date', 'दिनांक')} <span className="bill-line" style={{ minWidth: '100px' }}>{formatDate(getLocalTodayDateString())}</span>
                                </span>
                            </div>
                            <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>
                                <span className="bill-line" style={{ minWidth: '300px' }}>{contacts.find(c => c.id == selectedParty)?.name}</span>
                            </div>

                            <div className="overflow-x-auto w-full pb-2">
                                <table style={{ minWidth: '600px' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ width: '10%' }}>सौदे की तारीख</th>
                                            <th style={{ width: '10%' }}>लोडिंग<br/>तारीख</th>
                                            <th style={{ width: '18%' }}>खरीदार फर्म</th>
                                            <th style={{ width: '18%' }}>विक्रेता फर्म</th>
                                            <th style={{ width: '12%' }}>जिन्स / मार्का</th>
                                            <th style={{ width: '8%' }}>वजन<br/>(कु.मे.)</th>
                                            <th style={{ width: '8%' }}>मूल दर</th>
                                            <th style={{ width: '8%' }}>मार्जिन<br/>(±)</th>
                                            <th style={{ width: '8%' }}>कुल राशि</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredDeals.map((d, i) => {
                                            const netMargin = getNetMargin(d);
                                            return (
                                                <tr key={i}>
                                                    <td>{formatDate(d.dealDate)}</td>
                                                    <td>{d.loadDate ? formatDate(d.loadDate) : '-'}</td>
                                                    <td>{d.purchaser?.name}</td>
                                                    <td>{d.seller?.name}</td>
                                                    <td>{d.item?.name} {d.marka?.name ? `(${d.marka.name})` : ''}</td>
                                                    <td>{d.weight}</td>
                                                    <td>{d.rate}</td>
                                                    <td>{d.marginMarkup > 0 ? '+' : ''}{d.marginMarkup}</td>
                                                    <td>₹{netMargin.toFixed(2)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ marginTop: '15px', position: 'relative', height: '100px' }}>
                                <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: 'bold', width: '100%' }}>
                                    <div style={{ marginBottom: '2px' }}>कार्यालय एवं निवास</div>
                                    <div>कमला मेन्सन, फ्लेट नं. 104, अलखनाथ मन्दिर रोड, निकट गंगा मन्दिर, बरेली (उ.प्र.) - 243003</div>
                                </div>
                                <div style={{ position: 'absolute', right: 0, bottom: '20px', border: '1px solid #9e1b22', padding: '2px 10px', fontWeight: 'bold', fontSize: '14px' }}>
                                    कुल मार्जिन बैलेंस: <span className="bill-line" style={{ minWidth: '80px' }}>₹ {totalMargin.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            )}
            </>
            )}
        </div>
    );
};

export default MarginLedger;
