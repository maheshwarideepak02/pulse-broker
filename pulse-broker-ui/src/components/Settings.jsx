import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { getItems, getMarkas, createItem, createMarka, updateItem, updateMarka, deleteItem, deleteMarka } from '../api';
import ConfirmModal from './ConfirmModal';

const Settings = () => {
    const { t } = useLanguage();
    const { addToast } = useToast();
    const [items, setItems] = useState([]);
    const [markas, setMarkas] = useState([]);
    const [newItem, setNewItem] = useState('');
    const [newMarka, setNewMarka] = useState('');

    const [isProcessing, setIsProcessing] = useState(false);

    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: '', id: null, title: '', message: '' });

    const fetchData = () => {
        getItems().then(setItems).catch(console.error);
        getMarkas().then(setMarkas).catch(console.error);
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
        } catch (e) {
            addToast('Failed to save item', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEditItem = async (item) => {
        const newName = window.prompt("Edit Item Name:", item.name);
        if (newName && newName.trim() !== '' && newName !== item.name) {
            try {
                await updateItem(item.id, { name: newName });
                addToast('Item Updated Successfully!', 'success');
                fetchData();
            } catch (e) {
                addToast('Failed to update item', 'error');
            }
        }
    };

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
        } catch (e) {
            addToast('Failed to save marka', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEditMarka = async (marka) => {
        const newName = window.prompt("Edit Marka Name:", marka.name);
        if (newName && newName.trim() !== '' && newName !== marka.name) {
            try {
                await updateMarka(marka.id, { name: newName });
                addToast('Marka Updated Successfully!', 'success');
                fetchData();
            } catch (e) {
                addToast('Failed to update marka', 'error');
            }
        }
    };

    const handleDeleteItem = (id) => {
        setConfirmDialog({
            isOpen: true,
            type: 'item',
            id: id,
            title: 'Delete Item',
            message: 'Are you sure you want to delete this item?'
        });
    };

    const handleDeleteMarka = (id) => {
        setConfirmDialog({
            isOpen: true,
            type: 'marka',
            id: id,
            title: 'Delete Marka',
            message: 'Are you sure you want to delete this marka?'
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
            <div className="mb-6"><h1 className="text-3xl font-bold text-primary tracking-tight">{t('Settings & Master Data', 'सेटिंग्स और मास्टर डेटा')}</h1></div>
            
            <div className="bg-white border border-border rounded-lg shadow-md p-6 mb-6 border-l-8 border-l-primary relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary opacity-5 rounded-bl-full pointer-events-none"></div>
                <h2 className="text-xl font-bold text-textMain mb-4 flex items-center gap-2"><span className="text-primary">🌾</span> {t('Manage Pulse Categories (Items)', 'आइटम प्रबंधित करें')}</h2>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 relative z-10">
                    <input type="text" value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Item Name (e.g. Masoor, Toor)" className="border-2 border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all w-full sm:w-64" />
                    <button onClick={handleSaveItem} disabled={isProcessing} className={`transition-colors text-white font-bold px-5 py-2.5 rounded-lg shadow-md w-full sm:w-auto ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-red-800'}`}>
                        {isProcessing ? 'Saving...' : t('+ Add Item', '+ आइटम जोड़ें')}
                    </button>
                </div>
                <div className="flex flex-wrap gap-3 relative z-10">
                    {items.map(i => (
                        <span key={i.id} title="Click to Edit" className="bg-gray-50 hover:bg-red-50 hover:border-primary transition-colors border-2 border-gray-200 px-4 py-1.5 rounded-md font-bold text-gray-700 cursor-pointer group flex items-center gap-2">
                            <span onClick={() => handleEditItem(i)}>{i.name}</span>
                            <span onClick={() => handleEditItem(i)} className="opacity-0 group-hover:opacity-100 text-xs text-primary transition-opacity">✏️</span>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(i.id); }} className="text-gray-400 hover:text-red-500 font-bold ml-1 text-xs" title="Delete Item">×</button>
                        </span>
                    ))}
                </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-100 rounded-lg shadow-md p-6 mb-6 border-l-8 border-l-secondary relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-secondary opacity-10 rounded-bl-full pointer-events-none"></div>
                <h2 className="text-xl font-bold text-textMain mb-4 flex items-center gap-2"><span className="text-secondary">🏷️</span> {t('Manage Marka (Brands)', 'मार्का प्रबंधित करें')}</h2>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 relative z-10">
                    <input type="text" value={newMarka} onChange={e => setNewMarka(e.target.value)} placeholder="Marka Name (e.g. Navkar)" className="border-2 border-yellow-200 p-2.5 rounded-lg focus:ring-2 focus:ring-secondary outline-none transition-all w-full sm:w-64 bg-white" />
                    <button onClick={handleSaveMarka} disabled={isProcessing} className={`transition-colors text-white font-bold px-5 py-2.5 rounded-lg shadow-md w-full sm:w-auto ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-secondary hover:bg-yellow-600'}`}>
                        {isProcessing ? 'Saving...' : t('+ Add Marka', '+ मार्का जोड़ें')}
                    </button>
                </div>
                <div className="flex flex-wrap gap-3 relative z-10">
                    {markas.map(m => (
                        <span key={m.id} title="Click to Edit" className="bg-white hover:bg-yellow-100 hover:border-secondary transition-colors border-2 border-yellow-200 text-secondary px-4 py-1.5 rounded-md font-bold cursor-pointer group flex items-center gap-2">
                            <span onClick={() => handleEditMarka(m)}>{m.name}</span>
                            <span onClick={() => handleEditMarka(m)} className="opacity-0 group-hover:opacity-100 text-xs text-secondary transition-opacity">✏️</span>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteMarka(m.id); }} className="text-gray-400 hover:text-red-500 font-bold ml-1 text-xs" title="Delete Marka">×</button>
                        </span>
                    ))}
                </div>
            </div>

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

export default Settings;
