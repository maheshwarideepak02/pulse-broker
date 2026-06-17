import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getDeals, getDashboardSummary } from '../api';

const Dashboard = () => {
    const { t } = useLanguage();
    const [deals, setDeals] = useState([]);
    const [summary, setSummary] = useState({ totalBilled: 0, totalUnbilled: 0, dealsThisMonth: 0, pendingLoads: 0 });
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        getDeals().then(setDeals).catch(console.error);
        getDashboardSummary().then(setSummary).catch(console.error);
    }, []);

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
        <div className="max-w-7xl mx-auto p-4 py-8">
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-primary tracking-tight mb-1">{t('Daily Overview', 'दैनिक अवलोकन')}</h1>
                    <p className="text-textMuted font-medium text-sm">{new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <button className="text-textMuted hover:text-primary transition-colors text-sm font-bold flex items-center gap-2" onClick={() => window.location.href='/login'}>
                    {t('Logout', 'लॉग आउट')} <span className="text-lg">🚪</span>
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                <div className="bg-white border border-gray-100 p-6 rounded-xl shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-red-600"></div>
                    <p className="text-textMuted text-xs font-bold uppercase tracking-wider mb-1">{t('Total Outstanding (Unpaid)', 'कुल बकाया')}</p>
                    <p className="text-3xl font-bold text-primary mt-2">₹{summary.totalOutstanding?.toLocaleString()}</p>
                </div>
                <div className="bg-white border border-gray-100 p-6 rounded-xl shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-moneyGreen"></div>
                    <p className="text-textMuted text-xs font-bold uppercase tracking-wider mb-1">{t('Unbilled Brokerage', 'बिना बिल की दलाली')}</p>
                    <p className="text-3xl font-bold text-moneyGreen mt-2 flex items-baseline gap-1">
                        ₹{summary.totalUnbilled?.toLocaleString()}
                    </p>
                </div>
                <div className="bg-white border border-gray-100 p-6 rounded-xl shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
                    <p className="text-textMuted text-xs font-bold uppercase tracking-wider mb-1">{t('Deals This Month', 'इस महीने के सौदे')}</p>
                    <p className="text-3xl font-bold text-textMain mt-2">{summary.dealsThisMonth}</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 p-6 rounded-xl shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 relative overflow-hidden group cursor-pointer" onClick={() => window.location.href='/app/pending'}>
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-secondary"></div>
                    <div className="absolute right-[-10px] bottom-[-10px] text-6xl opacity-10 group-hover:scale-110 transition-transform">🚚</div>
                    <p className="text-secondary text-xs font-bold uppercase tracking-wider mb-1">{t('Pending Loading', 'लंबित लोडिंग')}</p>
                    <p className="text-3xl font-bold text-secondary mt-2 flex items-baseline gap-2">
                        {summary.pendingLoads} <span className="text-sm uppercase tracking-wide">{t('Deals', 'सौदे')}</span>
                    </p>
                </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-xl shadow-md overflow-hidden relative">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h2 className="font-bold text-xl text-primary flex items-center gap-2">
                        <span className="text-secondary text-2xl">📝</span> {t('Recent Loaded Deals', 'हाल के सौदे')}
                    </h2>
                    <div className="relative w-full md:w-64">
                        <input 
                            type="text" 
                            placeholder={t('Search recent deals...', 'हाल के सौदे खोजें...')} 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm outline-none text-sm font-medium"
                        />
                        <div className="absolute right-3 top-2 text-gray-400">🔍</div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-textMain">
                        <thead className="bg-white text-xs uppercase text-gray-500 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 font-bold">{t('Date', 'तारीख')}</th>
                                <th className="px-6 py-4 font-bold">{t('Load Date', 'लोडिंग')}</th>
                                <th className="px-6 py-4 font-bold">{t('Purchaser', 'खरीदार')}</th>
                                <th className="px-6 py-4 font-bold">{t('Seller', 'विक्रेता')}</th>
                                <th className="px-6 py-4 font-bold">{t('Item (Marka)', 'आइटम (मार्का)')}</th>
                                <th className="px-6 py-4 font-bold text-right">{t('Loaded Weight', 'लोड किया वजन')}</th>
                                <th className="px-6 py-4 font-bold text-right">{t('Rate', 'भाव')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredLoadedDeals.length === 0 ? (
                                <tr><td colSpan="7" className="p-8 text-center text-gray-500 font-medium">No deals match your search.</td></tr>
                            ) : (
                                filteredLoadedDeals.map(deal => (
                                    <tr key={deal.id} className="hover:bg-red-50/30 transition-colors">
                                        <td className="px-6 py-4 text-gray-500 font-medium">{deal.dealDate}</td>
                                        <td className="px-6 py-4 text-gray-500 font-medium">{deal.loadDate}</td>
                                        <td className="px-6 py-4 font-bold text-textMain">{deal.purchaser?.name}</td>
                                        <td className="px-6 py-4 font-bold text-textMain">{deal.seller?.name}</td>
                                        <td className="px-6 py-4">
                                            <span className="bg-gray-100 px-2 py-1 rounded font-bold text-xs border border-gray-200">{deal.item?.name}</span>
                                            <span className="text-secondary font-bold text-xs ml-1.5">{deal.marka?.name}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-700">{deal.weight} qtl</td>
                                        <td className="px-6 py-4 text-right text-secondary font-bold">₹{deal.rate}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
