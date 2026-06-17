import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { getPendingDeals, loadDeal, deleteDeal, getFirms, getItems, getMarkas, updateDeal } from '../api';
import DateInput from './DateInput';
import ConfirmModal from './ConfirmModal';


const Pending = () => {
    const { t } = useLanguage();
    const { addToast } = useToast();
    const [deals, setDeals] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Load Action State
    const [selectedDeal, setSelectedDeal] = useState(null);
    const [loadData, setLoadData] = useState({ date: '', weight: '' });
    
    // Edit Action State
    const [editDeal, setEditDeal] = useState(null);
    const [firms, setFirms] = useState([]);
    const [items, setItems] = useState([]);
    const [markas, setMarkas] = useState([]);
    const [editData, setEditData] = useState({
        dealDate: '',
        purchaser: { id: '' },
        seller: { id: '' },
        item: { id: '' },
        marka: { id: '' },
        weight: '',
        packetWeight: 30,
        numberOfPackets: '',
        rate: '',
        pBrokerage: '',
        sBrokerage: '',
        brokeragePayer: 'BOTH'
    });

    const [searchQuery, setSearchQuery] = useState('');

    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });

    const fetchDeals = () => getPendingDeals().then(setDeals).catch(console.error);
    
    useEffect(() => { 
        fetchDeals(); 
        // Pre-fetch reference data in case user wants to edit
        getFirms().then(setFirms).catch(console.error);
        getItems().then(setItems).catch(console.error);
        getMarkas().then(setMarkas).catch(console.error);
    }, []);

    const handleLoad = async () => {
        if (!selectedDeal || !loadData.weight || !loadData.date) return;
        const weightToLoad = parseFloat(loadData.weight);
        if (weightToLoad <= 0) {
            addToast('Loading weight must be greater than zero.', 'error');
            return;
        }
        if (weightToLoad > selectedDeal.weight) {
            addToast('Cannot load more than pending weight.', 'error');
            return;
        }
        setIsProcessing(true);
        try {
            await loadDeal(selectedDeal.id, weightToLoad, loadData.date);
            addToast('Deal Loaded Successfully!', 'success');
            setSelectedDeal(null);
            fetchDeals(); // refresh list
        } catch (e) {
            addToast(e.response?.data?.message || 'Failed to load deal', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteDeal = (id) => {
        setConfirmDialog({ isOpen: true, id: id });
    };

    const executeDelete = async () => {
        const id = confirmDialog.id;
        setConfirmDialog({ isOpen: false, id: null });
        setIsProcessing(true);
        try {
            await deleteDeal(id);
            addToast('Deal Deleted Successfully!', 'success');
            fetchDeals();
        } catch (e) {
            addToast(e.response?.data?.message || 'Failed to delete deal', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const openEditDeal = (deal) => {
        setEditDeal(deal);
        setEditData({
            dealDate: deal.dealDate || '',
            purchaser: deal.purchaser ? { id: deal.purchaser.id } : { id: '' },
            seller: deal.seller ? { id: deal.seller.id } : { id: '' },
            item: deal.item ? { id: deal.item.id } : { id: '' },
            marka: deal.marka ? { id: deal.marka.id } : { id: '' },
            weight: deal.weight || '',
            packetWeight: deal.packetWeight || 30,
            numberOfPackets: deal.numberOfPackets || '',
            rate: deal.rate || '',
            pBrokerage: deal.pBrokerage || '',
            sBrokerage: deal.sBrokerage || '',
            brokeragePayer: deal.brokeragePayer || 'BOTH'
        });
    };

    const handleUpdateDeal = async () => {
        try {
            // Data validation (similar to new deal)
            if (!editData.purchaser.id || !editData.seller.id) {
                addToast('Purchaser and Seller are required', 'error');
                return;
            }
            if (editData.purchaser.id === editData.seller.id) {
                addToast('Purchaser and Seller cannot be the same', 'error');
                return;
            }
            if (parseFloat(editData.weight) <= 0 || parseFloat(editData.rate) <= 0) {
                addToast('Weight and Rate must be greater than zero', 'error');
                return;
            }
            if ((editData.pBrokerage && parseFloat(editData.pBrokerage) < 0) || (editData.sBrokerage && parseFloat(editData.sBrokerage) < 0)) {
                addToast('Brokerage values cannot be negative', 'error');
                return;
            }
            setIsProcessing(true);
            await updateDeal(editDeal.id, {
                dealDate: editData.dealDate || null,
                purchaser: editData.purchaser.id ? { id: editData.purchaser.id } : null,
                seller: editData.seller.id ? { id: editData.seller.id } : null,
                item: editData.item.id ? { id: editData.item.id } : null,
                marka: editData.marka.id ? { id: editData.marka.id } : null,
                weight: parseFloat(editData.weight),
                packetWeight: editData.packetWeight ? parseFloat(editData.packetWeight) : null,
                numberOfPackets: editData.numberOfPackets ? parseInt(editData.numberOfPackets) : null,
                rate: parseFloat(editData.rate),
                pBrokerage: editData.pBrokerage ? parseFloat(editData.pBrokerage) : null,
                sBrokerage: editData.sBrokerage ? parseFloat(editData.sBrokerage) : null,
                brokeragePayer: editData.brokeragePayer
            });
            addToast('Deal Updated Successfully!', 'success');
            setEditDeal(null);
            fetchDeals();
        } catch (e) {
            addToast(e.response?.data?.message || 'Failed to update deal', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredDeals = deals.filter(deal => {
        const q = searchQuery.toLowerCase();
        return (
            (deal.purchaser?.name || '').toLowerCase().includes(q) ||
            (deal.seller?.name || '').toLowerCase().includes(q) ||
            (deal.item?.name || '').toLowerCase().includes(q) ||
            (deal.marka?.name || '').toLowerCase().includes(q)
        );
    });

    return (
        <div className="max-w-6xl mx-auto p-4 py-8 relative">
            {isProcessing && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center animate-slide-in">
                        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-primary font-bold text-lg">{t('Processing...', 'प्रक्रिया चल रही है...')}</p>
                        <p className="text-xs text-gray-400 mt-2">Please do not close this window</p>
                    </div>
                </div>
            )}
            
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <h1 className="text-3xl font-bold text-secondary tracking-tight">{t('Pending Loading Dates', 'लंबित लोडिंग तारीख')}</h1>
                <div className="relative w-full md:w-72">
                    <input 
                        type="text" 
                        placeholder={t('Search Firm, Item, or Marka...', 'फर्म, आइटम खोजें...')} 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-4 pr-10 py-2 border-2 border-yellow-200 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-all shadow-sm outline-none bg-white"
                    />
                    <div className="absolute right-3 top-2.5 text-yellow-500">
                        🔍
                    </div>
                </div>
            </div>
            
            <div className="bg-white border border-secondary rounded-xl shadow-lg overflow-hidden mb-6 relative">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-secondary to-yellow-300"></div>
                <div className="hidden md:block overflow-x-auto p-1 pl-2">
                    <table className="w-full text-left text-sm text-textMain border-collapse">
                        <thead className="bg-yellow-50 text-xs uppercase text-secondary border-b-2 border-yellow-200 sticky top-0">
                            <tr>
                                <th className="px-5 py-4 font-bold whitespace-nowrap">{t('Deal Date', 'तारीख')}</th>
                                <th className="px-5 py-4 font-bold">{t('Purchaser', 'खरीदार')}</th>
                                <th className="px-5 py-4 font-bold">{t('Seller', 'विक्रेता')}</th>
                                <th className="px-5 py-4 font-bold">{t('Item & Marka', 'आइटम और मार्का')}</th>
                                <th className="px-5 py-4 font-bold text-right">{t('Actions', 'क्रियाएं')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredDeals.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-12 text-center">
                                        <div className="text-4xl mb-3 opacity-50">📋</div>
                                        <h3 className="text-lg font-bold text-textMain">{t('No Pending Deals', 'कोई लंबित सौदा नहीं')}</h3>
                                        <p className="text-textMuted mt-1">{t('Try adjusting your search query', 'अपनी खोज बदलें')}</p>
                                    </td>
                                </tr>
                            ) : filteredDeals.map(deal => (
                                <tr key={deal.id} className="hover:bg-yellow-50/50 transition-colors group">
                                    <td className="px-5 py-4 font-semibold text-gray-600">{deal.dealDate}</td>
                                    <td className="px-5 py-4 font-bold text-primary group-hover:text-red-900 transition-colors">{deal.purchaser?.name}</td>
                                    <td className="px-5 py-4 font-bold text-primary group-hover:text-red-900 transition-colors">{deal.seller?.name}</td>
                                    <td className="px-5 py-4">
                                        <span className="bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200 font-bold shadow-sm">{deal.item?.name}</span> 
                                        <span className="text-secondary font-bold ml-1.5">{deal.marka?.name}</span>
                                        <div className="mt-1.5 text-xs text-textMuted font-bold uppercase flex items-center gap-2">
                                            <span className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">{deal.weight} QTL {deal.numberOfPackets ? `(${deal.numberOfPackets} Bags)` : ''}</span> 
                                            <span>@ ₹{deal.rate}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-right whitespace-nowrap">
                                        <button onClick={() => openEditDeal(deal)} className="bg-white hover:bg-gray-50 border-2 border-gray-200 text-gray-600 transition-all font-bold py-1.5 px-3 rounded-lg shadow-sm text-xs mr-2" title="Edit Deal">
                                            ✏️ Edit
                                        </button>
                                        <button onClick={() => handleDeleteDeal(deal.id)} className="bg-white hover:bg-red-50 border-2 border-red-200 text-red-600 transition-all font-bold py-1.5 px-3 rounded-lg shadow-sm text-xs mr-2" title="Delete Deal">
                                            🗑️ Delete
                                        </button>
                                        <button onClick={() => { setSelectedDeal(deal); setLoadData({...loadData, weight: deal.weight}); }} className="bg-secondary hover:bg-yellow-600 hover:-translate-y-0.5 transition-all text-white font-bold py-1.5 px-4 rounded-lg shadow-md text-xs uppercase tracking-wider">
                                            {t('Load Now', 'लोड करें')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card Layout */}
                <div className="md:hidden divide-y divide-gray-100">
                    {filteredDeals.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="text-4xl mb-3 opacity-50">📋</div>
                            <h3 className="text-lg font-bold text-textMain">{t('No Pending Deals', 'कोई लंबित सौदा नहीं')}</h3>
                            <p className="text-textMuted mt-1">{t('Try adjusting your search query', 'अपनी खोज बदलें')}</p>
                        </div>
                    ) : filteredDeals.map(deal => (
                        <div key={deal.id} className="p-4 hover:bg-yellow-50/50 transition-colors relative pl-6">
                            {/* Decorative line matching dashboard cards */}
                            <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-secondary to-yellow-300 opacity-50"></div>
                            
                            <div className="flex justify-between items-start mb-3">
                                <div className="text-xs text-gray-500 font-bold">{deal.dealDate}</div>
                                <div className="text-xs font-bold text-secondary">{deal.item?.name} - {deal.marka?.name}</div>
                            </div>
                            
                            <div className="mb-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] uppercase font-bold text-gray-400 w-6">P</span>
                                    <span className="font-bold text-primary">{deal.purchaser?.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] uppercase font-bold text-gray-400 w-6">S</span>
                                    <span className="font-bold text-primary">{deal.seller?.name}</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mb-4 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold">{deal.weight} QTL {deal.numberOfPackets ? `(${deal.numberOfPackets} Bags)` : ''}</span>
                                <span className="text-gray-600 font-bold text-sm">₹{deal.rate}</span>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => { setSelectedDeal(deal); setLoadData({...loadData, weight: deal.weight}); }} className="flex-1 bg-secondary text-white font-bold py-2 px-3 rounded-lg shadow-sm text-xs uppercase tracking-wider text-center">
                                    {t('Load', 'लोड')}
                                </button>
                                <button onClick={() => openEditDeal(deal)} className="bg-white border-2 border-gray-200 text-gray-600 font-bold py-2 px-3 rounded-lg shadow-sm text-xs">
                                    ✏️
                                </button>
                                <button onClick={() => handleDeleteDeal(deal.id)} className="bg-white border-2 border-red-200 text-red-600 font-bold py-2 px-3 rounded-lg shadow-sm text-xs">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Edit Deal Modal */}
            {editDeal && (
                <div className="modal-overlay">
                    <div className="modal-content border-t-8 border-primary relative animate-slide-in max-w-4xl">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-primary opacity-5 rounded-bl-full rounded-tr-xl pointer-events-none"></div>
                        <h2 className="text-2xl font-bold mb-5 flex items-center gap-2">
                            <span className="text-primary">✏️</span> {t('Edit Pending Deal', 'सौदा संपादित करें')}
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                            {/* Left Column */}
                            <div className="space-y-4">
                                <div>
                                    <DateInput
                                        label={t('Deal Date', 'तारीख')}
                                        value={editData.dealDate}
                                        onChange={e => setEditData({...editData, dealDate: e.target.value})}
                                        variant="deal"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Purchaser</label>
                                    <select value={editData.purchaser.id} onChange={e => setEditData({...editData, purchaser: { id: e.target.value }})} className="w-full border-2 border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white">
                                        <option value="">Select Purchaser</option>
                                        {firms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Seller</label>
                                    <select value={editData.seller.id} onChange={e => setEditData({...editData, seller: { id: e.target.value }})} className="w-full border-2 border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white">
                                        <option value="">Select Seller</option>
                                        {firms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Item</label>
                                        <select value={editData.item.id} onChange={e => setEditData({...editData, item: { id: e.target.value }})} className="w-full border-2 border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white">
                                            <option value="">Select Item</option>
                                            {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Marka</label>
                                        <select value={editData.marka.id} onChange={e => setEditData({...editData, marka: { id: e.target.value }})} className="w-full border-2 border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white">
                                            <option value="">Select Marka</option>
                                            {markas.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Right Column */}
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Weight (Qtl)</label>
                                        <input type="number" value={editData.weight} onChange={e => {
                                            const w = parseFloat(e.target.value);
                                            const pw = parseFloat(editData.packetWeight);
                                            let np = editData.numberOfPackets;
                                            if (!isNaN(w) && !isNaN(pw) && pw > 0) np = Math.round((w * 100) / pw);
                                            setEditData({...editData, weight: e.target.value, numberOfPackets: np});
                                        }} className="w-full border-2 border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-primary outline-none" min="0" step="0.01" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rate (₹)</label>
                                        <input type="number" value={editData.rate} onChange={e => setEditData({...editData, rate: e.target.value})} className="w-full border-2 border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-primary outline-none" min="0" step="0.01" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Packet (kg)</label>
                                        <input type="number" value={editData.packetWeight} onChange={e => {
                                            const pw = parseFloat(e.target.value);
                                            const w = parseFloat(editData.weight);
                                            let np = editData.numberOfPackets;
                                            if (!isNaN(w) && !isNaN(pw) && pw > 0) np = Math.round((w * 100) / pw);
                                            setEditData({...editData, packetWeight: e.target.value, numberOfPackets: np});
                                        }} className="w-full border-2 border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-primary outline-none" min="1" step="0.5" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-secondary uppercase mb-1">Total Bags</label>
                                        <input type="number" value={editData.numberOfPackets} onChange={e => setEditData({...editData, numberOfPackets: e.target.value})} className="w-full border-2 border-yellow-200 bg-yellow-50 text-secondary p-2.5 rounded-lg font-bold focus:ring-2 focus:ring-secondary outline-none" min="1" />
                                    </div>
                                </div>
                                
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Brokerage Settings</label>
                                    <div className="grid grid-cols-2 gap-4 mb-3">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Purchaser Brok</label>
                                            <input type="number" value={editData.pBrokerage} onChange={e => setEditData({...editData, pBrokerage: e.target.value})} className="w-full border-2 border-gray-200 p-2 rounded-lg text-sm" step="0.01" placeholder="Empty = 0" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Seller Brok</label>
                                            <input type="number" value={editData.sBrokerage} onChange={e => setEditData({...editData, sBrokerage: e.target.value})} className="w-full border-2 border-gray-200 p-2 rounded-lg text-sm" step="0.01" placeholder="Empty = 0" />
                                        </div>
                                    </div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Who Pays Brokerage?</label>
                                    <select value={editData.brokeragePayer} onChange={e => setEditData({...editData, brokeragePayer: e.target.value})} className="w-full border-2 border-gray-200 p-2 rounded-lg text-sm bg-white font-bold">
                                        <option value="SEPARATE">Separate (अलग-अलग)</option>
                                        <option value="PURCHASER_BOTH">Purchaser Pays Both (खरीदार दोनों देगा)</option>
                                        <option value="SELLER_BOTH">Seller Pays Both (विक्रेता दोनों देगा)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-100">
                            <button onClick={() => setEditDeal(null)} className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 transition-colors font-bold rounded-lg text-gray-600">{t('Cancel', 'रद्द करें')}</button>
                            <button onClick={handleUpdateDeal} className="px-6 py-2.5 bg-primary hover:bg-red-800 transition-colors text-white font-bold rounded-lg shadow-lg flex items-center gap-2">
                                <span>{t('Save Changes', 'परिवर्तन सहेजें')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Load Deal Modal */}
            {selectedDeal && (
                <div className="modal-overlay">
                    <div className="modal-content border-t-8 border-secondary relative overflow-hidden animate-slide-in">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-secondary opacity-10 rounded-bl-full pointer-events-none"></div>
                        <h2 className="text-2xl font-bold mb-5 flex items-center gap-2">
                            <span className="text-secondary">🚚</span> {t('Load Item / Dispatch', 'लोडिंग दर्ज करें')}
                        </h2>
                        
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-5 flex justify-between items-center">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase">{t('Firm Details', 'फर्म का विवरण')}</p>
                                <p className="font-bold text-primary mt-0.5">{selectedDeal.purchaser?.name} <span className="text-gray-400 mx-1">/</span> {selectedDeal.seller?.name}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-gray-500 uppercase">{t('Item', 'आइटम')}</p>
                                <p className="font-bold text-secondary mt-0.5">{selectedDeal.item?.name} - {selectedDeal.marka?.name}</p>
                            </div>
                        </div>

                        <div>
                            <DateInput
                                label={t('Loading Date', 'लोडिंग की तारीख')}
                                value={loadData.date}
                                onChange={e => setLoadData({...loadData, date: e.target.value})}
                                variant="load"
                                required
                            />
                        </div>
                        <div className="mb-8">
                            <label className="block text-sm font-bold text-textMain mb-1.5">{t('Loaded Weight (Qtl)', 'लोड किया गया वजन')}</label>
                            <div className="relative">
                                <input type="number" value={loadData.weight} onChange={e => setLoadData({...loadData, weight: e.target.value})} max={selectedDeal.weight} min="0.01" step="0.01" className="w-full border-2 border-gray-300 p-3 pl-4 rounded-lg font-bold text-lg focus:ring-2 focus:ring-secondary focus:border-secondary transition-all outline-none" />
                                <div className="absolute right-4 top-3.5 text-gray-400 font-bold">QTL</div>
                            </div>
                            <div className="flex justify-between items-center mt-2 px-1">
                                <p className="text-xs text-textMuted font-medium">Pending: <span className="font-bold text-secondary text-sm">{selectedDeal.weight}</span> Qtl</p>
                                <p className="text-xs text-moneyGreen font-bold italic animate-pulse">* Automatically splits if partial</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <button onClick={() => setSelectedDeal(null)} className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 transition-colors font-bold rounded-lg text-gray-600">{t('Cancel', 'रद्द करें')}</button>
                            <button onClick={handleLoad} className="px-6 py-2.5 bg-secondary hover:bg-yellow-600 transition-colors text-white font-bold rounded-lg shadow-lg flex items-center gap-2">
                                <span>{t('Confirm Loading', 'लोडिंग पक्की करें')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal 
                isOpen={confirmDialog.isOpen}
                title="Delete Deal"
                message="Are you sure you want to delete this deal?"
                onConfirm={executeDelete}
                onCancel={() => setConfirmDialog({ isOpen: false, id: null })}
            />
        </div>
    );
};

export default Pending;
