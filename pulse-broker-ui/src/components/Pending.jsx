import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { getPendingDeals, loadDeal, deleteDeal, getFirms, getItems, getMarkas, updateDeal, getContacts } from '../api';
import DateInput from './DateInput';
import ConfirmModal from './ConfirmModal';
import { getLocalTodayDateString, formatDate } from '../utils/dateUtils';


const Pending = () => {
    const { t } = useLanguage();
    const { addToast } = useToast();
    const [deals, setDeals] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Load Action State
    const [selectedDeal, setSelectedDeal] = useState(null);
    const [loadData, setLoadData] = useState({ loadDates: [getLocalTodayDateString()], weight: '', purchaserId: '', sellerId: '' });
    
    const [firms, setFirms] = useState([]);
    const [items, setItems] = useState([]);
    const [markas, setMarkas] = useState([]);
    const [contacts, setContacts] = useState([]);

    const [searchQuery, setSearchQuery] = useState('');
    const [dateSort, setDateSort] = useState('desc'); // 'original', 'asc', 'desc'

    const handleSortToggle = () => {
        if (dateSort === 'original') setDateSort('desc');
        else if (dateSort === 'desc') setDateSort('asc');
        else setDateSort('original');
    };

    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });
    const [isLoading, setIsLoading] = useState(true);

    const fetchDeals = () => getPendingDeals().then(setDeals);
    
    useEffect(() => { 
        Promise.all([
            fetchDeals(),
            getFirms().then(setFirms),
            getItems().then(setItems),
            getMarkas().then(setMarkas),
            getContacts().then(setContacts)
        ])
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }, []);

    const handleLoad = async () => {
        const finalLoadDate = loadData.loadDates.filter(d => d).join(', ');
        if (!selectedDeal || !loadData.weight || !finalLoadDate) return;
        const weightToLoad = parseFloat(loadData.weight);
        if (weightToLoad <= 0) {
            addToast('Loading weight must be greater than zero.', 'error');
            return;
        }
        if (weightToLoad > selectedDeal.weight) {
            addToast('Cannot load more than pending weight.', 'error');
            return;
        }
        if (!selectedDeal.purchaser && !loadData.purchaserId) {
            addToast('Please select Purchaser Firm', 'error');
            return;
        }
        if (!selectedDeal.seller && !loadData.sellerId) {
            addToast('Please select Seller Firm', 'error');
            return;
        }
        setIsProcessing(true);
        try {
            await loadDeal(selectedDeal.id, {
                loadDate: finalLoadDate,
                weight: weightToLoad,
                purchaserId: loadData.purchaserId || null,
                sellerId: loadData.sellerId || null
            });
            addToast('Deal Loaded Successfully!', 'success');
            setSelectedDeal(null);
            fetchDeals(); // refresh list
        } catch (e) {
            addToast(e.response?.data?.message || 'Failed to load deal', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteDeal = (id) => {
        setConfirmDialog({ isOpen: true, id: id });
    };

    const executeDelete = async () => {
        const id = confirmDialog.id;
        setConfirmDialog({ isOpen: false, id: null });
        setIsProcessing(true);
        try {
            await deleteDeal(id);
            addToast('Deal Deleted Successfully!', 'success');
            fetchDeals();
        } catch (e) {
            addToast(e.response?.data?.message || 'Failed to delete deal', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const navigate = useNavigate();
    const openEditDeal = (deal) => {
        navigate(`/app/deals/edit/${deal.id}`);
    };

    const filteredDeals = deals.filter(deal => {
        const q = searchQuery.toLowerCase();
        return (
            (deal.purchaserContact?.name || '').toLowerCase().includes(q) ||
            (deal.purchaser?.name || '').toLowerCase().includes(q) ||
            (deal.sellerContact?.name || '').toLowerCase().includes(q) ||
            (deal.seller?.name || '').toLowerCase().includes(q) ||
            (deal.item?.name || '').toLowerCase().includes(q) ||
            (deal.marka?.name || '').toLowerCase().includes(q)
        );
    }).sort((a, b) => {
        if (dateSort === 'desc' || dateSort === 'asc') {
            const dateDiff = new Date(b.dealDate) - new Date(a.dealDate);
            if (dateDiff !== 0) return dateSort === 'desc' ? dateDiff : -dateDiff;
        }
        return b.id - a.id;
    });

    return (
        <div className="max-w-6xl mx-auto p-4 py-8 relative">
            {isProcessing && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center animate-slide-in">
                        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-primary font-bold text-lg">{t('Processing...', 'प्रक्रिया चल रही है...')}</p>
                        <p className="text-xs text-gray-400 mt-2">{t('Please do not close this window', 'कृपया इस विंडो को बंद न करें')}</p>
                    </div>
                </div>
            )}
            <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.16em] text-secondary mb-2">
                        <span className="w-6 h-px bg-secondary/50"></span>{t('Dispatch Management', 'डिस्पैच प्रबंधन')}
                    </div>
                    <h1 className="text-2xl sm:text-[32px] font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        <span className="text-3xl sm:text-4xl text-secondary">🚚</span> {t('Pending Deals', 'लंबित सौदे')}
                    </h1>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-72">
                        <input 
                            type="text" 
                            placeholder={t('Search Firm, Item, or Marka...', 'फर्म, आइटम खोजें...')} 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-4 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-secondary focus:border-secondary transition-all shadow-sm outline-none bg-white font-medium"
                        />
                        <div className="absolute right-4 top-3.5 text-gray-400">
                            🔍
                        </div>
                    </div>
                    <button 
                        onClick={handleSortToggle} 
                        className="sm:hidden flex items-center justify-center p-3 border-2 border-gray-200 rounded-xl bg-white text-gray-500 hover:text-secondary transition-colors"
                        title={t('Sort by Date', 'तारीख के अनुसार क्रमबद्ध करें')}
                    >
                        <span className="text-lg leading-none">
                            {dateSort === 'desc' ? '▼' : dateSort === 'asc' ? '▲' : '↕'}
                        </span>
                    </button>
                </div>
            </div>
            
            <div className="bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden mb-6 relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-secondary opacity-5 rounded-bl-full pointer-events-none"></div>

                {/* Loader */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 col-span-full">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mb-4"></div>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">{t('Loading Deals...', 'लोड हो रहा है...')}</p>
                    </div>
                ) : (
                <>
                <div className="hidden md:block overflow-x-auto relative z-10">
                    <table className="w-full text-left text-sm text-textMain border-collapse">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200 sticky top-0">
                            <tr>
                                <th className="px-5 py-4 font-bold whitespace-nowrap cursor-pointer select-none hover:text-gray-700 transition-colors" onClick={handleSortToggle}>
                                    <div className="flex items-center gap-2">
                                        {t('Deal Date', 'तारीख')}
                                        <span className="text-gray-400 text-[10px]">
                                            {dateSort === 'desc' ? '▼' : dateSort === 'asc' ? '▲' : '↕'}
                                        </span>
                                    </div>
                                </th>
                                <th className="px-5 py-4 font-bold">{t('Purchaser', 'खरीदार')}</th>
                                <th className="px-5 py-4 font-bold">{t('Seller', 'विक्रेता')}</th>
                                <th className="px-5 py-4 font-bold">{t('Item & Marka', 'आइटम और मार्का')}</th>
                                <th className="px-5 py-4 font-bold text-right">{t('Actions', 'क्रियाएं')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredDeals.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-12 text-center">
                                        <div className="text-4xl mb-3 opacity-50">📋</div>
                                        <h3 className="text-lg font-bold text-textMain">{t('No Pending Deals', 'कोई लंबित सौदा नहीं')}</h3>
                                        <p className="text-textMuted mt-1">{t('Try adjusting your search query', 'अपनी खोज बदलें')}</p>
                                    </td>
                                </tr>
                            ) : filteredDeals.map(deal => (
                                <tr key={deal.id} className="hover:bg-yellow-50/50 transition-colors group">
                                    <td className="px-5 py-4 font-semibold text-gray-600">
                                        <div className="flex flex-col gap-1">
                                            {deal.purchaserDealDate && deal.purchaserDealDate !== deal.dealDate ? (
                                                <>
                                                    <span className="text-secondary text-xs" title="Seller Date">S: {formatDate(deal.dealDate)}</span>
                                                    <span className="text-primary text-xs" title="Buyer Date">P: {formatDate(deal.purchaserDealDate)}</span>
                                                </>
                                            ) : (
                                                <span>{formatDate(deal.dealDate)}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 font-bold text-primary group-hover:text-red-900 transition-colors">
                                        {deal.purchaserContact?.name || deal.purchaser?.name}
                                        {deal.purchaserContact && deal.purchaser && <div className="text-xs font-normal text-gray-500">{deal.purchaser.name}</div>}
                                    </td>
                                    <td className="px-5 py-4 font-bold text-primary group-hover:text-red-900 transition-colors">
                                        {deal.sellerContact?.name || deal.seller?.name}
                                        {deal.sellerContact && deal.seller && <div className="text-xs font-normal text-gray-500">{deal.seller.name}</div>}
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200 font-bold shadow-sm">{deal.item?.name}</span> 
                                        <span className="text-secondary font-bold ml-1.5">{deal.marka?.name}</span>
                                        <div className="mt-1.5 text-xs text-textMuted font-bold uppercase flex items-center gap-2">
                                            <span className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">{deal.weight} {t('QTL', 'क्विंटल')} {deal.numberOfPackets ? `(${deal.numberOfPackets} ${t('Bags', 'बोरी')})` : ''}</span> 
                                            <span>@ ₹{deal.rate}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-right whitespace-nowrap">
                                        <button data-testid="edit-deal-btn" onClick={() => openEditDeal(deal)} className="bg-white hover:bg-gray-50 border-2 border-gray-200 text-gray-600 transition-all font-bold py-1.5 px-3 rounded-lg shadow-sm text-xs mr-2" title={t('Edit Deal', 'सौदा संपादित करें')}>
                                            ✏️ {t('Edit', 'संपादन')}
                                        </button>
                                        <button onClick={() => handleDeleteDeal(deal.id)} className="bg-white hover:bg-red-50 border-2 border-red-200 text-red-600 transition-all font-bold py-1.5 px-3 rounded-lg shadow-sm text-xs mr-2" title={t('Delete Deal', 'सौदा मिटाएं')}>
                                            🗑️ {t('Delete', 'मिटाएं')}
                                        </button>
                                        <button onClick={() => { setSelectedDeal(deal); setLoadData({ loadDates: [getLocalTodayDateString()], weight: deal.weight, purchaserId: '', sellerId: '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="bg-secondary hover:bg-yellow-600 hover:-translate-y-0.5 transition-all text-white font-bold py-1.5 px-4 rounded-lg shadow-md text-xs uppercase tracking-wider">
                                            {t('Load Now', 'लोड करें')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card Layout */}
                <div className="md:hidden flex flex-col gap-3 p-3 bg-gray-50/50">
                    {filteredDeals.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 font-medium bg-white rounded-xl border border-gray-100">
                            <div className="text-4xl mb-3 opacity-50">📋</div>
                            <h3 className="text-lg font-bold text-gray-900">{t('No Pending Deals', 'कोई लंबित सौदा नहीं')}</h3>
                            <p className="text-gray-400 mt-1">{t('Try adjusting your search query', 'अपनी खोज बदलें')}</p>
                        </div>
                    ) : filteredDeals.map(deal => (
                        <div key={deal.id} className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-secondary transition-colors relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-secondary to-yellow-300"></div>
                            
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex gap-2 items-center">
                                    <span className="bg-gray-100 px-2 py-1 rounded-md font-bold text-xs text-gray-700 shadow-sm border border-gray-200">{deal.item?.name}</span>
                                    <span className="text-secondary font-extrabold text-xs">{deal.marka?.name}</span>
                                </div>
                                <div className="text-xs text-gray-500 font-bold border border-gray-200 px-2 py-1 rounded-md bg-gray-50 shadow-sm flex flex-col items-end">
                                    {deal.purchaserDealDate && deal.purchaserDealDate !== deal.dealDate ? (
                                        <>
                                            <span className="text-secondary">S: {formatDate(deal.dealDate)}</span>
                                            <span className="text-primary">P: {formatDate(deal.purchaserDealDate)}</span>
                                        </>
                                    ) : (
                                        <span>{formatDate(deal.dealDate)}</span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center bg-gray-50 p-2 rounded-xl border border-gray-100 mb-3">
                                <div className="flex flex-col flex-1">
                                    <span className="font-extrabold text-sm text-gray-900">{deal.purchaserContact?.name || deal.purchaser?.name}</span>
                                    {deal.purchaserContact && deal.purchaser && <span className="text-xs font-normal text-gray-500">{deal.purchaser.name}</span>}
                                    <span className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">{t('Purchaser', 'खरीदार')}</span>
                                </div>
                                <div className="flex items-center justify-center px-2">
                                    <span className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[10px] shadow-sm">➡️</span>
                                </div>
                                <div className="flex flex-col flex-1 text-right">
                                    <span className="font-extrabold text-sm text-gray-900">{deal.sellerContact?.name || deal.seller?.name}</span>
                                    {deal.sellerContact && deal.seller && <span className="text-xs font-normal text-gray-500">{deal.seller.name}</span>}
                                    <span className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">{t('Seller', 'विक्रेता')}</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mb-4 px-1">
                                <span className="font-medium flex flex-col">
                                    <span className="text-[10px] text-gray-400 uppercase">{t('Quantity', 'मात्रा')}</span>
                                    <span className="font-extrabold text-gray-800">{deal.numberOfPackets ? `${deal.numberOfPackets} ${t('Bags', 'बोरी')} / ` : ''}{deal.weight} {t('qtl', 'क्विंटल')}</span>
                                </span>
                                <span className="font-medium flex flex-col text-right">
                                    <span className="text-[10px] text-gray-400 uppercase">{t('Rate', 'भाव')}</span>
                                    <span className="font-black text-lg text-primary">₹{deal.rate}</span>
                                </span>
                            </div>

                            <div className="flex gap-2 pt-3 border-t border-gray-100 mt-2">
                                <button onClick={() => { setSelectedDeal(deal); setLoadData({ loadDates: [getLocalTodayDateString()], weight: deal.weight, purchaserId: '', sellerId: '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex-1 bg-secondary hover:bg-yellow-600 text-white font-bold py-2.5 px-4 rounded-xl shadow-md text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95">
                                    <span>🚚</span> {t('Load', 'लोड')}
                                </button>
                                <button data-testid="edit-deal-btn" onClick={() => openEditDeal(deal)} className="bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold py-2.5 px-5 rounded-xl shadow-sm transition-all text-xs uppercase tracking-wider flex items-center justify-center active:scale-95">
                                    ✏️ {t('Edit', 'संपादन')}
                                </button>
                                <button onClick={() => handleDeleteDeal(deal.id)} className="bg-red-50 border border-red-100 hover:bg-red-100 text-red-600 font-bold py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center active:scale-95">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                </>
                )}
            </div>

            {/* Load Deal Modal */}
            {selectedDeal && (
                <div className="modal-overlay">
                    <div className="modal-content border-t-8 border-secondary relative overflow-hidden animate-slide-in">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-secondary opacity-10 rounded-bl-full pointer-events-none"></div>
                        <h2 className="text-2xl font-bold mb-5 flex items-center gap-2">
                            <span className="text-secondary">🚚</span> {t('Load Item / Dispatch', 'लोडिंग दर्ज करें')}
                        </h2>
                        
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-5 flex justify-between items-center">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase">{t('Firm Details', 'फर्म का विवरण')}</p>
                                <p className="font-bold text-primary mt-0.5">{selectedDeal.purchaser?.name} <span className="text-gray-400 mx-1">/</span> {selectedDeal.seller?.name}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-gray-500 uppercase">{t('Item', 'आइटम')}</p>
                                <p className="font-bold text-secondary mt-0.5">{selectedDeal.item?.name} - {selectedDeal.marka?.name}</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                {t('Loading Dates', 'लोडिंग की तारीख')}
                            </label>
                            {loadData.loadDates.map((date, idx) => (
                                <div key={idx} className="flex items-center gap-2 mb-2">
                                    <div className="flex-1">
                                        <DateInput
                                            value={date}
                                            onChange={e => {
                                                const newDates = [...loadData.loadDates];
                                                newDates[idx] = e.target.value;
                                                setLoadData(prev => ({...prev, loadDates: newDates}));
                                            }}
                                            variant="load"
                                        />
                                    </div>
                                    {idx > 0 && (
                                        <button type="button" onClick={() => {
                                            const newDates = loadData.loadDates.filter((_, i) => i !== idx);
                                            setLoadData(prev => ({...prev, loadDates: newDates}));
                                        }} className="text-gray-400 hover:text-red-500 font-bold p-2 text-xl" title="Remove Date">
                                            🗑️
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button type="button" onClick={() => {
                                setLoadData(prev => ({...prev, loadDates: [...prev.loadDates, '']}));
                            }} className="text-secondary hover:text-yellow-600 font-bold text-xs uppercase flex items-center gap-1 mt-1 transition-colors">
                                <span>➕ {t('Add Date', 'तारीख जोड़ें')}</span>
                            </button>
                        </div>
                        <div className="mb-8">
                            <label className="block text-sm font-bold text-textMain mb-1.5">{t('Loaded Weight (Qtl)', 'लोड किया गया वजन')}</label>
                            <div className="relative">
                                <input type="number" value={loadData.weight} onChange={e => setLoadData({...loadData, weight: e.target.value})} max={selectedDeal.weight} min="0.01" step="0.01" className="w-full border-2 border-gray-300 p-3 pl-4 rounded-lg font-bold text-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-all outline-none" />
                                <div className="absolute right-4 top-3.5 text-gray-400 font-bold">QTL</div>
                            </div>
                            <div className="flex justify-between items-center mt-2 px-1">
                                <p className="text-xs text-textMuted font-medium">{t('Pending', 'शेष')}: <span className="font-bold text-secondary text-sm">{selectedDeal.weight}</span> {t('Qtl', 'क्विंटल')}</p>
                                <p className="text-xs text-moneyGreen font-bold italic animate-pulse">* {t('Automatically splits if partial', 'आंशिक होने पर स्वचालित विभाजन')}</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 pb-5 -mb-5 mt-4 border-t border-gray-100 sticky bottom-0 bg-white z-20 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] rounded-b-xl">
                            <button onClick={() => setSelectedDeal(null)} className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 transition-colors font-bold rounded-lg text-gray-600">{t('Cancel', 'रद्द करें')}</button>
                            <button onClick={handleLoad} disabled={isProcessing} className={`px-6 py-2.5 transition-colors text-white font-bold rounded-lg shadow-lg flex items-center gap-2 ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-secondary hover:bg-yellow-600'}`}>
                                <span>{isProcessing ? t('Processing...', 'प्रक्रिया चल रही है...') : t('Confirm Loading', 'लोडिंग पक्की करें')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal 
                isOpen={confirmDialog.isOpen}
                title={t('Delete Deal', 'सौदा मिटाएं')}
                message={t('Are you sure you want to delete this deal?', 'क्या आप वाकई इस सौदे को मिटाना चाहते हैं?')}
                onConfirm={executeDelete}
                onCancel={() => setConfirmDialog({ isOpen: false, id: null })}
            />
        </div>
    );
};

export default Pending;
