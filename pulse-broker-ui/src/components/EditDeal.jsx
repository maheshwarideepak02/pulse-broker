import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { updateDeal, getDeal } from '../api';
import DealForm from './DealForm';

const EditDeal = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useLanguage();
    const { addToast } = useToast();
    const [deal, setDeal] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        getDeal(id).then(data => {
            if (data) {
                setDeal(data);
            } else {
                addToast('Deal not found', 'error');
                navigate('/app/dashboard');
            }
        }).catch(err => {
            console.error(err);
            addToast('Failed to load deal', 'error');
            navigate('/app/dashboard');
        }).finally(() => {
            setIsLoading(false);
        });
    }, [id, navigate, addToast]);

    const handleUpdate = async (dealData) => {
        setIsProcessing(true);
        try {
            await updateDeal(id, dealData);
            addToast('Deal Updated Successfully!', 'success');
            // Navigate back to the page they likely came from
            if (dealData.status === 'PENDING' || dealData.status === 'OPEN_UNASSIGNED') {
                setTimeout(() => { navigate('/app/pending'); }, 1000);
            } else {
                setTimeout(() => { navigate('/app/dashboard'); }, 1000);
            }
        } catch (err) {
            console.error(err);
            const errMsg = err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : 'Failed to update deal');
            addToast(errMsg, 'error');
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col items-center justify-center min-h-[50vh]">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">{t('Loading Deal...', 'सौदा लोड हो रहा है...')}</p>
            </div>
        );
    }

    if (!deal) return null;

    return (
        <DealForm 
            initialData={deal}
            onSubmit={handleUpdate}
            isProcessing={isProcessing}
            title={t('Edit Existing Deal', 'मौजूदा सौदे को संपादित करें')}
            buttonText={t('Save Changes', 'परिवर्तन सहेजें')}
        />
    );
};

export default EditDeal;
