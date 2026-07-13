import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { getContacts, getFirms, getItems, getMarkas } from '../api';
import DateInput from './DateInput';
import { getLocalTodayDateString } from '../utils/dateUtils';

const DealForm = ({ initialData, onSubmit, isProcessing, title, buttonText }) => {
    const { t } = useLanguage();
    const { addToast } = useToast();
    const [contacts, setContacts] = useState([]);
    const [firms, setFirms] = useState([]);
    const [items, setItems] = useState([]);
    const [markas, setMarkas] = useState([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    const [formData, setFormData] = useState(() => {
        if (initialData) {
            let pbType = 'FIXED';
            let pbVal = initialData.weight && initialData.pBrokerage ? (initialData.pBrokerage / initialData.weight).toFixed(2) : '0';
            let sbType = 'FIXED';
            let sbVal = initialData.weight && initialData.sBrokerage ? (initialData.sBrokerage / initialData.weight).toFixed(2) : '0';

            if (initialData.weight && initialData.rate && !initialData.pBrokType) {
                const totalValue = initialData.weight * initialData.rate;
                
                const matchesPercent = (absoluteVal, testPercent) => {
                    if (!testPercent) return false;
                    const expected = (totalValue * testPercent) / 100;
                    return Math.abs(expected - absoluteVal) < 1.0;
                };

                if (initialData.pBrokerage > 0) {
                    const pPercent = (initialData.pBrokerage / totalValue) * 100;
                    if (Math.abs(Math.round(pPercent * 100) / 100 - pPercent) < 0.001) {
                        pbType = 'PERCENT';
                        pbVal = pPercent.toFixed(2);
                    } else if (initialData.purchaserContact?.defaultBrokType === 'PERCENT' && matchesPercent(initialData.pBrokerage, initialData.purchaserContact.defaultBrokVal)) {
                        pbType = 'PERCENT';
                        pbVal = initialData.purchaserContact.defaultBrokVal;
                    }
                }
                if (initialData.sBrokerage > 0) {
                    const sPercent = (initialData.sBrokerage / totalValue) * 100;
                    if (Math.abs(Math.round(sPercent * 100) / 100 - sPercent) < 0.001) {
                        sbType = 'PERCENT';
                        sbVal = sPercent.toFixed(2);
                    } else if (initialData.sellerContact?.defaultBrokType === 'PERCENT' && matchesPercent(initialData.sBrokerage, initialData.sellerContact.defaultBrokVal)) {
                        sbType = 'PERCENT';
                        sbVal = initialData.sellerContact.defaultBrokVal;
                    }
                }
            }

            // Natively read the stored explicit values if they exist in the DB
            if (initialData.pBrokType) {
                pbType = initialData.pBrokType;
                pbVal = initialData.pBrokVal;
            }
            if (initialData.sBrokType) {
                sbType = initialData.sBrokType;
                sbVal = initialData.sBrokVal;
            }

            return {
                dealDate: initialData.dealDate || getLocalTodayDateString(),
                purchaserDealDate: initialData.purchaserDealDate || '',
                loadDates: initialData.loadDate ? initialData.loadDate.split(',').map(s => s.trim()) : [''],
                purchaserContactId: initialData.purchaserContact?.id || '',
                purchaserId: initialData.purchaser?.id || '',
                sellerContactId: initialData.sellerContact?.id || '',
                sellerId: initialData.seller?.id || '',
                itemId: initialData.item?.id || '',
                markaId: initialData.marka?.id || '',
                weight: initialData.weight || '',
                packetWeight: initialData.packetWeight || 30,
                numberOfPackets: initialData.numberOfPackets || '',
                rate: initialData.rate || '',
                marginMarkup: initialData.marginMarkup || '',
                pBrokVal: pbVal,
                pBrokType: pbType,
                sBrokVal: sbVal,
                sBrokType: sbType,
                brokeragePayer: initialData.brokeragePayer || 'SEPARATE'
            };
        }
        return {
            dealDate: getLocalTodayDateString(),
            purchaserDealDate: '',
            loadDates: [''],
            purchaserContactId: '',
            purchaserId: '',
            sellerContactId: '',
            sellerId: '',
            itemId: '',
            markaId: '',
            weight: '',
            packetWeight: 30,
            numberOfPackets: '',
            rate: '',
            marginMarkup: '',
            pBrokVal: '',
            pBrokType: 'PERCENT',
            sBrokVal: '',
            sBrokType: 'PERCENT',
            brokeragePayer: 'SEPARATE'
        };
    });

    const [showPurchaserDate, setShowPurchaserDate] = useState(!!formData.purchaserDealDate);

    useEffect(() => {
        Promise.all([getContacts(), getFirms(), getItems(), getMarkas()]).then(([c, f, i, m]) => {
            setContacts(c);
            setFirms(f);
            setItems(i);
            setMarkas(m);
            if (!initialData || !initialData.purchaserContact) {
                setFormData(prev => {
                    const updated = { ...prev };
                    if (!updated.purchaserContactId && c.length > 0) {
                        updated.purchaserContactId = c[0].id;
                        updated.pBrokVal = c[0].defaultBrokVal ?? '';
                        updated.pBrokType = c[0].defaultBrokType || 'PERCENT';
                    }
                    if (!updated.sellerContactId && c.length > 1) {
                        updated.sellerContactId = c[1].id;
                        updated.sBrokVal = c[1].defaultBrokVal ?? '';
                        updated.sBrokType = c[1].defaultBrokType || 'PERCENT';
                    } else if (!updated.sellerContactId && c.length === 1) {
                        updated.sellerContactId = c[0].id;
                        updated.sBrokVal = c[0].defaultBrokVal ?? '';
                        updated.sBrokType = c[0].defaultBrokType || 'PERCENT';
                    }
                    if (!updated.itemId && i.length > 0) updated.itemId = i[0].id;
                    if (!updated.markaId && m.length > 0) updated.markaId = m[0].id;
                    return updated;
                });
            }
        })
        .catch(console.error)
        .finally(() => setIsInitialLoading(false));
    }, []);

    // Auto-select first firm if none is selected, since native select visual defaults to the first option
    useEffect(() => {
        setFormData(prev => {
            let updated = { ...prev };
            let changed = false;

            if (firms.length > 0) {
                if (!updated.purchaserId && updated.purchaserContactId) {
                    const availableFirms = firms.filter(f => f.contact?.id == updated.purchaserContactId);
                    if (availableFirms.length > 0) {
                        updated.purchaserId = availableFirms[0].id;
                        changed = true;
                    }
                }
                if (!updated.sellerId && updated.sellerContactId) {
                    const availableFirms = firms.filter(f => f.contact?.id == updated.sellerContactId);
                    if (availableFirms.length > 0) {
                        updated.sellerId = availableFirms[0].id;
                        changed = true;
                    }
                }
            }

            return changed ? updated : prev;
        });
    }, [firms, formData.purchaserContactId, formData.sellerContactId]);

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
                    // Always recalculate weight when packet count or packet weight explicitly changes
                    updated.weight = calcW.toFixed(2);
                } else if (value === '') {
                    updated.weight = '';
                }
            }
            return updated;
        });
    };

    const handleContactChange = (e, type) => {
        const contactId = e.target.value;
        const contact = contacts.find(c => c.id == contactId);
        setFormData(prev => ({
            ...prev,
            [e.target.name]: contactId,
            ...(type === 'purchaser' ? { purchaserId: '', pBrokVal: contact?.defaultBrokVal ?? '', pBrokType: contact?.defaultBrokType || 'PERCENT' } : {}),
            ...(type === 'seller' ? { sellerId: '', sBrokVal: contact?.defaultBrokVal ?? '', sBrokType: contact?.defaultBrokType || 'PERCENT' } : {})
        }));
    };

    const handleFirmChange = (e) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const calcBrokerage = (val, type) => {
        const w = parseFloat(formData.weight) || 0;
        const r = parseFloat(formData.rate) || 0;
        const v = parseFloat(val) || 0;
        const raw = type === 'PERCENT' ? (w * r * v) / 100 : w * v;
        return Number(raw.toFixed(2));
    };

    const pBrokerage = calcBrokerage(formData.pBrokVal, formData.pBrokType);
    const sBrokerage = calcBrokerage(formData.sBrokVal, formData.sBrokType);
    let totalBrokerage = Number((pBrokerage + sBrokerage).toFixed(2));

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (isProcessing) return;

        if (formData.purchaserContactId === formData.sellerContactId) {
            addToast('Purchaser and Seller Party cannot be the same', 'error');
            return;
        }
        if (!formData.purchaserContactId || !formData.sellerContactId || !formData.itemId || !formData.markaId) {
            addToast('Please select Purchaser Party, Seller Party, Item, and Marka', 'error');
            return;
        }
        
        const finalLoadDate = formData.loadDates.filter(d => d).join(', ') || null;

        if (finalLoadDate) {
            const dealDateObj = new Date(formData.dealDate);
            const pDateObj = showPurchaserDate && formData.purchaserDealDate ? new Date(formData.purchaserDealDate) : dealDateObj;
            const earliestDateObj = new Date(Math.min(dealDateObj.getTime(), pDateObj.getTime()));
            const loadDatesArray = formData.loadDates.filter(d => d);
            for (const d of loadDatesArray) {
                if (new Date(d) < earliestDateObj) {
                    addToast(t('Loading date cannot be before the deal date', 'लोडिंग की तारीख सौदे की तारीख से पहले नहीं हो सकती'), 'error');
                    return;
                }
            }
            if (!formData.purchaserId || !formData.sellerId) {
                addToast('Firms must be selected if a Load Date is provided', 'error');
                return;
            }
        }
        if (!formData.weight || !formData.rate || isNaN(Number(formData.weight)) || isNaN(Number(formData.rate)) || Number(formData.weight) <= 0 || Number(formData.rate) <= 0) {
            addToast('Weight and Rate must be valid numbers greater than zero', 'error');
            return;
        }
        if (pBrokerage < 0 || sBrokerage < 0) {
            addToast('Brokerage values cannot be negative', 'error');
            return;
        }

        const calculatedStatus = finalLoadDate 
            ? (initialData && initialData.status !== 'PENDING' ? initialData.status : 'LOADED') 
            : (initialData && initialData.status !== 'LOADED' ? initialData.status : 'PENDING');

        await onSubmit({
            dealDate: formData.dealDate,
            purchaserDealDate: showPurchaserDate && formData.purchaserDealDate ? formData.purchaserDealDate : null,
            loadDate: finalLoadDate,
            purchaserContact: { id: formData.purchaserContactId },
            sellerContact: { id: formData.sellerContactId },
            purchaser: formData.purchaserId ? { id: formData.purchaserId } : null,
            seller: formData.sellerId ? { id: formData.sellerId } : null,
            item: { id: formData.itemId },
            marka: { id: formData.markaId },
            weight: formData.weight,
            packetWeight: formData.packetWeight,
            numberOfPackets: formData.numberOfPackets,
            rate: formData.rate,
            marginMarkup: formData.marginMarkup ? parseFloat(formData.marginMarkup) : 0,
            pBrokerage: pBrokerage,
            pBrokType: formData.pBrokType,
            pBrokVal: parseFloat(formData.pBrokVal) || 0,
            sBrokerage: sBrokerage,
            sBrokType: formData.sBrokType,
            sBrokVal: parseFloat(formData.sBrokVal) || 0,
            brokeragePayer: formData.brokeragePayer,
            status: calculatedStatus
        });
    };

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="mb-6 sm:mb-8">
                <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.16em] text-secondary mb-2">
                    <span className="w-6 h-px bg-secondary/50"></span>{t('Trade Operations', 'ट्रेड ऑपरेशंस')}
                </div>
                <h1 className="text-2xl sm:text-[32px] font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                    <span className="text-3xl sm:text-4xl">{initialData ? '✏️' : '🤝'}</span> {title || t('Enter New Deal', 'नया सौदा दर्ज करें')}
                </h1>
            </div>
            
            <div className="bg-white border border-gray-100 rounded-2xl shadow-xl p-4 sm:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary opacity-5 rounded-bl-full pointer-events-none"></div>
                
                {isInitialLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 h-[50vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mb-4"></div>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">{t('Loading form...', 'लोड हो रहा है...')}</p>
                </div>
                ) : (
                <form onSubmit={handleSubmit} className="relative z-10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-8">
                        <div className="flex flex-col gap-2 relative group">
                            <DateInput
                                label={showPurchaserDate ? t('Seller Deal Date', 'विक्रेता की सौदे की तारीख') : t('Dealing Date', 'सौदे की तारीख')}
                                value={formData.dealDate}
                                onChange={e => setFormData(prev => ({...prev, dealDate: e.target.value}))}
                                variant="deal"
                                required
                            />
                            {!showPurchaserDate ? (
                                <button type="button" onClick={() => setShowPurchaserDate(true)} className="text-[10px] uppercase font-bold text-gray-400 hover:text-secondary self-start transition-colors flex items-center gap-1 mt-1">
                                    <span className="text-lg leading-none">+</span> {t('Add separate Buyer date', 'खरीदार के लिए अलग तारीख')}
                                </button>
                            ) : (
                                <div className="mt-2 animate-slide-in relative">
                                    <button type="button" onClick={() => { setShowPurchaserDate(false); setFormData(prev => ({...prev, purchaserDealDate: ''})); }} className="absolute top-0 right-0 text-[10px] uppercase font-bold text-red-400 hover:text-red-600 z-10 transition-colors">
                                        ✕ {t('Remove', 'हटाएं')}
                                    </button>
                                    <DateInput
                                        label={t('Buyer Deal Date', 'खरीदार की सौदे की तारीख')}
                                        value={formData.purchaserDealDate}
                                        onChange={e => setFormData(prev => ({...prev, purchaserDealDate: e.target.value}))}
                                        variant="default"
                                    />
                                </div>
                            )}
                        </div>
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
                                <span>➕ {t('Add Date', 'तारीख जोड़ें')}</span>
                            </button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-8 relative">
                        <div className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-gray-100 rounded-full items-center justify-center text-gray-400 font-bold z-20 border-2 border-white shadow-sm">VS</div>
                        
                        {/* Purchaser Section */}
                        <div className="bg-red-50/50 p-5 rounded-xl border border-red-100">
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">{t('Purchaser Party *', 'क्रेता पार्टी *')}</label>
                                <select name="purchaserContactId" value={formData.purchaserContactId} onChange={(e) => handleContactChange(e, 'purchaser')} className="w-full bg-white border-2 border-red-200 rounded-lg px-4 py-3 font-bold text-textMain focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm">
                                    <option value="">{t('Select Party...', 'पार्टी चुनें...')}</option>
                                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">{t('Purchaser Firm', 'क्रेता फर्म')} <span className="text-gray-400 font-normal ml-1 lowercase">({t('Optional', 'वैकल्पिक')})</span></label>
                                <select name="purchaserId" value={formData.purchaserId} onChange={handleFirmChange} className="w-full bg-white border-2 border-red-200 rounded-lg px-4 py-3 font-bold text-textMain focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm" disabled={!formData.purchaserContactId}>
                                    <option value="">{t('To be decided...', 'तय किया जाना है...')}</option>
                                    {firms.filter(f => f.contact?.id == formData.purchaserContactId || f.id == formData.purchaserId).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Seller Section */}
                        <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">{t('Seller Party *', 'विक्रेता पार्टी *')}</label>
                                <select name="sellerContactId" value={formData.sellerContactId} onChange={(e) => handleContactChange(e, 'seller')} className="w-full bg-white border-2 border-blue-200 rounded-lg px-4 py-3 font-bold text-textMain focus:ring-2 focus:ring-blue-600 outline-none transition-all shadow-sm">
                                    <option value="">{t('Select Party...', 'पार्टी चुनें...')}</option>
                                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">{t('Seller Firm', 'विक्रेता फर्म')} <span className="text-gray-400 font-normal ml-1 lowercase">({t('Optional', 'वैकल्पिक')})</span></label>
                                <select name="sellerId" value={formData.sellerId} onChange={handleFirmChange} className="w-full bg-white border-2 border-blue-200 rounded-lg px-4 py-3 font-bold text-textMain focus:ring-2 focus:ring-blue-600 outline-none transition-all shadow-sm" disabled={!formData.sellerContactId}>
                                    <option value="">{t('To be decided...', 'तय किया जाना है...')}</option>
                                    {firms.filter(f => f.contact?.id == formData.sellerContactId || f.id == formData.sellerId).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </select>
                            </div>
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
                        <div className="col-span-2 md:col-span-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('Base Rate (₹)', 'मूल दर (₹)')}</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-3.5 text-gray-400 font-bold">₹</span>
                                        <input type="number" name="rate" value={formData.rate} onChange={handleChange} className="w-full bg-white border-2 border-gray-200 rounded-lg pl-8 pr-4 py-3 font-bold text-gray-800 focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm" placeholder="0.00" required min="1" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2" title="Price manipulation added to purchaser rate">{t('Markup (± ₹)', 'मार्जिन (± ₹)')}</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-3.5 text-gray-400 font-bold">₹</span>
                                        <input type="number" name="marginMarkup" value={formData.marginMarkup} onChange={handleChange} className={`w-full bg-white border-2 rounded-lg pl-8 pr-4 py-3 font-bold focus:ring-2 outline-none transition-all shadow-sm ${formData.marginMarkup > 0 ? 'border-green-300 text-green-700 focus:ring-green-500 bg-green-50' : formData.marginMarkup < 0 ? 'border-red-300 text-red-700 focus:ring-red-500 bg-red-50' : 'border-gray-200 text-gray-800 focus:ring-primary'}`} placeholder="0.00" step="0.01" />
                                        {formData.rate && formData.marginMarkup && (
                                            <div className="absolute -bottom-5 right-0 text-[10px] font-bold text-gray-500">
                                                Purchaser: ₹{parseFloat(formData.rate) + parseFloat(formData.marginMarkup || 0)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">{t('Total Bags/Packets', 'कुल बोरे/कट्टे')}</label>
                            <input type="number" name="numberOfPackets" value={formData.numberOfPackets} onChange={handleChange} min="1" className="w-full border-2 border-yellow-200 rounded-lg px-3 py-3 font-black focus:ring-2 focus:ring-secondary outline-none transition-all shadow-sm bg-yellow-50 text-right text-secondary" placeholder={t('Auto', 'स्वचालित')} required />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t('Packet Weight (kg)', 'बोरे का वजन')}</label>
                            <input type="number" name="packetWeight" value={formData.packetWeight} onChange={handleChange} min="1" step="0.5" className="w-full border-2 border-gray-200 rounded-lg px-3 py-3 font-bold focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm bg-gray-50 text-right text-gray-600" required />
                        </div>
                        <div className="col-span-2 md:col-span-2">
                            <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">{t('Total Weight (Qtl)', 'वजन')}</label>
                            <input type="number" name="weight" value={formData.weight} onChange={handleChange} min="0.01" step="0.01" className="w-full border-2 border-primary/30 rounded-lg px-3 py-3 font-bold focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm bg-white text-right text-lg text-primary" required />
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
                                        <option value="PERCENT">% {t('Percent', 'प्रतिशत')}</option>
                                        <option value="FIXED">₹ {t('Fixed/Qtl', 'प्रति क्विंटल')}</option>
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
                                        <option value="PERCENT">% {t('Percent', 'प्रतिशत')}</option>
                                        <option value="FIXED">₹ {t('Fixed/Qtl', 'प्रति क्विंटल')}</option>
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

                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 z-40 sm:relative sm:bg-transparent sm:border-0 sm:p-0 pb-safe sm:pb-0">
                        <button data-testid="submit-deal-btn" type="submit" disabled={isProcessing} className={`w-full text-white font-bold py-4 rounded-xl shadow-lg transition-all transform text-lg uppercase tracking-wider flex justify-center items-center gap-2 ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-tr from-primary to-red-600 shadow-lg shadow-red-900/30 hover:shadow-xl hover:-translate-y-1'}`}>
                            {isProcessing ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    {t('Processing...', 'प्रक्रिया चल रही है...')}
                                </>
                            ) : (
                                buttonText || t('Save New Deal', 'नया सौदा सहेजें')
                            )}
                        </button>
                    </div>
                </form>
                )}
            </div>
        </div>
    );
};

export default DealForm;
