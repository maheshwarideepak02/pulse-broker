import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { createDeal } from '../api';
import DealForm from './DealForm';

const NewDeal = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const { addToast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);

    const handleCreate = async (dealData) => {
        setIsProcessing(true);
        try {
            await createDeal(dealData);
            addToast('Deal Saved Successfully!', 'success');
            setTimeout(() => { navigate('/app/dashboard', { state: { sort: 'original' } }); }, 1000);
        } catch (err) {
            console.error(err);
            addToast('Failed to save deal', 'error');
            setIsProcessing(false);
        }
    };

    return (
        <DealForm 
            initialData={null}
            onSubmit={handleCreate}
            isProcessing={isProcessing}
            title={t('Enter New Deal', 'नया सौदा दर्ज करें')}
            buttonText={t('Save New Deal', 'नया सौदा सहेजें')}
        />
    );
};

export default NewDeal;
