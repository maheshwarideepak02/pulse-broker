import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const { toggleLang, lang, t } = useLanguage();
    const navigate = useNavigate();

    const doLogin = (e) => {
        e.preventDefault();
        navigate('/app/dashboard');
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative bg-background">
            <div className="absolute top-4 right-4 z-50">
                <button 
                    onClick={toggleLang} 
                    className="bg-white text-primary border-2 border-primary hover:bg-gray-50 px-4 py-2 rounded-full font-bold shadow-md transition-colors text-sm"
                >
                    {lang === 'en' ? 'अ / A (Switch to Hindi)' : 'A / अ (Switch to English)'}
                </button>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full border-t-8 border-primary">
                <div className="text-center mb-8">
                    <h2 className="text-secondary font-bold text-lg mb-1">ॐ</h2>
                    <h1 className="text-3xl font-bold text-primary">{t('Pulse Broker', 'पल्स ब्रोकर')}</h1>
                </div>
                <form onSubmit={doLogin}>
                    <button type="submit" className="w-full bg-primary hover:bg-red-800 text-white font-bold py-3.5 rounded-md transition-all shadow-md text-lg">
                        {t('Secure Login', 'सुरक्षित लॉगिन')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
