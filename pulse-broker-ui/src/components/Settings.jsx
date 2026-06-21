import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { getItems, getMarkas, createItem, createMarka, updateItem, updateMarka, deleteItem, deleteMarka } from '../api';
import ConfirmModal from './ConfirmModal';
import PromptModal from './PromptModal';

const Settings = () => {
    const { t } = useLanguage();
    const { addToast } = useToast();
    const [items, setItems] = useState([]);
    const [markas, setMarkas] = useState([]);
    const [newItem, setNewItem] = useState('');
    const [newMarka, setNewMarka] = useState('');

    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);

    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: '', id: null, title: '', message: '' });
    const [editDialog, setEditDialog] = useState({ isOpen: false, type: '', id: null, name: '' });

    const fetchData = async () => {
        setIsLoadingData(true);
        try {
            const [i, m] = await Promise.all([getItems(), getMarkas()]);
            setItems(i);
            setMarkas(m);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingData(false);
        }
    }

    useEffect(() => {
        fetchData();
    }, []);

    const handleSaveItem = async () => {
        if (!newItem || newItem.trim() === '') {
            addToast('Item name is required', 'error');
            return;
        }
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            await createItem({ name: newItem });
            addToast('Item Added Successfully!', 'success');
            fetchData();
            setNewItem('');
        } catch {
            addToast('Failed to save item', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEditItem = (item) => setEditDialog({ isOpen: true, type: 'item', id: item.id, name: item.name });

    const handleSaveMarka = async () => {
        if (!newMarka || newMarka.trim() === '') {
            addToast('Marka name is required', 'error');
            return;
        }
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            await createMarka({ name: newMarka });
            addToast('Marka Added Successfully!', 'success');
            fetchData();
            setNewMarka('');
        } catch {
            addToast('Failed to save marka', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEditMarka = (marka) => setEditDialog({ isOpen: true, type: 'marka', id: marka.id, name: marka.name });

    const executeEdit = async (newName) => {
        if (!newName || newName.trim() === '') {
            addToast(t('Name is required', 'नाम आवश्यक है'), 'error');
            return;
        }
        if (newName === editDialog.name) {
            setEditDialog({ isOpen: false, type: '', id: null, name: '' });
            return;
        }
        setIsProcessing(true);
        try {
            if (editDialog.type === 'item') await updateItem(editDialog.id, { name: newName });
            else await updateMarka(editDialog.id, { name: newName });
            addToast(t('Updated successfully!', 'सफलतापूर्वक अपडेट किया गया!'), 'success');
            setEditDialog({ isOpen: false, type: '', id: null, name: '' });
            fetchData();
        } catch {
            addToast(t('Failed to update', 'अपडेट नहीं हो सका'), 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteItem = (id) => {
        setConfirmDialog({
            isOpen: true,
            type: 'item',
            id: id,
            title: t('Delete Item', 'आइटम मिटाएं'),
            message: t('Are you sure you want to delete this item?', 'क्या आप वाकई इस आइटम को मिटाना चाहते हैं?')
        });
    };

    const handleDeleteMarka = (id) => {
        setConfirmDialog({
            isOpen: true,
            type: 'marka',
            id: id,
            title: t('Delete Marka', 'मार्का मिटाएं'),
            message: t('Are you sure you want to delete this marka?', 'क्या आप वाकई इस मार्का को मिटाना चाहते हैं?')
        });
    };

    const executeDelete = async () => {
        const { type, id } = confirmDialog;
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        try {
            if (type === 'item') {
                await deleteItem(id);
                addToast('Item Deleted Successfully!', 'success');
            } else if (type === 'marka') {
                await deleteMarka(id);
                addToast('Marka Deleted Successfully!', 'success');
            }
            fetchData();
        } catch (e) {
            addToast(e.response?.data?.message || `Failed to delete ${type}`, 'error');
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-4 py-8">
            <div className="mb-6 sm:mb-8">
                <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.16em] text-primary mb-2">
                    <span className="w-6 h-px bg-primary/50"></span>{t('Configuration', 'कॉन्फ़िगरेशन')}
                </div>
                <h1 className="text-2xl sm:text-[32px] font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                    <span className="text-3xl sm:text-4xl text-primary">⚙️</span> {t('Settings & Master Data', 'सेटिंग्स और मास्टर डेटा')}
                </h1>
            </div>
            
            <div className="bg-white border border-gray-100 rounded-2xl shadow-xl p-5 sm:p-6 mb-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary opacity-5 rounded-bl-full pointer-events-none"></div>
                <h2 className="text-xl font-bold text-textMain mb-4 flex items-center gap-2"><span className="text-primary">🌾</span> {t('Manage Pulse Categories (Items)', 'आइटम प्रबंधित करें')}</h2>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 relative z-10">
                    <input type="text" value={newItem} onChange={e => setNewItem(e.target.value)} placeholder={t("Item Name (e.g. Masoor, Toor)", "आइटम का नाम (उदा. मसूर, तूर)")} className="border-2 border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all w-full sm:w-64" />
                    <button onClick={handleSaveItem} disabled={isProcessing} className={`transition-colors text-white font-bold px-5 py-2.5 rounded-lg shadow-md w-full sm:w-auto ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-red-800'}`}>
                        {isProcessing ? t('Saving...', 'सहेजा जा रहा है...') : t('+ Add Item', '+ आइटम जोड़ें')}
                    </button>
                </div>
                {isLoadingData ? (
                    <div className="flex justify-center py-6">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-primary"></div>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-3 relative z-10">
                        {items.map(i => (
                            <span key={i.id} className="bg-gray-50 hover:bg-red-50 hover:border-primary transition-colors border border-gray-200 pl-3 pr-1 py-1 rounded-xl font-bold text-gray-700 group inline-flex items-center gap-1">
                                <button onClick={() => handleEditItem(i)} className="min-h-9 rounded-lg px-1 text-left hover:text-primary" aria-label={`${t('Edit', 'संपादित करें')} ${i.name}`}>{i.name}</button>
                                <button onClick={() => handleDeleteItem(i.id)} className="grid h-9 w-9 place-items-center rounded-lg text-gray-400 hover:bg-red-100 hover:text-red-600" aria-label={`${t('Delete', 'मिटाएं')} ${i.name}`}>×</button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-white border border-yellow-100 rounded-2xl shadow-xl p-5 sm:p-6 mb-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-secondary"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-secondary opacity-10 rounded-bl-full pointer-events-none"></div>
                <h2 className="text-xl font-bold text-textMain mb-4 flex items-center gap-2"><span className="text-secondary">🏷️</span> {t('Manage Marka (Brands)', 'मार्का प्रबंधित करें')}</h2>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 relative z-10">
                    <input type="text" value={newMarka} onChange={e => setNewMarka(e.target.value)} placeholder={t("Marka Name (e.g. Navkar)", "मार्का का नाम (उदा. नवकार)")} className="border-2 border-yellow-200 p-2.5 rounded-lg focus:ring-2 focus:ring-secondary outline-none transition-all w-full sm:w-64 bg-white" />
                    <button onClick={handleSaveMarka} disabled={isProcessing} className={`transition-colors text-white font-bold px-5 py-2.5 rounded-lg shadow-md w-full sm:w-auto ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-secondary hover:bg-yellow-600'}`}>
                        {isProcessing ? t('Saving...', 'सहेजा जा रहा है...') : t('+ Add Marka', '+ मार्का जोड़ें')}
                    </button>
                </div>
                {isLoadingData ? (
                    <div className="flex justify-center py-6">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-secondary"></div>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-3 relative z-10">
                        {markas.map(m => (
                            <span key={m.id} className="bg-white hover:bg-yellow-50 hover:border-secondary transition-colors border border-yellow-200 text-secondary pl-3 pr-1 py-1 rounded-xl font-bold group inline-flex items-center gap-1">
                                <button onClick={() => handleEditMarka(m)} className="min-h-9 rounded-lg px-1 text-left hover:text-yellow-700" aria-label={`${t('Edit', 'संपादित करें')} ${m.name}`}>{m.name}</button>
                                <button onClick={() => handleDeleteMarka(m.id)} className="grid h-9 w-9 place-items-center rounded-lg text-gray-400 hover:bg-red-100 hover:text-red-600" aria-label={`${t('Delete', 'मिटाएं')} ${m.name}`}>×</button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <ConfirmModal 
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={executeDelete}
                onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                cancelText={t('Cancel', 'रद्द करें')}
            />
            <PromptModal
                isOpen={editDialog.isOpen}
                title={editDialog.type === 'item' ? t('Edit item', 'आइटम संपादित करें') : t('Edit marka', 'मार्का संपादित करें')}
                message={t('Update the name below. Existing records will keep their association.', 'नीचे नाम अपडेट करें। मौजूदा रिकॉर्ड जुड़े रहेंगे।')}
                inputLabel={t('Name', 'नाम')}
                defaultValue={editDialog.name}
                confirmText={t('Save changes', 'बदलाव सहेजें')}
                cancelText={t('Cancel', 'रद्द करें')}
                isBusy={isProcessing}
                onConfirm={executeEdit}
                onCancel={() => setEditDialog({ isOpen: false, type: '', id: null, name: '' })}
            />
        </div>
    );
};

export default Settings;
