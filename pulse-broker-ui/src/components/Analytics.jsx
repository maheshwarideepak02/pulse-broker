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
        const monthlyData = Array(12).fill(0).map((_, i) => ({
            name: new Date(2000, i, 1).toLocaleString('default', { month: 'short' }),
            brokerage: 0,
            volume: 0
        }));

        const buyerMap = {};
        const sellerMap = {};
        const itemMap = {};

        deals.forEach(deal => {
            if (deal.status === 'CANCELLED') return;

            // Monthly Aggregation (Current Year)
            const dateStr = deal.dealDate || deal.createdAt;
            if (dateStr) {
                const date = new Date(dateStr);
                if (date.getFullYear() === currentYear) {
                    const mIndex = date.getMonth();
                    monthlyData[mIndex].brokerage += (deal.pBrokerage || 0) + (deal.sBrokerage || 0);
                    monthlyData[mIndex].volume += (deal.weight || 0);
                }
            }

            // Top Buyers
            if (deal.purchaser?.name) {
                buyerMap[deal.purchaser.name] = (buyerMap[deal.purchaser.name] || 0) + (deal.weight || 0);
            }
            // Top Sellers
            if (deal.seller?.name) {
                sellerMap[deal.seller.name] = (sellerMap[deal.seller.name] || 0) + (deal.weight || 0);
            }
            // Top Items
            if (deal.item?.name) {
                itemMap[deal.item.name] = (itemMap[deal.item.name] || 0) + (deal.weight || 0);
            }
        });

        const topBuyers = Object.entries(buyerMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        const topSellers = Object.entries(sellerMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        const topItems = Object.entries(itemMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        return { monthlyData, topBuyers, topSellers, topItems };
    }, [deals]);

    const insights = useMemo(() => {
        if (!stats) return null;
        const totalBrokerage = stats.monthlyData.reduce((acc, curr) => acc + curr.brokerage, 0);
        return {
            totalBrokerage,
            topBuyer: stats.topBuyers[0],
            topSeller: stats.topSellers[0],
            topItem: stats.topItems[0]
        };
    }, [stats]);

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
                            {entry.name === 'brokerage' ? '₹' : ''}{entry.value.toLocaleString()} {entry.name === 'value' || entry.name === 'volume' ? 'Qtl' : ''}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-8">
            <div className="mb-6 sm:mb-8">
                <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.16em] text-primary mb-2">
                    <span className="w-6 h-px bg-primary/50"></span>{t('Business Intelligence', 'व्यापारिक विश्लेषण')}
                </div>
                <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                    📊 {t('Analytics Dashboard', 'एनालिटिक्स डैशबोर्ड')}
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 font-medium mt-2">{t('Insights and trends for', 'रुझान और जानकारी वर्ष के लिए')} {new Date().getFullYear()}</p>
            </div>

            {/* Quick Text Insights */}
            {insights && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 p-4 rounded-2xl shadow-sm">
                        <p className="text-[9px] sm:text-[10px] uppercase font-bold text-green-800 tracking-wider">{t('Total Brokerage', 'कुल दलाली')} (YTD)</p>
                        <p className="text-xl sm:text-2xl font-black text-green-900 mt-1">₹{insights.totalBrokerage.toLocaleString()}</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-4 rounded-2xl shadow-sm">
                        <p className="text-[9px] sm:text-[10px] uppercase font-bold text-blue-800 tracking-wider">{t('Top Buyer', 'शीर्ष खरीदार')}</p>
                        <p className="text-base sm:text-lg font-black text-blue-900 mt-1 truncate">{insights.topBuyer?.name || 'N/A'}</p>
                        <p className="text-xs font-bold text-blue-700">{insights.topBuyer?.value || 0} Qtl</p>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-100 p-4 rounded-2xl shadow-sm">
                        <p className="text-[9px] sm:text-[10px] uppercase font-bold text-red-800 tracking-wider">{t('Top Seller', 'शीर्ष विक्रेता')}</p>
                        <p className="text-base sm:text-lg font-black text-red-900 mt-1 truncate">{insights.topSeller?.name || 'N/A'}</p>
                        <p className="text-xs font-bold text-red-700">{insights.topSeller?.value || 0} Qtl</p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 p-4 rounded-2xl shadow-sm">
                        <p className="text-[9px] sm:text-[10px] uppercase font-bold text-orange-800 tracking-wider">{t('Most Traded Item', 'सर्वाधिक ट्रेड आइटम')}</p>
                        <p className="text-base sm:text-lg font-black text-orange-900 mt-1 truncate">{insights.topItem?.name || 'N/A'}</p>
                        <p className="text-xs font-bold text-orange-700">{insights.topItem?.value || 0} Qtl</p>
                    </div>
                </div>
            )}

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
                                <Bar dataKey="brokerage" fill="#1a365d" radius={[4, 4, 0, 0]} name="Brokerage" maxBarSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Buyers */}
                <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2 sm:mb-6">{t('Top Buyers (by Volume)', 'शीर्ष खरीदार (मात्रा के अनुसार)')}</h3>
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

                {/* Top Sellers */}
                <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2 sm:mb-6">{t('Top Sellers (by Volume)', 'शीर्ष विक्रेता (मात्रा के अनुसार)')}</h3>
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

                {/* Monthly Volume Trend */}
                <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 col-span-1 lg:col-span-2">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4 sm:mb-6">{t('Trading Volume Trend', 'ट्रेडिंग मात्रा का रुझान')}</h3>
                    <div className="h-[250px] sm:h-[300px] w-full -ml-4 sm:ml-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.monthlyData} margin={{ left: 0, right: 10, bottom: 0, top: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} width={50} />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Line type="monotone" dataKey="volume" stroke="#d92027" strokeWidth={3} dot={{ r: 4, fill: '#d92027', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} name="Volume" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
