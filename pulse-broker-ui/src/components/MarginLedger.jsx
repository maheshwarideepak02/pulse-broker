import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { getContacts, getMarginDeals } from '../api';
import { formatDate } from '../utils/dateUtils';

const MarginLedger = () => {
    const { t } = useLanguage();
    const { addToast } = useToast();
    const [contacts, setContacts] = useState([]);
    const [selectedParty, setSelectedParty] = useState('');
    const [marginDeals, setMarginDeals] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        getContacts().then(setContacts).catch(console.error);
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
        } catch (err) {
            console.error(err);
            addToast('Failed to load margin ledger', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const totalMargin = marginDeals.reduce((sum, d) => sum + (d.marginMarkup * d.weight), 0);

    return (
        <div className="max-w-6xl mx-auto p-4 py-8">
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">⚖️</span>
                    <h1 className="text-3xl font-bold text-primary tracking-tight">{t('Plus/Minus Account', 'प्लस/माइनस खाता')}</h1>
                </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl shadow-xl p-6 border-t-8 border-t-primary mb-8">
                <div className="max-w-md">
                    <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">{t('Select Party', 'पार्टी चुनें')}</label>
                    <select value={selectedParty} onChange={(e) => setSelectedParty(e.target.value)} className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 font-bold text-gray-800 focus:ring-2 focus:ring-primary outline-none transition-all">
                        <option value="">{t('Select Party...', 'पार्टी चुनें...')}</option>
                        {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            </div>

            {selectedParty && (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden">
                    <div className="bg-gray-50 p-6 border-b border-gray-200 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-800">{t('Margin Ledger', 'मार्जिन लेजर')}</h2>
                        <div className={`px-4 py-2 rounded-xl border-2 font-bold text-lg ${totalMargin >= 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                            {t('Total Balance: ', 'कुल बैलेंस: ')} ₹{totalMargin.toFixed(2)}
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="p-12 text-center text-gray-500 font-bold animate-pulse">{t('Loading...', 'लोड हो रहा है...')}</div>
                    ) : marginDeals.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">{t('No margin differences found for this party.', 'इस पार्टी के लिए कोई मार्जिन अंतर नहीं मिला।')}</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-primary/5 text-primary text-xs uppercase tracking-wider">
                                        <th className="p-4 font-bold border-b border-primary/10">ID</th>
                                        <th className="p-4 font-bold border-b border-primary/10">{t('Date', 'तारीख')}</th>
                                        <th className="p-4 font-bold border-b border-primary/10">{t('Item', 'आइटम')}</th>
                                        <th className="p-4 font-bold border-b border-primary/10 text-right">{t('Weight (Qtl)', 'वजन')}</th>
                                        <th className="p-4 font-bold border-b border-primary/10 text-right">{t('Base Rate', 'मूल दर')}</th>
                                        <th className="p-4 font-bold border-b border-primary/10 text-right">{t('Markup', 'मार्जिन')}</th>
                                        <th className="p-4 font-bold border-b border-primary/10 text-right">{t('Net Margin', 'कुल मार्जिन')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {marginDeals.map(d => {
                                        const netMargin = d.marginMarkup * d.weight;
                                        return (
                                            <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                <td className="p-4 text-sm text-gray-500 font-medium">#{d.id}</td>
                                                <td className="p-4 font-bold text-gray-800">{formatDate(d.dealDate)}</td>
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
                    )}
                </div>
            )}
        </div>
    );
};

export default MarginLedger;
