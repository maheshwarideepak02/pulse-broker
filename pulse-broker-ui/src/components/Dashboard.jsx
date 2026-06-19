import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { getDeals, getDashboardSummary, revertDeal, revertBulkDeals } from '../api';
import { formatDate } from '../utils/dateUtils';

const Dashboard = () => {
    const { t, lang } = useLanguage();
    const { addToast } = useToast();
    const [deals, setDeals] = useState([]);
    const [summary, setSummary] = useState({ totalBilled: 0, totalUnbilled: 0, dealsThisMonth: 0, pendingLoads: 0 });
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = () => {
        setIsLoading(true);
        Promise.all([
            getDeals().then(setDeals),
            getDashboardSummary().then(setSummary)
        ])
        .catch(console.error)
        .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRevertDeal = async (dealOrId) => {
        try {
            // Check if we passed a grouped deal object
            if (typeof dealOrId === 'object' && dealOrId._childIds && dealOrId._childIds.length > 0) {
                // Pre-check if any child is billed
                const hasBilledChild = dealOrId._childIds.some(id => {
                    const childDeal = deals.find(d => d.id === id);
                    return childDeal && (childDeal.status === 'BILLED' || childDeal.purchaserBill || childDeal.sellerBill);
                });
                if (hasBilledChild) {
                    addToast('Cannot revert: One or more partial loads have already been billed.', 'error');
                    return;
                }
                // Execute atomically on the backend to prevent optimistic lock conflicts and half-reverted states
                await revertBulkDeals(dealOrId._childIds);
            } else {
                await revertDeal(dealOrId);
            }
            addToast('Deal reverted to Pending status successfully.', 'success');
            fetchData();
        } catch (e) {
            console.error(e);
            addToast(e.response?.data?.message || 'Failed to revert deal', 'error');
        }
    };

    const rawLoadedDeals = [...deals]
        .filter(d => d.status === 'LOADED' || d.status === 'BILLED');

    // Group partial loads by parent deal
    const groupedMap = new Map();
    rawLoadedDeals.forEach(d => {
        const key = d.parentDeal ? d.parentDeal.id : d.id;
        if (!groupedMap.has(key)) {
            groupedMap.set(key, { ...d, _childIds: [d.id], _allLoadDates: d.loadDate ? d.loadDate.split(',').map(s=>s.trim()) : [] });
        } else {
            const existing = groupedMap.get(key);
            existing.weight = parseFloat(existing.weight) + parseFloat(d.weight);
            existing.numberOfPackets = parseInt(existing.numberOfPackets || 0) + parseInt(d.numberOfPackets || 0);
            if (d.loadDate) {
                const dates = d.loadDate.split(',').map(s=>s.trim());
                dates.forEach(date => {
                    if (!existing._allLoadDates.includes(date)) existing._allLoadDates.push(date);
                });
            }
            existing._childIds.push(d.id);
        }
    });

    const loadedDeals = Array.from(groupedMap.values()).map(d => {
        if (d._allLoadDates && d._allLoadDates.length > 0) {
            d.loadDate = d._allLoadDates.join(', ');
        }
        return d;
    }).sort((a, b) => {
        const dateDiff = new Date(b.dealDate) - new Date(a.dealDate);
        return dateDiff !== 0 ? dateDiff : b.id - a.id;
    });
    
    const filteredLoadedDeals = loadedDeals.filter(deal => {
        const q = searchQuery.toLowerCase();
        return (
            (deal.purchaser?.name || '').toLowerCase().includes(q) ||
            (deal.seller?.name || '').toLowerCase().includes(q) ||
            (deal.item?.name || '').toLowerCase().includes(q)
        );
    }).slice(0, 8); // Show up to 8 matching recent deals

    return (
        <div className="max-w-7xl mx-auto p-3 sm:p-6 py-6 sm:py-9">
            <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-3">
                <div className="w-full sm:w-auto text-center sm:text-left">
                    <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.16em] text-secondary mb-2 justify-center sm:justify-start">
                        <span className="w-6 h-px bg-secondary/50"></span>{t('Business overview', 'व्यापार अवलोकन')}
                    </div>
                    <h1 className="text-2xl sm:text-[32px] font-extrabold text-gray-900 tracking-tight mb-1">{t('Good day, welcome back', 'नमस्कार, आपका स्वागत है')}</h1>
                    <p className="text-textMuted font-medium text-xs sm:text-sm">{new Date().toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="w-full sm:w-auto flex justify-center sm:justify-end mt-2 sm:mt-0">
                    <button className="flex bg-primary hover:bg-red-900 text-white transition-all text-sm font-bold items-center gap-2 px-6 py-3 sm:px-4 sm:py-2.5 rounded-xl shadow-md sm:shadow-sm w-full sm:w-auto justify-center" onClick={() => window.location.href='/app/new-deal'}>
                        <span className="text-lg leading-none">＋</span> {t('Create new deal', 'नया सौदा बनाएं')}
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-10">
                <div className="bg-white border border-gray-100 p-4 sm:p-6 rounded-2xl shadow-sm hover:shadow-lg transition-all relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
                    <p className="text-textMuted text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">{t('Total Outstanding', 'कुल बकाया')}</p>
                    <p className="text-xl sm:text-3xl font-bold text-primary mt-1 sm:mt-2">₹{summary.totalOutstanding?.toLocaleString()}</p>
                </div>
                <div className="bg-white border border-gray-100 p-4 sm:p-6 rounded-2xl shadow-sm hover:shadow-lg transition-all relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-moneyGreen"></div>
                    <p className="text-textMuted text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">{t('Unbilled Brok.', 'बिना बिल दलाली')}</p>
                    <p className="text-xl sm:text-3xl font-bold text-moneyGreen mt-1 sm:mt-2">₹{summary.totalUnbilled?.toLocaleString()}</p>
                </div>
                <div className="bg-white border border-gray-100 p-4 sm:p-6 rounded-2xl shadow-sm hover:shadow-lg transition-all relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-600"></div>
                    <p className="text-textMuted text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">{t('This Month', 'इस महीने')}</p>
                    <p className="text-xl sm:text-3xl font-bold text-textMain mt-1 sm:mt-2">{summary.dealsThisMonth}</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 p-4 sm:p-6 rounded-2xl shadow-sm hover:shadow-lg transition-all relative overflow-hidden group cursor-pointer" onClick={() => window.location.href='/app/pending'}>
                    <div className="absolute top-0 left-0 w-full h-1 bg-secondary"></div>
                    <div className="absolute right-[-10px] bottom-[-10px] text-4xl sm:text-6xl opacity-10 group-hover:scale-110 transition-transform">🚚</div>
                    <p className="text-secondary text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">{t('Pending', 'लंबित')}</p>
                    <p className="text-xl sm:text-3xl font-bold text-secondary mt-1 sm:mt-2 flex items-baseline gap-1 sm:gap-2">
                        {summary.pendingLoads} <span className="text-[10px] sm:text-sm uppercase tracking-wide">{t('Deals', 'सौदे')}</span>
                    </p>
                </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl shadow-md overflow-hidden relative">
                <div className="bg-white px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                    <h2 className="font-extrabold text-lg sm:text-xl text-gray-900 flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl bg-red-50 text-primary grid place-items-center text-base">↗</span> {t('Recent Deals', 'हाल के सौदे')}
                    </h2>
                    <div className="relative w-full sm:w-64">
                        <input 
                            type="text" 
                            placeholder={t('Search deals...', 'सौदे खोजें...')} 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm outline-none text-sm font-medium"
                        />
                        <div className="absolute right-3 top-2 text-gray-400">🔍</div>
                    </div>
                </div>
                
                {/* Loader */}
                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary"></div>
                        <p className="mt-4 text-gray-500 font-medium">Loading Deals...</p>
                    </div>
                )}
                
                {/* Desktop Table */}
                {!isLoading && (
                    <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm text-textMain">
                        <thead className="bg-white text-xs uppercase text-gray-500 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 font-bold">{t('Dealing Date', 'सौदे की तारीख')}</th>
                                <th className="px-6 py-4 font-bold">{t('Loading Date', 'लोडिंग की तारीख')}</th>
                                <th className="px-6 py-4 font-bold">{t('Purchaser', 'खरीदार')}</th>
                                <th className="px-6 py-4 font-bold">{t('Seller', 'विक्रेता')}</th>
                                <th className="px-6 py-4 font-bold">{t('Item (Marka)', 'आइटम (मार्का)')}</th>
                                <th className="px-6 py-4 font-bold text-right">{t('Bags', 'बोरा')}</th>
                                <th className="px-6 py-4 font-bold text-right">{t('Weight', 'वजन')}</th>
                                <th className="px-6 py-4 font-bold text-right">{t('Rate', 'भाव')}</th>
                                <th className="px-6 py-4 font-bold text-right">{t('P. Brok', 'खरीदार दलाली')}</th>
                                <th className="px-6 py-4 font-bold text-right">{t('S. Brok', 'विक्रेता दलाली')}</th>
                                <th className="px-6 py-4 font-bold text-center"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredLoadedDeals.length === 0 ? (
                                <tr><td colSpan="7" className="p-8 text-center text-gray-500 font-medium">{t('No deals match your search.', 'आपकी खोज से कोई सौदा मेल नहीं खाता।')}</td></tr>
                            ) : (
                                filteredLoadedDeals.map(deal => (
                                    <tr key={deal.id} className="hover:bg-red-50/30 transition-colors">
                                        <td className="px-6 py-4 text-gray-500 font-medium">{formatDate(deal.dealDate)}</td>
                                        <td className="px-6 py-4 text-gray-500 font-medium">{formatDate(deal.loadDate)}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-textMain">{deal.purchaser?.name}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase">{deal.purchaserContact?.name}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-textMain">{deal.seller?.name}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase">{deal.sellerContact?.name}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-gray-100 px-2 py-1 rounded font-bold text-xs border border-gray-200">{deal.item?.name}</span>
                                            <span className="text-secondary font-bold text-xs ml-1.5">{deal.marka?.name}</span>
                                            {deal.brokeragePayer && (
                                                <div className="mt-1">
                                                    <span className="text-[10px] uppercase font-bold text-gray-400">
                                                        {deal.brokeragePayer === 'PURCHASER_BOTH' ? t('Buyer Pays Brokerage', 'खरीदार दलाली देगा') : deal.brokeragePayer === 'SELLER_BOTH' ? t('Seller Pays Brokerage', 'विक्रेता दलाली देगा') : t('Separate Brokerage', 'अलग-अलग दलाली')}
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-500">{deal.numberOfPackets || '-'}</td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-700">{deal.weight}</td>
                                        <td className="px-6 py-4 text-right text-secondary font-bold">₹{deal.rate}</td>
                                        <td className="px-6 py-4 text-right text-gray-600 font-bold">₹{deal.pBrokerage || 0}</td>
                                        <td className="px-6 py-4 text-right text-gray-600 font-bold">₹{deal.sBrokerage || 0}</td>
                                        <td className="px-4 py-4 text-center">
                                            {deal.status === 'LOADED' && (
                                                <button onClick={() => handleRevertDeal(deal)} className="text-gray-400 hover:text-red-500 transition-colors bg-white px-2 py-1 rounded shadow-sm border border-gray-200 ml-auto flex items-center gap-1 text-xs font-bold" title="Undo Load">
                                                    ↩️ {t('Undo', 'पूर्ववत')}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                )}

                {/* Mobile Card Layout */}
                {!isLoading && (
                <div className="md:hidden flex flex-col gap-3 p-3 bg-gray-50/50">
                    {filteredLoadedDeals.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 font-medium bg-white rounded-xl border border-gray-100">{t('No deals match your search.', 'आपकी खोज से कोई सौदा मेल नहीं खाता।')}</div>
                    ) : (
                        filteredLoadedDeals.map(deal => (
                            <div key={deal.id} className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-primary transition-colors relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-secondary"></div>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex gap-2 items-center">
                                        <span className="bg-gray-100 px-2 py-1 rounded-md font-bold text-xs text-gray-700 shadow-sm border border-gray-200">{deal.item?.name}</span>
                                        <span className="text-secondary font-extrabold text-xs">{deal.marka?.name}</span>
                                    </div>
                                    <span className="text-primary font-black text-lg">₹{deal.rate}</span>
                                </div>
                                {deal.brokeragePayer && (
                                    <div className="mb-3">
                                        <span className="text-[10px] uppercase font-bold text-white bg-gray-800 px-2 py-0.5 rounded shadow-sm">
                                            {deal.brokeragePayer === 'PURCHASER_BOTH' ? t('Buyer Pays Brokerage', 'खरीदार दलाली देगा') : deal.brokeragePayer === 'SELLER_BOTH' ? t('Seller Pays Brokerage', 'विक्रेता दलाली देगा') : t('Separate Brokerage', 'अलग-अलग दलाली')}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center bg-gray-50 p-2 rounded-xl border border-gray-100 mb-3">
                                    <div className="flex flex-col flex-1">
                                        <span className="font-extrabold text-sm text-gray-900">{deal.purchaser?.name}</span>
                                        <span className="text-[10px] text-gray-500 font-bold uppercase">{deal.purchaserContact?.name}</span>
                                    </div>
                                    <div className="flex items-center justify-center px-2">
                                        <span className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[10px] shadow-sm">➡️</span>
                                    </div>
                                    <div className="flex flex-col flex-1 text-right">
                                        <span className="font-extrabold text-sm text-gray-900">{deal.seller?.name}</span>
                                        <span className="text-[10px] text-gray-500 font-bold uppercase">{deal.sellerContact?.name}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-xs text-gray-500 mb-3 px-1">
                                    <span className="font-medium flex flex-col">
                                        <span className="text-[10px] text-gray-400 uppercase">{t('Deal Date', 'सौदा')}</span>
                                        {formatDate(deal.dealDate)}
                                    </span>
                                    <span className="font-medium flex flex-col text-right">
                                        <span className="text-[10px] text-gray-400 uppercase">{t('Quantity', 'मात्रा')}</span>
                                        <span className="font-extrabold text-gray-800">{deal.numberOfPackets ? `${deal.numberOfPackets} ${t('Bags', 'बोरी')} / ` : ''}{deal.weight} {t('qtl', 'क्विंटल')}</span>
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-[11px] border-t border-gray-100 pt-3 px-1">
                                    <span className="font-bold text-gray-500">{t('P. Brok:', 'खरीदार दलाली:')} <span className="text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">₹{deal.pBrokerage || 0}</span></span>
                                    <span className="font-bold text-gray-500">{t('S. Brok:', 'विक्रेता दलाली:')} <span className="text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">₹{deal.sBrokerage || 0}</span></span>
                                </div>
                                {deal.status === 'LOADED' && (
                                    <div className="flex justify-end pt-3 mt-2">
                                        <button onClick={() => handleRevertDeal(deal)} className="text-[11px] font-bold text-gray-500 hover:text-red-600 flex items-center gap-1.5 bg-white border border-gray-200 shadow-sm px-3 py-1.5 rounded-lg active:scale-95 transition-all">
                                            ↩️ {t('Undo Load', 'लोड पूर्ववत करें')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
