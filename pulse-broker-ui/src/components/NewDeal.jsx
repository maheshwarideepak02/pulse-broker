import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { getFirms, getItems, getMarkas, createDeal } from '../api';
import DateInput from './DateInput';

const NewDeal = () => {
    const { t } = useLanguage();
    const { addToast } = useToast();
    const [firms, setFirms] = useState([]);
    const [items, setItems] = useState([]);
    const [markas, setMarkas] = useState([]);

    const [formData, setFormData] = useState({
        dealDate: new Date().toISOString().split('T')[0],
        loadDate: '',
        purchaserId: '',
        sellerId: '',
        itemId: '',
        markaId: '',
        weight: 50,
        rate: 8000,
        pBrokVal: '',
        pBrokType: 'PERCENT',
        sBrokVal: '',
        sBrokType: 'PERCENT',
        brokeragePayer: 'SEPARATE'
    });

    useEffect(() => {
        Promise.all([getFirms(), getItems(), getMarkas()]).then(([f, i, m]) => {
            setFirms(f);
            setItems(i);
            setMarkas(m);
            if (f.length > 1) {
                setFormData(prev => ({ ...prev, purchaserId: f[0].id, sellerId: f[1].id, pBrokVal: f[0].defaultBrokVal ?? '', pBrokType: f[0].defaultBrokType || 'PERCENT', sBrokVal: f[1].defaultBrokVal ?? '', sBrokType: f[1].defaultBrokType || 'PERCENT' }));
            }
            if (i.length > 0) setFormData(prev => ({ ...prev, itemId: i[0].id }));
            if (m.length > 0) setFormData(prev => ({ ...prev, markaId: m[0].id }));
        });
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFirmChange = (e, type) => {
        const firmId = e.target.value;
        const firm = firms.find(f => f.id == firmId);
        setFormData(prev => ({
            ...prev,
            [e.target.name]: firmId,
            ...(type === 'purchaser' ? { pBrokVal: firm?.defaultBrokVal ?? '', pBrokType: firm?.defaultBrokType || 'PERCENT' } : {}),
            ...(type === 'seller' ? { sBrokVal: firm?.defaultBrokVal ?? '', sBrokType: firm?.defaultBrokType || 'PERCENT' } : {})
        }));
    };

    const calcBrokerage = (val, type) => {
        if (type === 'PERCENT') return (formData.weight * formData.rate * (parseFloat(val) || 0)) / 100;
        return formData.weight * (parseFloat(val) || 0); // Fixed per qtl
    };

    const pBrokerage = calcBrokerage(formData.pBrokVal, formData.pBrokType);
    const sBrokerage = calcBrokerage(formData.sBrokVal, formData.sBrokType);
    let totalBrokerage = pBrokerage + sBrokerage;

    const saveDeal = async (e) => {
        e.preventDefault();
        
        if (formData.purchaserId === formData.sellerId) {
            addToast('Purchaser and Seller cannot be the same firm', 'error');
            return;
        }
        if (!formData.purchaserId || !formData.sellerId || !formData.itemId || !formData.markaId) {
            addToast('Please select all required dropdowns', 'error');
            return;
        }
        if (formData.weight <= 0 || formData.rate <= 0) {
            addToast('Weight and Rate must be greater than zero', 'error');
            return;
        }
        if (pBrokerage < 0 || sBrokerage < 0) {
            addToast('Brokerage values cannot be negative', 'error');
            return;
        }

        try {
            await createDeal({
                dealDate: formData.dealDate,
                loadDate: formData.loadDate || null,
                purchaser: { id: formData.purchaserId },
                seller: { id: formData.sellerId },
                item: { id: formData.itemId },
                marka: { id: formData.markaId },
                weight: formData.weight,
                rate: formData.rate,
                pBrokerage: pBrokerage,
                sBrokerage: sBrokerage,
                brokeragePayer: formData.brokeragePayer,
                status: formData.loadDate ? 'LOADED' : 'PENDING'
            });
            addToast('Deal Saved Successfully!', 'success');
            setTimeout(() => { window.location.href='/app/dashboard'; }, 1000);
        } catch (err) {
            console.error(err);
            addToast('Failed to save deal', 'error');
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 py-8">
            <div className="mb-8 flex items-center gap-3">
                <span className="text-3xl">🤝</span>
                <h1 className="text-3xl font-bold text-primary tracking-tight">{t('Enter New Deal', 'नया सौदा दर्ज करें')}</h1>
            </div>
            
            <div className="bg-white border border-gray-100 rounded-2xl shadow-xl p-8 border-t-8 border-t-primary relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary opacity-5 rounded-bl-full pointer-events-none"></div>
                
                <form onSubmit={saveDeal} className="relative z-10">
                    <div className="grid grid-cols-2 gap-8 mb-8">
                        <DateInput
                            label={t('Dealing Date', 'सौदे की तारीख')}
                            value={formData.dealDate}
                            onChange={e => setFormData(prev => ({...prev, dealDate: e.target.value}))}
                            variant="deal"
                            required
                        />
                        <DateInput
                            label={t('Loading Date', 'लोडिंग की तारीख')}
                            value={formData.loadDate}
                            onChange={e => setFormData(prev => ({...prev, loadDate: e.target.value}))}
                            variant="load"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-8 mb-8 relative">
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 font-bold z-20 border-2 border-white shadow-sm">VS</div>
                        <div className="bg-red-50/50 p-5 rounded-xl border border-red-100">
                            <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">{t('Purchaser Firm', 'खरीदार फर्म')}</label>
                            <select name="purchaserId" value={formData.purchaserId} onChange={(e) => handleFirmChange(e, 'purchaser')} className="w-full bg-white border-2 border-red-200 rounded-lg px-4 py-3 font-bold text-textMain focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm">
                                {firms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                        </div>
                        <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                            <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">{t('Seller Firm', 'विक्रेता फर्म')}</label>
                            <select name="sellerId" value={formData.sellerId} onChange={(e) => handleFirmChange(e, 'seller')} className="w-full bg-white border-2 border-blue-200 rounded-lg px-4 py-3 font-bold text-textMain focus:ring-2 focus:ring-blue-600 outline-none transition-all shadow-sm">
                                {firms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="bg-gray-50/80 border border-gray-200 p-6 rounded-xl mb-8 grid grid-cols-4 gap-6 shadow-inner">
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('Item', 'आइटम')}</label>
                            <select name="itemId" value={formData.itemId} onChange={handleChange} className="w-full border-2 border-gray-300 rounded-lg px-3 py-3 font-bold focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm bg-white">
                                {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">{t('Marka', 'मार्का')}</label>
                            <select name="markaId" value={formData.markaId} onChange={handleChange} className="w-full border-2 border-yellow-300 rounded-lg px-3 py-3 font-bold focus:ring-2 focus:ring-secondary outline-none transition-all shadow-sm bg-white text-secondary">
                                {markas.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('Weight (Qtl)', 'वजन')}</label>
                            <input type="number" name="weight" value={formData.weight} onChange={handleChange} min="0.01" step="0.01" className="w-full border-2 border-gray-300 rounded-lg px-3 py-3 font-bold focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm bg-white text-right" required />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('Rate (₹)', 'भाव (₹)')}</label>
                            <input type="number" name="rate" value={formData.rate} onChange={handleChange} min="0.01" step="0.01" className="w-full border-2 border-gray-300 rounded-lg px-3 py-3 font-bold focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm bg-white text-right" required />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-secondary rounded-xl p-6 mb-8 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-secondary opacity-10 rounded-bl-full pointer-events-none"></div>
                        <h3 className="text-sm font-bold text-secondary uppercase tracking-widest mb-4">{t('Brokerage Setup', 'दलाली दर्ज करें')}</h3>
                        
                        <div className="grid grid-cols-2 gap-8 mb-6 relative z-10">
                            <div className="bg-white p-5 border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                <label className="text-xs font-bold text-primary uppercase tracking-wider block mb-3">{t('Purchaser Pays', 'खरीदार की दलाली')}</label>
                                <div className="flex gap-3 items-center">
                                    <input type="number" name="pBrokVal" value={formData.pBrokVal} onChange={handleChange} min="0" className="w-24 border-2 border-gray-200 p-2.5 rounded-lg font-bold focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50" step="0.01" />
                                    <select name="pBrokType" value={formData.pBrokType} onChange={handleChange} className="border-2 border-gray-200 p-2.5 rounded-lg font-bold flex-1 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50">
                                        <option value="PERCENT">% Percent</option>
                                        <option value="FIXED">₹ Fixed/Qtl</option>
                                    </select>
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                                    <span className="text-gray-400 font-bold text-xs uppercase tracking-wider">Calc</span> 
                                    <span className="font-black text-xl text-primary">₹ {pBrokerage.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="bg-white p-5 border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                <label className="text-xs font-bold text-primary uppercase tracking-wider block mb-3">{t('Seller Pays', 'विक्रेता की दलाली')}</label>
                                <div className="flex gap-3 items-center">
                                    <input type="number" name="sBrokVal" value={formData.sBrokVal} onChange={handleChange} min="0" className="w-24 border-2 border-gray-200 p-2.5 rounded-lg font-bold focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50" step="0.01" />
                                    <select name="sBrokType" value={formData.sBrokType} onChange={handleChange} className="border-2 border-gray-200 p-2.5 rounded-lg font-bold flex-1 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50">
                                        <option value="PERCENT">% Percent</option>
                                        <option value="FIXED">₹ Fixed/Qtl</option>
                                    </select>
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                                    <span className="text-gray-400 font-bold text-xs uppercase tracking-wider">Calc</span> 
                                    <span className="font-black text-xl text-primary">₹ {sBrokerage.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-gray-200 shadow-sm relative z-10">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('Brokerage Billed To:', 'दलाली का भुगतान:')}</label>
                                <select name="brokeragePayer" value={formData.brokeragePayer} onChange={handleChange} className="bg-gray-50 border-2 border-gray-200 rounded-lg p-2 font-bold text-textMain shadow-sm focus:ring-2 focus:ring-primary outline-none transition-all">
                                    <option value="SEPARATE">{t('Separate', 'अलग-अलग')}</option>
                                    <option value="PURCHASER_BOTH">{t('Purchaser Pays Both', 'खरीदार दोनों देगा')}</option>
                                    <option value="SELLER_BOTH">{t('Seller Pays Both', 'विक्रेता दोनों देगा')}</option>
                                </select>
                            </div>
                            <div className="text-right">
                                <span className="text-gray-400 font-bold text-sm uppercase tracking-widest mr-4">{t('Total:', 'कुल:')}</span>
                                <span className="text-moneyGreen font-black text-4xl">₹ {totalBrokerage.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-primary hover:bg-red-800 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 text-lg uppercase tracking-wider">
                        {t('Save New Deal', 'नया सौदा सहेजें')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default NewDeal;
