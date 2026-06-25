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

    const [nc, setNc] = useState({ name: '', phone: '', city: '', defaultBrokType: 'PERCENT', defaultBrokVal: '' });
    const [fc, setFc] = useState({ name: '' });

    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: '', id: null, title: '', message: '' });

    const fetchData = async () => {
        setIsLoadingData(true);
        try {
            const [c, f] = await Promise.all([getContacts(), getFirms()]);
            setContacts(c);
            setFirms(f);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingData(false);
        }
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
            const payload = {
                name: nc.name,
                phone: nc.phone,
                city: nc.city,
                defaultBrokType: nc.defaultBrokType,
                defaultBrokVal: nc.defaultBrokVal === '' || nc.defaultBrokVal === null || nc.defaultBrokVal === undefined ? null : parseFloat(nc.defaultBrokVal)
            };
            if (editContact) {
                await updateContact(editContact.id, payload);
                addToast('Contact Updated Successfully!', 'success');
            } else {
                await createContact(payload);
                addToast('Contact Added Successfully!', 'success');
            }
            fetchData();
            setNc({ name: '', phone: '', city: '', defaultBrokType: 'PERCENT', defaultBrokVal: '' });
            setShowContactForm(false);
            setEditContact(null);
        } catch (err) {
            const errMsg = err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : 'Failed to save contact');
            addToast(errMsg, 'error');
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
                name: fc.name
            };
            if (editFirm) {
                await updateFirm(editFirm.id, payload);
                addToast('Firm Updated Successfully!', 'success');
            } else {
                await createFirm({ ...payload, contact: { id: selectedContact.id } });
                addToast('Firm Added Successfully!', 'success');
            }
            fetchData();
            setFc({ name: '' });
            setShowFirmForm(false);
            setEditFirm(null);
        } catch (err) {
            const errMsg = err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : 'Failed to save firm');
            addToast(errMsg, 'error');
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
        setNc({ name: c.name, phone: c.phone || '', city: c.city || '', defaultBrokType: c.defaultBrokType || 'PERCENT', defaultBrokVal: c.defaultBrokVal !== null && c.defaultBrokVal !== undefined ? c.defaultBrokVal : '' });
        setShowContactForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const openEditFirm = (f) => {
        setEditFirm(f);
        setFc({ name: f.name });
        setShowFirmForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const filteredContacts = contacts.filter(c => {
        const q = searchQuery.toLowerCase();
        return c.name.toLowerCase().includes(q) || 
               (c.phone && c.phone.toLowerCase().includes(q)) || 
               (c.city && c.city.toLowerCase().includes(q));
    });

    return (
        <div className="max-w-5xl mx-auto p-4 py-8">
            <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.16em] text-primary mb-2">
                        <span className="w-6 h-px bg-primary/50"></span>{t('Contacts', 'संपर्क')}
                    </div>
                    <h1 className="text-2xl sm:text-[32px] font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        <span className="text-3xl sm:text-4xl text-primary">👥</span> {t('Directory', 'डायरेक्टरी')}
                    </h1>
                </div>
                <div className="flex w-full sm:w-auto gap-3 sm:gap-4 items-center">
                    <div className="relative flex-1 sm:w-64">
                        <input 
                            type="text" 
                            placeholder={t('Search names, city, phone...', 'नाम, शहर, फ़ोन खोजें...')} 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-4 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm outline-none font-medium"
                        />
                        <div className="absolute right-4 top-3.5 text-gray-400">
                            🔍
                        </div>
                    </div>
                    <button data-testid="add-new-party-btn" onClick={() => { setEditContact(null); setNc({ name: '', phone: '', city: '', defaultBrokType: 'PERCENT', defaultBrokVal: '' }); setShowContactForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="bg-gradient-to-tr from-primary to-red-600 shadow-lg shadow-red-900/30 hover:shadow-xl hover:-translate-y-1 transition-all text-white px-5 sm:px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap">
                        {t('+ Add New Party', '+ नई पार्टी जोड़ें')}
                    </button>
                </div>
            </div>

            {showContactForm && (
                <div className="modal-overlay">
                    <div className="modal-content border-t-4 border-t-primary animate-slide-in relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary opacity-5 rounded-bl-full pointer-events-none"></div>
                        <h3 className="font-bold text-primary mb-5 uppercase tracking-wide text-lg">{editContact ? t('Edit Contact Person', 'संपर्क संपादित करें') : t('Add New Contact Person', 'नया संपर्क व्यक्ति जोड़ें')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-5 mb-5 relative z-10">
                            <input type="text" placeholder={t('Name *', 'नाम *')} value={nc.name} onChange={e => setNc({...nc, name: e.target.value})} className="border-2 border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all md:col-span-2" />
                            <input type="text" placeholder={t('Phone', 'फ़ोन')} value={nc.phone} onChange={e => setNc({...nc, phone: e.target.value})} className="border-2 border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all" />
                            <input type="text" placeholder={t('City', 'शहर')} value={nc.city} onChange={e => setNc({...nc, city: e.target.value})} className="border-2 border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all" />
                            <div className="md:col-span-1 border-2 border-gray-200 rounded-lg overflow-hidden flex flex-col justify-center">
                                <select value={nc.defaultBrokType} onChange={e => setNc({...nc, defaultBrokType: e.target.value})} className="w-full bg-white p-2 text-xs font-bold text-textMain outline-none border-b border-gray-200">
                                    <option value="PERCENT">% Percent</option>
                                    <option value="FIXED">₹ Fixed/Qtl</option>
                                </select>
                                <input type="number" placeholder={t('Default Brokerage', 'डिफ़ॉल्ट दलाली')} value={nc.defaultBrokVal} onChange={e => setNc({...nc, defaultBrokVal: e.target.value})} step="0.01" min="0" className="w-full bg-white p-2 text-sm font-bold text-textMain outline-none" />
                            </div>
                        </div>
                        <div className="flex gap-4 relative z-10 items-center">
                            <button data-testid="save-contact-btn" onClick={handleSaveContact} className="bg-primary text-white font-bold px-8 py-2.5 rounded-lg shadow-md hover:bg-red-800 transition-colors">{t('Save Contact', 'संपर्क सहेजें')}</button>
                            <button onClick={() => { setShowContactForm(false); setEditContact(null); }} className="text-sm font-semibold text-textMuted hover:text-primary transition-colors underline">{t('Cancel', 'रद्द करें')}</button>
                        </div>
                    </div>
                </div>
            )}

            {showFirmForm && (
                <div className="modal-overlay">
                    <div className="modal-content bg-yellow-50 border border-yellow-100 border-t-4 border-t-secondary animate-slide-in relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-secondary opacity-10 rounded-bl-full pointer-events-none"></div>
                        <h3 className="font-bold text-secondary mb-5 uppercase tracking-wide text-lg">{editFirm ? t('Edit Firm', 'फर्म संपादित करें') : t('Add Firm for', 'फर्म जोड़ें')} <span className="text-primary">{selectedContact?.name}</span></h3>
                        <div className="mb-5 relative z-10">
                            <input type="text" placeholder={t('Firm Name *', 'फर्म का नाम *')} value={fc.name} onChange={e => setFc({...fc, name: e.target.value})} className="border-2 border-yellow-200 p-2.5 rounded-lg focus:ring-2 focus:ring-secondary outline-none transition-all w-full bg-white" />
                        </div>
                        <div className="flex gap-4 relative z-10">
                            <button data-testid="save-firm-btn" onClick={handleSaveFirm} className="bg-secondary hover:bg-yellow-600 text-white font-bold px-8 py-2.5 rounded-lg shadow-md transition-colors">{t('Save Firm', 'फर्म सहेजें')}</button>
                            <button onClick={() => { setShowFirmForm(false); setEditFirm(null); }} className="text-sm font-semibold text-textMuted hover:text-secondary transition-colors underline px-4 py-2.5">{t('Cancel', 'रद्द करें')}</button>
                        </div>
                    </div>
                </div>
            )}

            {isLoadingData ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mb-4"></div>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">{t('Loading directory...', 'लोड हो रहा है...')}</p>
                </div>
            ) : filteredContacts.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-dashed border-gray-300">
                    <div className="text-4xl mb-3 opacity-50">🔍</div>
                    <h3 className="text-lg font-bold text-gray-900">{t('No Parties Found', 'कोई पार्टी नहीं मिली')}</h3>
                    <p className="text-gray-400 mt-1">{t('Try adjusting your search query', 'अपनी खोज बदलें')}</p>
                </div>
            ) : (
                <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-2 bg-gray-50/50 sm:bg-transparent p-3 sm:p-0 rounded-3xl sm:rounded-none">
                    {filteredContacts.map(c => (
                        <div key={c.id} className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 group relative overflow-hidden">
                            <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-primary to-secondary"></div>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 pl-2">
                                <div className="w-full sm:w-auto">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-extrabold text-xl text-gray-900 group-hover:text-primary transition-colors">{c.name}</h3>
                                        <button onClick={() => openEditContact(c)} className="text-gray-300 hover:text-primary transition-colors text-xs p-1" title="Edit Contact">✏️</button>
                                        <button onClick={() => handleDeleteContact(c.id)} className="text-gray-300 hover:text-red-600 transition-colors text-xs p-1" title="Delete Contact">🗑️</button>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[11px] font-bold text-gray-600 bg-gray-50 px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm border border-gray-200">📞 {c.phone || 'N/A'}</span>
                                        <span className="text-[11px] font-bold text-gray-600 bg-gray-50 px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm border border-gray-200">📍 {c.city || 'N/A'}</span>
                                        {c.defaultBrokVal !== null && c.defaultBrokVal !== undefined && c.defaultBrokVal !== '' && parseFloat(c.defaultBrokVal) > 0 ? (
                                            <span className="text-[11px] font-extrabold text-primary bg-red-50 border border-red-200 px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm">
                                                💰 {c.defaultBrokVal} {c.defaultBrokType === 'PERCENT' ? '%' : '₹/Qtl'}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                                <button data-testid="add-firm-btn" onClick={() => { setSelectedContact(c); setEditFirm(null); setFc({ name: '' }); setShowFirmForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="w-full sm:w-auto text-xs bg-white text-primary hover:bg-primary hover:text-white px-4 py-2.5 rounded-xl font-bold border-2 border-primary transition-all shadow-sm whitespace-nowrap text-center">
                                    {t('+ Add Firm', '+ फर्म जोड़ें')}
                                </button>
                            </div>
                            <div className="mt-2 pt-4 border-t border-gray-100 pl-2">
                                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-3">{t('Linked Firms', 'जुड़ी हुई फर्में')}</p>
                                <div className="flex flex-wrap gap-2">
                                    {firms.filter(f => f.contact?.id === c.id).map(f => (
                                        <span key={f.id} className="inline-flex items-center gap-1 bg-white text-secondary text-[11px] font-bold px-3 py-1.5 rounded-lg border border-yellow-200 shadow-sm group/firm hover:border-secondary hover:bg-yellow-50 transition-colors cursor-pointer" onClick={() => { setSelectedContact(c); openEditFirm(f); }} title={t('Click to edit firm', 'फर्म को संपादित करने के लिए क्लिक करें')}>
                                            {f.name}
                                            <span className="opacity-0 group-hover/firm:opacity-100 transition-opacity ml-1 text-[10px]">✏️</span>
                                            <button onClick={(e) => handleDeleteFirm(e, f.id)} className="text-gray-400 hover:text-red-500 font-bold ml-1 text-[10px]" title={t('Delete Firm', 'फर्म मिटाएं')}>×</button>
                                        </span>
                                    ))}
                                    {firms.filter(f => f.contact?.id === c.id).length === 0 && (
                                        <span className="text-xs italic text-gray-400">{t('No firms linked', 'कोई फर्म नहीं जुड़ी है')}</span>
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
