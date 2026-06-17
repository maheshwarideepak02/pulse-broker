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
    const [isProcessing, setIsProcessing] = useState(false);

    const [formData, setFormData] = useState({
        dealDate: new Date().toISOString().split('T')[0],
        loadDates: [''],
        purchaserId: '',
        sellerId: '',
        itemId: '',
        markaId: '',
        weight: '',
        packetWeight: 30,
        numberOfPackets: '',
        rate: '',
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
        setFormData(prev => {
            const updated = { ...prev, [name]: value };
            
            // Auto-calculate packets if weight or packetWeight changes
            if (name === 'weight' || name === 'packetWeight') {
                const w = parseFloat(updated.weight);
                const pw = parseFloat(updated.packetWeight);
                if (!isNaN(w) && !isNaN(pw) && pw > 0) {
                    updated.numberOfPackets = Math.round((w * 100) / pw);
                } else if (name === 'weight' && value === '') {
                    updated.numberOfPackets = '';
                }
            } else if (name === 'numberOfPackets') {
                const pkts = parseInt(updated.numberOfPackets, 10);
                const pw = parseFloat(updated.packetWeight);
                if (!isNaN(pkts) && !isNaN(pw) && pw > 0) {
                    const calcW = (pkts * pw) / 100;
                    const currW = parseFloat(updated.weight);
                    // Only overwrite weight if it differs by more than 0.5 qtl (meaning it's not just a rounding difference)
                    if (isNaN(currW) || Math.abs(calcW - currW) > 0.5) {
                        updated.weight = calcW.toFixed(2);
                    }
                } else if (value === '') {
                    updated.weight = '';
                }
            }
            return updated;
        });
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
        
        if (isProcessing) return;

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

        const finalLoadDate = formData.loadDates.filter(d => d).join(', ') || null;

        setIsProcessing(true);
        try {
            await createDeal({
                dealDate: formData.dealDate,
                loadDate: finalLoadDate,
                purchaser: { id: formData.purchaserId },
                seller: { id: formData.sellerId },
                item: { id: formData.itemId },
                marka: { id: formData.markaId },
                weight: formData.weight,
                packetWeight: formData.packetWeight,
                numberOfPackets: formData.numberOfPackets,
                rate: formData.rate,
                pBrokerage: pBrokerage,
                sBrokerage: sBrokerage,
                brokeragePayer: formData.brokeragePayer,
                status: finalLoadDate ? 'LOADED' : 'PENDING'
            });
            addToast('Deal Saved Successfully!', 'success');
            setTimeout(() => { window.location.href='/app/dashboard'; }, 1000);
        } catch (err) {
            console.error(err);
            addToast('Failed to save deal', 'error');
            setIsProcessing(false);
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-8">
                        <DateInput
                            label={t('Dealing Date', 'सौदे की तारीख')}
                            value={formData.dealDate}
                            onChange={e => setFormData(prev => ({...prev, dealDate: e.target.value}))}
                            variant="deal"
                            required
                        />
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                {t('Loading Dates', 'लोडिंग की तारीख')}
                            </label>
                            {formData.loadDates.map((date, idx) => (
                                <div key={idx} className="flex items-center gap-2 mb-2">
                                    <div className="flex-1">
                                        <DateInput
                                            value={date}
                                            onChange={e => {
                                                const newDates = [...formData.loadDates];
                                                newDates[idx] = e.target.value;
                                                setFormData(prev => ({...prev, loadDates: newDates}));
                                            }}
                                            variant="load"
                                        />
                                    </div>
                                    {idx > 0 && (
                                        <button type="button" onClick={() => {
                                            const newDates = formData.loadDates.filter((_, i) => i !== idx);
                                            setFormData(prev => ({...prev, loadDates: newDates}));
                                        }} className="text-gray-400 hover:text-red-500 font-bold p-2 text-xl" title="Remove Date">
                                            🗑️
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button type="button" onClick={() => {
                                setFormData(prev => ({...prev, loadDates: [...prev.loadDates, '']}));
                            }} className="text-secondary hover:text-yellow-600 font-bold text-xs uppercase flex items-center gap-1 mt-1 transition-colors">
                                <span>➕ Add Date</span>
                            </button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-8 relative">
                        <div className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-gray-100 rounded-full items-center justify-center text-gray-400 font-bold z-20 border-2 border-white shadow-sm">VS</div>
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

                    <div className="bg-gray-50/80 border border-gray-200 p-4 sm:p-6 rounded-xl mb-8 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 shadow-inner">
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
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t('Packet Weight (kg)', 'बोरे का वजन')}</label>
                            <input type="number" name="packetWeight" value={formData.packetWeight} onChange={handleChange} min="1" step="0.5" className="w-full border-2 border-gray-200 rounded-lg px-3 py-3 font-bold focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm bg-gray-50 text-right text-gray-600" required />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">{t('Total Bags/Packets', 'कुल बोरे/कट्टे')}</label>
                            <input type="number" name="numberOfPackets" value={formData.numberOfPackets} onChange={handleChange} min="1" className="w-full border-2 border-yellow-200 rounded-lg px-3 py-3 font-black focus:ring-2 focus:ring-secondary outline-none transition-all shadow-sm bg-yellow-50 text-right text-secondary" placeholder="Auto-calculated" required />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-secondary rounded-xl p-6 mb-8 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-secondary opacity-10 rounded-bl-full pointer-events-none"></div>
                        <h3 className="text-sm font-bold text-secondary uppercase tracking-widest mb-4">{t('Brokerage Setup', 'दलाली दर्ज करें')}</h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-6 relative z-10">
                            <div className="bg-white p-5 border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                <label className="text-xs font-bold text-primary uppercase tracking-wider block mb-3">{t('Purchaser Pays', 'खरीदार की दलाली')}</label>
                                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                                    <input type="number" name="pBrokVal" value={formData.pBrokVal} onChange={handleChange} min="0" className="w-full sm:w-24 border-2 border-gray-200 p-2.5 rounded-lg font-bold focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50" step="0.01" />
                                    <select name="pBrokType" value={formData.pBrokType} onChange={handleChange} className="w-full sm:flex-1 border-2 border-gray-200 p-2.5 rounded-lg font-bold focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50">
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
                                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                                    <input type="number" name="sBrokVal" value={formData.sBrokVal} onChange={handleChange} min="0" className="w-full sm:w-24 border-2 border-gray-200 p-2.5 rounded-lg font-bold focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50" step="0.01" />
                                    <select name="sBrokType" value={formData.sBrokType} onChange={handleChange} className="w-full sm:flex-1 border-2 border-gray-200 p-2.5 rounded-lg font-bold focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50">
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
                        
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm relative z-10">
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

                    <button type="submit" disabled={isProcessing} className={`w-full text-white font-bold py-4 rounded-xl shadow-lg transition-all transform text-lg uppercase tracking-wider flex justify-center items-center gap-2 ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-red-800 hover:shadow-xl hover:-translate-y-1'}`}>
                        {isProcessing ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                {t('Processing...', 'प्रक्रिया चल रही है...')}
                            </>
                        ) : (
                            t('Save New Deal', 'नया सौदा सहेजें')
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default NewDeal;
