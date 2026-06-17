import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { getDeals, getDashboardSummary, revertDeal } from '../api';
import { formatDate } from '../utils/dateUtils';

const Dashboard = () => {
    const { t } = useLanguage();
    const { addToast } = useToast();
    const [deals, setDeals] = useState([]);
    const [summary, setSummary] = useState({ totalBilled: 0, totalUnbilled: 0, dealsThisMonth: 0, pendingLoads: 0 });
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = () => {
        getDeals().then(setDeals).catch(console.error);
        getDashboardSummary().then(setSummary).catch(console.error);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRevertDeal = async (dealId) => {
        try {
            await revertDeal(dealId);
            addToast('Deal reverted to Pending status successfully.', 'success');
            fetchData();
        } catch (e) {
            console.error(e);
            addToast(e.response?.data?.message || 'Failed to revert deal', 'error');
        }
    };

    const loadedDeals = deals.filter(d => d.status === 'LOADED' || d.status === 'BILLED').reverse();
    
    const filteredLoadedDeals = loadedDeals.filter(deal => {
        const q = searchQuery.toLowerCase();
        return (
            (deal.purchaser?.name || '').toLowerCase().includes(q) ||
            (deal.seller?.name || '').toLowerCase().includes(q) ||
            (deal.item?.name || '').toLowerCase().includes(q)
        );
    }).slice(0, 8); // Show up to 8 matching recent deals

    return (
        <div className="max-w-7xl mx-auto p-3 sm:p-4 py-6 sm:py-8">
            <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight mb-1">{t('Daily Overview', 'दैनिक अवलोकन')}</h1>
                    <p className="text-textMuted font-medium text-xs sm:text-sm">{new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <button className="text-textMuted hover:text-primary transition-colors text-sm font-bold flex items-center gap-2" onClick={() => window.location.href='/login'}>
                    {t('Logout', 'लॉग आउट')} <span className="text-lg">🚪</span>
                </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-10">
                <div className="bg-white border border-gray-100 p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-lg transition-all relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-red-600"></div>
                    <p className="text-textMuted text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">{t('Total Outstanding', 'कुल बकाया')}</p>
                    <p className="text-xl sm:text-3xl font-bold text-primary mt-1 sm:mt-2">₹{summary.totalOutstanding?.toLocaleString()}</p>
                </div>
                <div className="bg-white border border-gray-100 p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-lg transition-all relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-moneyGreen"></div>
                    <p className="text-textMuted text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">{t('Unbilled Brok.', 'बिना बिल दलाली')}</p>
                    <p className="text-xl sm:text-3xl font-bold text-moneyGreen mt-1 sm:mt-2">₹{summary.totalUnbilled?.toLocaleString()}</p>
                </div>
                <div className="bg-white border border-gray-100 p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-lg transition-all relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
                    <p className="text-textMuted text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">{t('This Month', 'इस महीने')}</p>
                    <p className="text-xl sm:text-3xl font-bold text-textMain mt-1 sm:mt-2">{summary.dealsThisMonth}</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-lg transition-all relative overflow-hidden group cursor-pointer" onClick={() => window.location.href='/app/pending'}>
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-secondary"></div>
                    <div className="absolute right-[-10px] bottom-[-10px] text-4xl sm:text-6xl opacity-10 group-hover:scale-110 transition-transform">🚚</div>
                    <p className="text-secondary text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">{t('Pending', 'लंबित')}</p>
                    <p className="text-xl sm:text-3xl font-bold text-secondary mt-1 sm:mt-2 flex items-baseline gap-1 sm:gap-2">
                        {summary.pendingLoads} <span className="text-[10px] sm:text-sm uppercase tracking-wide">{t('Deals', 'सौदे')}</span>
                    </p>
                </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-xl shadow-md overflow-hidden relative">
                <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                    <h2 className="font-bold text-lg sm:text-xl text-primary flex items-center gap-2">
                        <span className="text-secondary text-xl sm:text-2xl">📝</span> {t('Recent Deals', 'हाल के सौदे')}
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
                
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm text-textMain">
                        <thead className="bg-white text-xs uppercase text-gray-500 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 font-bold">{t('Date', 'तारीख')}</th>
                                <th className="px-6 py-4 font-bold">{t('Load Date', 'लोडिंग')}</th>
                                <th className="px-6 py-4 font-bold">{t('Purchaser', 'खरीदार')}</th>
                                <th className="px-6 py-4 font-bold">{t('Seller', 'विक्रेता')}</th>
                                <th className="px-6 py-4 font-bold">{t('Item (Marka)', 'आइटम (मार्का)')}</th>
                                <th className="px-6 py-4 font-bold text-right">{t('Weight', 'वजन')}</th>
                                <th className="px-6 py-4 font-bold text-right">{t('Bags', 'बोरा')}</th>
                                <th className="px-6 py-4 font-bold text-right">{t('Rate', 'भाव')}</th>
                                <th className="px-6 py-4 font-bold text-center"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredLoadedDeals.length === 0 ? (
                                <tr><td colSpan="7" className="p-8 text-center text-gray-500 font-medium">No deals match your search.</td></tr>
                            ) : (
                                filteredLoadedDeals.map(deal => (
                                    <tr key={deal.id} className="hover:bg-red-50/30 transition-colors">
                                        <td className="px-6 py-4 text-gray-500 font-medium">{formatDate(deal.dealDate)}</td>
                                        <td className="px-6 py-4 text-gray-500 font-medium">{formatDate(deal.loadDate)}</td>
                                        <td className="px-6 py-4 font-bold text-textMain">{deal.purchaser?.name}</td>
                                        <td className="px-6 py-4 font-bold text-textMain">{deal.seller?.name}</td>
                                        <td className="px-6 py-4">
                                            <span className="bg-gray-100 px-2 py-1 rounded font-bold text-xs border border-gray-200">{deal.item?.name}</span>
                                            <span className="text-secondary font-bold text-xs ml-1.5">{deal.marka?.name}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-700">{deal.weight}</td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-500">{deal.numberOfPackets || '-'}</td>
                                        <td className="px-6 py-4 text-right text-secondary font-bold">₹{deal.rate}</td>
                                        <td className="px-4 py-4 text-center">
                                            {deal.status === 'LOADED' && (
                                                <button onClick={() => handleRevertDeal(deal.id)} className="text-gray-400 hover:text-red-500 transition-colors" title="Undo Load / Revert to Pending">
                                                    ↩️
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card Layout */}
                <div className="md:hidden divide-y divide-gray-100">
                    {filteredLoadedDeals.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 font-medium">No deals match your search.</div>
                    ) : (
                        filteredLoadedDeals.map(deal => (
                            <div key={deal.id} className="p-4 hover:bg-red-50/30 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <span className="bg-gray-100 px-2 py-0.5 rounded font-bold text-xs border border-gray-200">{deal.item?.name}</span>
                                        <span className="text-secondary font-bold text-xs ml-1.5">{deal.marka?.name}</span>
                                    </div>
                                    <span className="text-secondary font-bold text-sm">₹{deal.rate}</span>
                                </div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-sm text-textMain">{deal.purchaser?.name}</span>
                                    <span className="text-gray-400 text-xs">→</span>
                                    <span className="font-bold text-sm text-textMain">{deal.seller?.name}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                                    <span>{formatDate(deal.dealDate)} {deal.loadDate ? `→ ${formatDate(deal.loadDate)}` : ''}</span>
                                    <span className="font-bold text-gray-700">{deal.weight} qtl {deal.numberOfPackets ? `(${deal.numberOfPackets} Bags)` : ''}</span>
                                </div>
                                {deal.status === 'LOADED' && (
                                    <div className="flex justify-end border-t border-gray-100 pt-2 mt-2">
                                        <button onClick={() => handleRevertDeal(deal.id)} className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1 border border-gray-200 px-2 py-1 rounded">
                                            ↩️ Undo Load
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
