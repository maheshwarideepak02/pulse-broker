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
                <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg">
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
            <div className="mb-8">
                <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.16em] text-primary mb-2">
                    <span className="w-6 h-px bg-primary/50"></span>{t('Business Intelligence', 'व्यापारिक विश्लेषण')}
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                    📊 {t('Analytics Dashboard', 'एनालिटिक्स डैशबोर्ड')}
                </h1>
                <p className="text-gray-500 font-medium mt-2">Insights and trends for {new Date().getFullYear()}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                {/* Revenue Trend */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 col-span-1 lg:col-span-2">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">{t('Monthly Brokerage Revenue', 'मासिक दलाली आय')}</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(val) => `₹${val}`} />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Bar dataKey="brokerage" fill="#1a365d" radius={[4, 4, 0, 0]} name="Brokerage" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Buyers */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">{t('Top Buyers (by Volume)', 'शीर्ष खरीदार (मात्रा के अनुसार)')}</h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={stats.topBuyers} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {stats.topBuyers.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Sellers */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">{t('Top Sellers (by Volume)', 'शीर्ष विक्रेता (मात्रा के अनुसार)')}</h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={stats.topSellers} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {stats.topSellers.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Monthly Volume Trend */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 col-span-1 lg:col-span-2">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">{t('Trading Volume Trend', 'ट्रेडिंग मात्रा का रुझान')}</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
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
