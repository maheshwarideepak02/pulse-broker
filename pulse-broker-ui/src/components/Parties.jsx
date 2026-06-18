import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { getContacts, getFirms, createContact, createFirm, updateContact, updateFirm, deleteContact, deleteFirm } from '../api';
import ConfirmModal from './ConfirmModal';

const Parties = () => {
    const { t } = useLanguage();
    const { addToast } = useToast();
    const [contacts, setContacts] = useState([]);
    const [firms, setFirms] = useState([]);
    const [showContactForm, setShowContactForm] = useState(false);
    const [showFirmForm, setShowFirmForm] = useState(false);
    const [selectedContact, setSelectedContact] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Edit states
    const [editContact, setEditContact] = useState(null);
    const [editFirm, setEditFirm] = useState(null);

    const [nc, setNc] = useState({ name: '', phone: '', city: '' });
    const [fc, setFc] = useState({ name: '', defaultBrokType: 'PERCENT', defaultBrokVal: '' });

    const [isProcessing, setIsProcessing] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: '', id: null, title: '', message: '' });

    const fetchData = () => {
        getContacts().then(setContacts).catch(console.error);
        getFirms().then(setFirms).catch(console.error);
    }

    useEffect(() => {
        fetchData();
    }, []);

    const handleSaveContact = async () => {
        if (!nc.name || nc.name.trim() === '') {
            addToast('Name is required', 'error');
            return;
        }
        if (nc.phone && nc.phone.trim() !== '') {
            const phoneDigits = nc.phone.replace(/\D/g, '');
            if (phoneDigits.length !== 10) {
                addToast('Phone number must be exactly 10 digits', 'error');
                return;
            }
        }
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            if (editContact) {
                await updateContact(editContact.id, nc);
                addToast('Contact Updated Successfully!', 'success');
            } else {
                await createContact(nc);
                addToast('Contact Added Successfully!', 'success');
            }
            fetchData();
            setNc({ name: '', phone: '', city: '' });
            setShowContactForm(false);
            setEditContact(null);
        } catch (e) {
            addToast('Failed to save contact', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSaveFirm = async () => {
        if (!fc.name || fc.name.trim() === '') {
            addToast('Firm name is required', 'error');
            return;
        }
        if (fc.defaultBrokVal !== '' && fc.defaultBrokVal !== null && parseFloat(fc.defaultBrokVal) < 0) {
            addToast('Brokerage value cannot be negative', 'error');
            return;
        }
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            const payload = {
                name: fc.name,
                defaultBrokType: fc.defaultBrokType,
                defaultBrokVal: fc.defaultBrokVal === '' || fc.defaultBrokVal === null || fc.defaultBrokVal === undefined ? null : parseFloat(fc.defaultBrokVal)
            };
            if (editFirm) {
                await updateFirm(editFirm.id, payload);
                addToast('Firm Updated Successfully!', 'success');
            } else {
                await createFirm({ ...payload, contact: { id: selectedContact.id } });
                addToast('Firm Added Successfully!', 'success');
            }
            fetchData();
            setFc({ name: '', defaultBrokType: 'PERCENT', defaultBrokVal: '' });
            setShowFirmForm(false);
            setEditFirm(null);
        } catch (e) {
            addToast('Failed to save firm', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteContact = (id) => {
        setConfirmDialog({
            isOpen: true,
            type: 'contact',
            id: id,
            title: 'Delete Contact',
            message: 'Are you sure you want to delete this contact? This will delete all its linked firms if they have no active transactions.'
        });
    };

    const handleDeleteFirm = (e, id) => {
        e.stopPropagation();
        setConfirmDialog({
            isOpen: true,
            type: 'firm',
            id: id,
            title: 'Delete Firm',
            message: 'Are you sure you want to delete this firm?'
        });
    };

    const executeDelete = async () => {
        const { type, id } = confirmDialog;
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        try {
            if (type === 'contact') {
                await deleteContact(id);
                addToast('Contact Deleted Successfully!', 'success');
            } else if (type === 'firm') {
                await deleteFirm(id);
                addToast('Firm Deleted Successfully!', 'success');
            }
            fetchData();
        } catch (e) {
            addToast(e.response?.data?.message || `Failed to delete ${type}`, 'error');
        }
    };

    const openEditContact = (c) => {
        setEditContact(c);
        setNc({ name: c.name, phone: c.phone || '', city: c.city || '' });
        setShowContactForm(true);
    };

    const openEditFirm = (f) => {
        setEditFirm(f);
        setFc({ name: f.name, defaultBrokType: f.defaultBrokType || 'PERCENT', defaultBrokVal: f.defaultBrokVal !== null && f.defaultBrokVal !== undefined ? f.defaultBrokVal : '' });
        setShowFirmForm(true);
    };

    const filteredContacts = contacts.filter(c => {
        const q = searchQuery.toLowerCase();
        return c.name.toLowerCase().includes(q) || 
               (c.phone && c.phone.toLowerCase().includes(q)) || 
               (c.city && c.city.toLowerCase().includes(q));
    });

    return (
        <div className="max-w-5xl mx-auto p-4 py-8">
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <h1 className="text-3xl font-bold text-primary tracking-tight">{t('Directory', 'डायरेक्टरी')}</h1>
                <div className="flex w-full md:w-auto gap-4 items-center">
                    <div className="relative flex-1 md:w-64">
                        <input 
                            type="text" 
                            placeholder={t('Search names, city, phone...', 'नाम, शहर, फ़ोन खोजें...')} 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-4 pr-10 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm outline-none"
                        />
                        <div className="absolute right-3 top-2.5 text-gray-400">
                            🔍
                        </div>
                    </div>
                    <button onClick={() => { setEditContact(null); setNc({ name: '', phone: '', city: '' }); setShowContactForm(true); }} className="bg-primary hover:bg-red-800 transition-colors text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-md whitespace-nowrap">
                        {t('+ Add New Party', '+ नई पार्टी जोड़ें')}
                    </button>
                </div>
            </div>

            {showContactForm && (
                <div className="bg-white border border-gray-100 rounded-xl shadow-xl p-6 mb-8 border-t-4 border-t-primary animate-slide-in relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary opacity-5 rounded-bl-full"></div>
                    <h3 className="font-bold text-primary mb-5 uppercase tracking-wide text-lg">{editContact ? t('Edit Contact Person', 'संपर्क संपादित करें') : t('Add New Contact Person', 'नया संपर्क व्यक्ति जोड़ें')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-5 relative z-10">
                        <input type="text" placeholder="Name *" value={nc.name} onChange={e => setNc({...nc, name: e.target.value})} className="border-2 border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all" />
                        <input type="text" placeholder="Phone" value={nc.phone} onChange={e => setNc({...nc, phone: e.target.value})} className="border-2 border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all" />
                        <input type="text" placeholder="City" value={nc.city} onChange={e => setNc({...nc, city: e.target.value})} className="border-2 border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all" />
                        <button onClick={handleSaveContact} className="bg-primary text-white font-bold px-4 py-2.5 rounded-lg shadow-md hover:bg-red-800 transition-colors">{t('Save Contact', 'संपर्क सहेजें')}</button>
                    </div>
                    <button onClick={() => { setShowContactForm(false); setEditContact(null); }} className="text-sm font-semibold text-textMuted hover:text-primary transition-colors underline relative z-10">{t('Cancel', 'रद्द करें')}</button>
                </div>
            )}

            {showFirmForm && (
                <div className="bg-yellow-50 border border-yellow-100 rounded-xl shadow-xl p-6 mb-8 border-t-4 border-t-secondary animate-slide-in relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-secondary opacity-10 rounded-bl-full"></div>
                    <h3 className="font-bold text-secondary mb-5 uppercase tracking-wide text-lg">{editFirm ? t('Edit Firm', 'फर्म संपादित करें') : t('Add Firm for', 'फर्म जोड़ें')} <span className="text-primary">{selectedContact?.name}</span></h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-5 relative z-10">
                        <input type="text" placeholder="Firm Name *" value={fc.name} onChange={e => setFc({...fc, name: e.target.value})} className="border-2 border-yellow-200 p-2.5 rounded-lg focus:ring-2 focus:ring-secondary outline-none transition-all md:col-span-2 bg-white" />
                        <select value={fc.defaultBrokType} onChange={e => setFc({...fc, defaultBrokType: e.target.value})} className="border-2 border-yellow-200 p-2.5 rounded-lg focus:ring-2 focus:ring-secondary outline-none transition-all bg-white font-bold text-textMain">
                            <option value="PERCENT">% Percent</option>
                            <option value="FIXED">₹ Fixed/Qtl</option>
                        </select>
                        <input type="number" placeholder="Default Rate" value={fc.defaultBrokVal} onChange={e => setFc({...fc, defaultBrokVal: e.target.value})} step="0.01" min="0" className="border-2 border-yellow-200 p-2.5 rounded-lg focus:ring-2 focus:ring-secondary outline-none transition-all bg-white font-bold" />
                    </div>
                    <div className="flex gap-4 relative z-10">
                        <button onClick={handleSaveFirm} className="bg-secondary hover:bg-yellow-600 text-white font-bold px-8 py-2.5 rounded-lg shadow-md transition-colors">{t('Save Firm', 'फर्म सहेजें')}</button>
                        <button onClick={() => { setShowFirmForm(false); setEditFirm(null); }} className="text-sm font-semibold text-textMuted hover:text-secondary transition-colors underline px-4 py-2.5">{t('Cancel', 'रद्द करें')}</button>
                    </div>
                </div>
            )}

            {filteredContacts.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-dashed border-gray-300">
                    <div className="text-4xl mb-3 opacity-50">🔍</div>
                    <h3 className="text-lg font-bold text-textMain">{t('No Parties Found', 'कोई पार्टी नहीं मिली')}</h3>
                    <p className="text-textMuted mt-1">{t('Try adjusting your search query', 'अपनी खोज बदलें')}</p>
                </div>
            ) : (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-2">
                    {filteredContacts.map(c => (
                        <div key={c.id} className="bg-white p-5 rounded-xl shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 border border-gray-100 group relative overflow-hidden">
                            <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-primary to-secondary opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="flex justify-between items-start mb-3 pl-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-xl text-textMain group-hover:text-primary transition-colors">{c.name}</h3>
                                        <button onClick={() => openEditContact(c)} className="text-gray-300 hover:text-primary transition-colors text-xs" title="Edit Contact">✏️</button>
                                        <button onClick={() => handleDeleteContact(c.id)} className="text-gray-300 hover:text-red-600 transition-colors text-xs" title="Delete Contact">🗑️</button>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-sm font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded flex items-center gap-1">📞 {c.phone || 'N/A'}</span>
                                        <span className="text-sm font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded flex items-center gap-1">📍 {c.city || 'N/A'}</span>
                                    </div>
                                </div>
                                <button onClick={() => { setSelectedContact(c); setEditFirm(null); setFc({ name: '', defaultBrokType: 'PERCENT', defaultBrokVal: '' }); setShowFirmForm(true); }} className="text-xs bg-white text-primary hover:bg-primary hover:text-white px-3 py-1.5 rounded-md font-bold border-2 border-primary transition-colors shadow-sm whitespace-nowrap">
                                    {t('+ Add Firm', '+ फर्म जोड़ें')}
                                </button>
                            </div>
                            <div className="mt-4 pt-3 border-t border-gray-50 pl-2">
                                <p className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">Linked Firms</p>
                                <div className="flex flex-wrap gap-2">
                                    {firms.filter(f => f.contact?.id === c.id).map(f => (
                                        <span key={f.id} className="inline-flex items-center gap-1 bg-yellow-50 text-secondary text-xs font-bold px-2.5 py-1 rounded-md border border-yellow-200 shadow-sm group/firm hover:border-secondary transition-colors cursor-pointer" onClick={() => { setSelectedContact(c); openEditFirm(f); }} title="Click to edit firm">
                                            {f.name} {f.defaultBrokVal !== null && f.defaultBrokVal !== undefined && f.defaultBrokVal !== '' && parseFloat(f.defaultBrokVal) > 0 ? (
                                                <span className="opacity-75 font-medium ml-1">({f.defaultBrokVal} {f.defaultBrokType === 'PERCENT' ? '%' : '₹/Qtl'})</span>
                                            ) : null}
                                            <span className="opacity-0 group-hover/firm:opacity-100 transition-opacity ml-1 text-[10px]">✏️</span>
                                            <button onClick={(e) => handleDeleteFirm(e, f.id)} className="text-gray-400 hover:text-red-500 font-bold ml-1 text-[10px]" title="Delete Firm">×</button>
                                        </span>
                                    ))}
                                    {firms.filter(f => f.contact?.id === c.id).length === 0 && (
                                        <span className="text-xs italic text-gray-400">No firms linked</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ConfirmModal 
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={executeDelete}
                onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
            />
        </div>
    );
};

export default Parties;
