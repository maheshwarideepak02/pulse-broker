import React, { useEffect, useState, useMemo } from 'react';
import { getDeals } from '../api';
import { useLanguage } from '../context/LanguageContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';

const COLORS = ['#d92027', '#1a365d', '#eab308', '#10b981', '#6366f1', '#f43f5e'];

const Analytics = () => {
    const { t } = useLanguage();
    const [deals, setDeals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPartyName, setSelectedPartyName] = useState('');

    useEffect(() => {
        getDeals().then(data => {
            setDeals(data);
            setIsLoading(false);
        }).catch(err => {
            console.error('Error fetching deals for analytics:', err);
            setIsLoading(false);
        });
    }, []);

    const stats = useMemo(() => {
        if (!deals.length) return null;

        const currentYear = new Date().getFullYear();
        const currentMonthIndex = new Date().getMonth();
        
        const monthlyData = Array(12).fill(0).map((_, i) => ({
            name: new Date(2000, i, 1).toLocaleString('default', { month: 'short' }),
            brokerage: 0,
            volume: 0
        }));

        const buyerMap = {};
        const sellerMap = {};
        const itemMap = {};
        const markaMap = {};
        
        let biggestDeal = null;
        let biggestDealBrokerage = 0;
        
        let totalBrokerageYTD = 0;
        let totalDealsYTD = 0;
        
        let totalVolumeBilled = 0;
        let totalVolumePending = 0;

        const partyInsightsMap = {};

        deals.forEach(deal => {
            if (deal.status === 'CANCELLED') return;

            const dealBrokerage = (deal.pBrokerage || 0) + (deal.sBrokerage || 0);
            const dealVolume = (deal.weight || 0);

            // Time aggregations
            const dateStr = deal.dealDate || deal.createdAt;
            if (dateStr) {
                const date = new Date(dateStr);
                if (date.getFullYear() === currentYear) {
                    const mIndex = date.getMonth();
                    monthlyData[mIndex].brokerage += dealBrokerage;
                    monthlyData[mIndex].volume += dealVolume;
                    
                    totalBrokerageYTD += dealBrokerage;
                    totalDealsYTD += 1;
                    
                    if (dealBrokerage > biggestDealBrokerage) {
                        biggestDealBrokerage = dealBrokerage;
                        biggestDeal = deal;
                    }
                }
            }

            // Top Buyers
            if (deal.purchaser?.name) {
                buyerMap[deal.purchaser.name] = (buyerMap[deal.purchaser.name] || 0) + dealVolume;
            }
            // Top Sellers
            if (deal.seller?.name) {
                sellerMap[deal.seller.name] = (sellerMap[deal.seller.name] || 0) + dealVolume;
            }
            // Top Items
            if (deal.item?.name) {
                itemMap[deal.item.name] = (itemMap[deal.item.name] || 0) + dealVolume;
            }
            // Top Markas
            if (deal.marka?.name) {
                markaMap[deal.marka?.name] = (markaMap[deal.marka?.name] || 0) + dealVolume;
            }
            
            // Billed vs Pending
            if (deal.status === 'BILLED') {
                totalVolumeBilled += dealVolume;
            } else if (deal.status === 'PENDING' || deal.status === 'OPEN_UNASSIGNED' || deal.status === 'LOADED') {
                totalVolumePending += dealVolume;
            }

            // Party Insights (Preferences & Frequency)
            const dDate = dateStr ? new Date(dateStr) : null;
            if (deal.purchaser?.name) {
                const pName = deal.purchaser.name;
                if (!partyInsightsMap[pName]) partyInsightsMap[pName] = { items: {}, dates: [] };
                if (deal.item?.name) {
                    partyInsightsMap[pName].items[deal.item.name] = (partyInsightsMap[pName].items[deal.item.name] || 0) + dealVolume;
                }
                if (dDate) partyInsightsMap[pName].dates.push(dDate.getTime());
            }
        });

        const sortMap = (map) => Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        // MoM Growth Calculation
        const thisMonthBrok = monthlyData[currentMonthIndex].brokerage;
        const lastMonthBrok = currentMonthIndex > 0 ? monthlyData[currentMonthIndex - 1].brokerage : 0;
        let momGrowth = 0;
        if (lastMonthBrok > 0) {
            momGrowth = ((thisMonthBrok - lastMonthBrok) / lastMonthBrok) * 100;
        } else if (thisMonthBrok > 0) {
            momGrowth = 100; // infinite growth from 0
        }

        // Compute Party Insights
        const partyInsights = Object.entries(partyInsightsMap).map(([partyName, data]) => {
            const topItem = Object.entries(data.items).sort((a, b) => b[1] - a[1])[0];
            let avgDelay = 0;
            if (data.dates.length > 1) {
                const sortedDates = data.dates.sort();
                let totalDiff = 0;
                for (let i = 1; i < sortedDates.length; i++) {
                    totalDiff += (sortedDates[i] - sortedDates[i-1]);
                }
                avgDelay = Math.round(totalDiff / (sortedDates.length - 1) / (1000 * 60 * 60 * 24));
            }
            return {
                partyName,
                preferredItem: topItem ? topItem[0] : '-',
                itemVolume: topItem ? topItem[1] : 0,
                avgDelayDays: avgDelay,
                totalDeals: data.dates.length
            };
        }).filter(p => p.itemVolume > 0).sort((a, b) => b.itemVolume - a.itemVolume).slice(0, 10);

        return { 
            monthlyData, 
            topBuyers: sortMap(buyerMap), 
            topSellers: sortMap(sellerMap), 
            topItems: sortMap(itemMap),
            topMarkas: sortMap(markaMap),
            partyInsights,
            totalBrokerageYTD,
            avgBrokeragePerDeal: totalDealsYTD > 0 ? (totalBrokerageYTD / totalDealsYTD) : 0,
            biggestDeal,
            biggestDealBrokerage,
            momGrowth,
            thisMonthBrok,
            totalVolumeBilled,
            totalVolumePending
        };
    }, [deals]);

    const allParties = useMemo(() => {
        const parties = new Set();
        deals.forEach(d => {
            if (d.purchaser?.name) parties.add(d.purchaser.name);
            if (d.seller?.name) parties.add(d.seller.name);
        });
        return Array.from(parties).sort();
    }, [deals]);

    const partyStats = useMemo(() => {
        if (!selectedPartyName || !deals.length) return null;

        let totalVolume = 0;
        let totalBrokerageGenerated = 0;
        let boughtVolume = 0;
        let soldVolume = 0;
        let billedVolume = 0;
        let pendingVolume = 0;
        
        const itemMap = {};
        const markaMap = {};

        deals.forEach(deal => {
            if (deal.status === 'CANCELLED') return;
            
            const isBuyer = deal.purchaser?.name === selectedPartyName;
            const isSeller = deal.seller?.name === selectedPartyName;
            
            if (!isBuyer && !isSeller) return;

            const vol = deal.weight || 0;
            totalVolume += vol;
            
            if (isBuyer) {
                boughtVolume += vol;
                totalBrokerageGenerated += (deal.pBrokerage || 0);
            }
            if (isSeller) {
                soldVolume += vol;
                totalBrokerageGenerated += (deal.sBrokerage || 0);
            }

            if (deal.status === 'BILLED') {
                billedVolume += vol;
            } else if (['PENDING', 'OPEN_UNASSIGNED', 'LOADED'].includes(deal.status)) {
                pendingVolume += vol;
            }

            if (deal.item?.name) {
                itemMap[deal.item.name] = (itemMap[deal.item.name] || 0) + vol;
            }
            if (deal.marka?.name) {
                markaMap[deal.marka?.name] = (markaMap[deal.marka?.name] || 0) + vol;
            }
        });

        const getTop = (map) => Object.entries(map).sort((a,b) => b[1] - a[1])[0];
        const topItem = getTop(itemMap);
        const topMarka = getTop(markaMap);

        let roleProfile = "Balanced Trader";
        if (boughtVolume > soldVolume * 1.5) roleProfile = "Primary Buyer";
        if (soldVolume > boughtVolume * 1.5) roleProfile = "Primary Seller";
        if (boughtVolume === 0 && soldVolume > 0) roleProfile = "Exclusive Seller";
        if (soldVolume === 0 && boughtVolume > 0) roleProfile = "Exclusive Buyer";

        return {
            totalVolume,
            totalBrokerageGenerated,
            roleProfile,
            topItem: topItem ? { name: topItem[0], vol: topItem[1] } : null,
            topMarka: topMarka ? { name: topMarka[0], vol: topMarka[1] } : null,
            billedVolume,
            pendingVolume
        };
    }, [deals, selectedPartyName]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!stats) return <div className="p-8 text-center text-gray-500">No data available for analytics.</div>;

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg z-50">
                    <p className="font-bold text-gray-800 mb-1">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ color: entry.color }} className="text-sm font-medium">
                            {entry.name === 'brokerage' ? '₹' : ''}{entry.value.toLocaleString(undefined, {maximumFractionDigits: 2})} {entry.name === 'value' || entry.name === 'volume' ? 'Qtl' : ''}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    const isGrowthPositive = stats.momGrowth >= 0;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.16em] text-primary mb-2">
                        <span className="w-6 h-px bg-primary/50"></span>{t('Business Intelligence', 'व्यापारिक विश्लेषण')}
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        📊 {t('Analytics Dashboard', 'एनालिटिक्स डैशबोर्ड')}
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 font-medium mt-2">{t('Actionable insights for', 'रुझान और जानकारी वर्ष के लिए')} {new Date().getFullYear()}</p>
                </div>
                
                {/* Outstanding vs Cleared Mini Bar */}
                <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm w-full sm:w-64">
                    <div className="flex justify-between text-[10px] uppercase font-bold mb-1.5">
                        <span className="text-gray-500">Volume Status</span>
                        <span className="text-gray-700">{((stats.totalVolumeBilled / (stats.totalVolumeBilled + stats.totalVolumePending || 1)) * 100).toFixed(0)}% Billed</span>
                    </div>
                    <div className="w-full h-2 bg-yellow-100 rounded-full overflow-hidden flex">
                        <div className="h-full bg-green-500" style={{ width: `${(stats.totalVolumeBilled / (stats.totalVolumeBilled + stats.totalVolumePending || 1)) * 100}%` }}></div>
                        <div className="h-full bg-yellow-400" style={{ width: `${(stats.totalVolumePending / (stats.totalVolumeBilled + stats.totalVolumePending || 1)) * 100}%` }}></div>
                    </div>
                    <div className="flex justify-between text-[10px] font-semibold mt-1.5">
                        <span className="text-green-600">Billed: {stats.totalVolumeBilled}</span>
                        <span className="text-yellow-600">Pending: {stats.totalVolumePending}</span>
                    </div>
                </div>
            </div>

            {/* Smart Actionable Insights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                {/* 1. Monthly Performance */}
                <div className="bg-white border border-gray-100 p-4 sm:p-5 rounded-2xl shadow-sm relative overflow-hidden">
                    <div className="absolute right-[-10px] bottom-[-10px] text-5xl opacity-5">📈</div>
                    <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">This Month's Brokerage</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">₹{stats.thisMonthBrok.toLocaleString()}</p>
                    <p className={`text-xs font-bold mt-2 flex items-center gap-1 ${isGrowthPositive ? 'text-green-600' : 'text-red-500'}`}>
                        {isGrowthPositive ? '▲' : '▼'} {Math.abs(stats.momGrowth).toFixed(1)}% vs last month
                    </p>
                </div>
                
                {/* 2. Average Deal Value */}
                <div className="bg-white border border-gray-100 p-4 sm:p-5 rounded-2xl shadow-sm relative overflow-hidden">
                    <div className="absolute right-[-10px] bottom-[-10px] text-5xl opacity-5">💰</div>
                    <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Avg Brokerage / Deal</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">₹{Math.round(stats.avgBrokeragePerDeal).toLocaleString()}</p>
                    <p className="text-xs font-medium text-gray-400 mt-2">Average value of a single deal</p>
                </div>

                {/* 3. Biggest Deal */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-4 sm:p-5 rounded-2xl shadow-sm relative overflow-hidden lg:col-span-2">
                    <div className="absolute right-[-10px] bottom-[-10px] text-5xl opacity-10">🏆</div>
                    <p className="text-[10px] uppercase font-bold text-amber-800 tracking-wider flex items-center gap-1">🏆 Biggest Deal of the Year</p>
                    {stats.biggestDeal ? (
                        <>
                            <div className="flex items-end gap-3 mt-1">
                                <p className="text-2xl font-black text-amber-900">₹{stats.biggestDealBrokerage.toLocaleString()}</p>
                                <p className="text-sm font-bold text-amber-700 mb-1">{stats.biggestDeal.weight} Qtl</p>
                            </div>
                            <p className="text-xs font-medium text-amber-800 mt-2 truncate">
                                <strong>{stats.biggestDeal.purchaser?.name || 'N/A'}</strong> bought from <strong>{stats.biggestDeal.seller?.name || 'N/A'}</strong>
                            </p>
                        </>
                    ) : (
                        <p className="text-sm text-amber-700 mt-2 font-medium">No deals recorded yet</p>
                    )}
                </div>
            </div>

            {/* Party Level Insights */}
            <div className="mb-6 sm:mb-8 pt-4 sm:pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">🏢 {t('Party-Level Insights', 'पार्टी की जानकारी')}</h2>
                    <select 
                        value={selectedPartyName} 
                        onChange={e => setSelectedPartyName(e.target.value)}
                        className="p-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 bg-white shadow-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none min-w-[250px]"
                    >
                        <option value="">-- {t('Select a Party to view stats', 'आंकड़े देखने के लिए एक पार्टी चुनें')} --</option>
                        {allParties.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>

                {partyStats && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <div className="bg-gradient-to-br from-stone-50 to-gray-50 border border-stone-200 p-4 rounded-2xl shadow-sm">
                            <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Trading Role</p>
                            <p className="text-lg font-black text-gray-900 mt-1">{partyStats.roleProfile}</p>
                            <p className="text-xs font-bold text-gray-400 mt-0.5">Based on volume</p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-4 rounded-2xl shadow-sm">
                            <p className="text-[10px] uppercase font-bold text-blue-800 tracking-wider">Total Volume</p>
                            <p className="text-xl font-black text-blue-900 mt-1">{partyStats.totalVolume} Qtl</p>
                            <p className="text-xs font-bold text-blue-700 mt-0.5">Billed: {partyStats.billedVolume} | Pending: {partyStats.pendingVolume}</p>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 p-4 rounded-2xl shadow-sm">
                            <p className="text-[10px] uppercase font-bold text-green-800 tracking-wider">Brokerage Given</p>
                            <p className="text-xl font-black text-green-900 mt-1">₹{partyStats.totalBrokerageGenerated.toLocaleString()}</p>
                            <p className="text-xs font-bold text-green-700 mt-0.5">Total revenue generated</p>
                        </div>
                        <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 p-4 rounded-2xl shadow-sm">
                            <p className="text-[10px] uppercase font-bold text-orange-800 tracking-wider">Favorites</p>
                            <p className="text-sm font-bold text-orange-900 mt-1 truncate">Item: {partyStats.topItem?.name || 'N/A'}</p>
                            <p className="text-sm font-bold text-orange-800 truncate">Marka: {partyStats.topMarka?.name || 'N/A'}</p>
                        </div>
                    </div>
                )}
                {!partyStats && selectedPartyName === '' && (
                    <div className="bg-stone-50 border border-stone-100 rounded-xl p-6 text-center text-gray-400 font-bold text-sm">
                        Select a party from the dropdown above to view their actionable insights.
                    </div>
                )}
            </div>

            {/* Top Standings */}
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">⭐ Top Standings (By Volume)</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-4 rounded-2xl shadow-sm">
                    <p className="text-[9px] sm:text-[10px] uppercase font-bold text-blue-800 tracking-wider">{t('Top Buyer', 'शीर्ष खरीदार')}</p>
                    <p className="text-base sm:text-lg font-black text-blue-900 mt-1 truncate">{stats.topBuyers[0]?.name || 'N/A'}</p>
                    <p className="text-xs font-bold text-blue-700">{stats.topBuyers[0]?.value || 0} Qtl</p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-100 p-4 rounded-2xl shadow-sm">
                    <p className="text-[9px] sm:text-[10px] uppercase font-bold text-red-800 tracking-wider">{t('Top Seller', 'शीर्ष विक्रेता')}</p>
                    <p className="text-base sm:text-lg font-black text-red-900 mt-1 truncate">{stats.topSellers[0]?.name || 'N/A'}</p>
                    <p className="text-xs font-bold text-red-700">{stats.topSellers[0]?.value || 0} Qtl</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 p-4 rounded-2xl shadow-sm">
                    <p className="text-[9px] sm:text-[10px] uppercase font-bold text-orange-800 tracking-wider">{t('Top Item', 'सर्वाधिक ट्रेड आइटम')}</p>
                    <p className="text-base sm:text-lg font-black text-orange-900 mt-1 truncate">{stats.topItems[0]?.name || 'N/A'}</p>
                    <p className="text-xs font-bold text-orange-700">{stats.topItems[0]?.value || 0} Qtl</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-4 rounded-2xl shadow-sm">
                    <p className="text-[9px] sm:text-[10px] uppercase font-bold text-emerald-800 tracking-wider">{t('Top Marka', 'शीर्ष मार्का')}</p>
                    <p className="text-base sm:text-lg font-black text-emerald-900 mt-1 truncate">{stats.topMarkas[0]?.name || 'N/A'}</p>
                    <p className="text-xs font-bold text-emerald-700">{stats.topMarkas[0]?.value || 0} Qtl</p>
                </div>
            </div>

            {/* Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                {/* Revenue Trend */}
                <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 col-span-1 lg:col-span-2">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4 sm:mb-6">{t('Monthly Brokerage Revenue', 'मासिक दलाली आय')}</h3>
                    <div className="h-[250px] sm:h-[300px] w-full -ml-4 sm:ml-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.monthlyData} margin={{ left: 0, right: 10, bottom: 0, top: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(val) => `₹${val}`} width={60} />
                                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                                <Bar dataKey="brokerage" fill="#1a365d" radius={[4, 4, 0, 0]} name="brokerage" maxBarSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Buyers Pie */}
                <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2 sm:mb-6">{t('Buyer Distribution', 'खरीदार (मात्रा के अनुसार)')}</h3>
                    <div className="h-[280px] sm:h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 0, right: 0, bottom: 20, left: 0 }}>
                                <Pie data={stats.topBuyers} cx="50%" cy="45%" innerRadius="50%" outerRadius="70%" paddingAngle={5} dataKey="value">
                                    {stats.topBuyers.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingTop: '10px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Sellers Pie */}
                <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2 sm:mb-6">{t('Seller Distribution', 'विक्रेता (मात्रा के अनुसार)')}</h3>
                    <div className="h-[280px] sm:h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 0, right: 0, bottom: 20, left: 0 }}>
                                <Pie data={stats.topSellers} cx="50%" cy="45%" innerRadius="50%" outerRadius="70%" paddingAngle={5} dataKey="value">
                                    {stats.topSellers.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingTop: '10px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                
                {/* Item vs Marka Bar Chart */}
                <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 col-span-1 lg:col-span-2">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4 sm:mb-6">{t('Top Items & Markas', 'शीर्ष आइटम और मार्का')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="h-[250px] w-full">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center mb-4">Top Items</h4>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.topItems} layout="vertical" margin={{ left: 20, right: 10, bottom: 0, top: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 11, fontWeight: 600 }} width={80} />
                                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                                    <Bar dataKey="value" fill="#f43f5e" radius={[0, 4, 4, 0]} name="volume" barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="h-[250px] w-full">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center mb-4">Top Markas</h4>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.topMarkas} layout="vertical" margin={{ left: 20, right: 10, bottom: 0, top: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 11, fontWeight: 600 }} width={80} />
                                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                                    <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} name="volume" barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Party Purchase Patterns */}
                <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 col-span-1 lg:col-span-2">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4 sm:mb-6">{t('Party Purchase Patterns & Frequency', 'पार्टी खरीद पैटर्न और आवृत्ति')}</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 uppercase text-xs border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-3 font-bold">{t('Party Name', 'पार्टी का नाम')}</th>
                                    <th className="px-4 py-3 font-bold">{t('Most Loved Item', 'सबसे पसंदीदा आइटम')}</th>
                                    <th className="px-4 py-3 font-bold text-right">{t('Volume Bought', 'मात्रा खरीदी गई')}</th>
                                    <th className="px-4 py-3 font-bold text-center">{t('Avg Delay Between Purchases', 'खरीद के बीच औसत देरी')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {stats.partyInsights.length > 0 ? stats.partyInsights.map((insight, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 font-bold text-gray-800">{insight.partyName}</td>
                                        <td className="px-4 py-3 font-semibold text-primary">{insight.preferredItem}</td>
                                        <td className="px-4 py-3 font-bold text-gray-600 text-right">{insight.itemVolume} Qtl</td>
                                        <td className="px-4 py-3 font-semibold text-gray-600 text-center">
                                            {insight.totalDeals > 1 ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs">
                                                    <span>⏱️</span> {insight.avgDelayDays} {t('Days', 'दिन')}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">{t('Not enough data', 'पर्याप्त डेटा नहीं')}</span>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" className="text-center py-6 text-gray-400 font-medium">No purchase patterns found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
