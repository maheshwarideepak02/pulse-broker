import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { checkAuthStatus, setupApp, loginApp } from '../api';

const Login = () => {
    const { toggleLang, lang, t } = useLanguage();
    const navigate = useNavigate();
    const { login } = useAuth();

    const [inputPin, setInputPin] = useState('');
    const [isSetupMode, setIsSetupMode] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkAuthStatus().then(data => {
            setIsSetupMode(!data.isSetup);
        }).catch(err => {
            console.error("Auth check failed:", err);
            setError("Server connection failed");
        }).finally(() => {
            setIsLoading(false);
        });
    }, []);

    const handlePinPress = (digit) => {
        if (inputPin.length < 4) {
            const newPin = inputPin + digit;
            setInputPin(newPin);
            setError('');

            if (newPin.length === 4) {
                processPin(newPin);
            }
        }
    };

    const handleDelete = () => {
        setInputPin(inputPin.slice(0, -1));
        setError('');
    };

    const processPin = async (pinStr) => {
        setIsLoading(true);
        try {
            if (isSetupMode) {
                const masterSecret = window.prompt(lang === 'en' ? "Enter Server Master Secret to authorize setup:" : "सेटअप को अधिकृत करने के लिए सर्वर मास्टर सीक्रेट दर्ज करें:");
                if (!masterSecret) {
                    setInputPin('');
                    setIsLoading(false);
                    return;
                }
                const res = await setupApp({ pin: pinStr, masterSecret });
                localStorage.setItem('pulse_auth_token', res.token);
                login();
                navigate('/app/dashboard');
            } else {
                const res = await loginApp({ pin: pinStr });
                localStorage.setItem('pulse_auth_token', res.token);
                login();
                navigate('/app/dashboard');
            }
        } catch (e) {
            setError(e.response?.data?.message || t('Incorrect PIN', 'गलत पिन'));
            setTimeout(() => setInputPin(''), 500);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        alert(lang === 'en' ? "To reset the PIN, please clear the APP_PIN_KEY from the database manually for security reasons." : "सुरक्षा कारणों से पिन रीसेट करने के लिए कृपया डेटाबेस से APP_PIN_KEY मैन्युअल रूप से हटाएं।");
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative bg-gradient-to-br from-red-50 via-white to-orange-50">
            <div className="absolute top-4 right-4 z-50">
                <button 
                    onClick={toggleLang} 
                    className="bg-white text-primary border-2 border-primary hover:bg-gray-50 px-4 py-2 rounded-full font-bold shadow-md transition-colors text-sm"
                >
                    {lang === 'en' ? 'अ / A (Switch to Hindi)' : 'A / अ (Switch to English)'}
                </button>
            </div>
            
            <div className="text-center mb-8 animate-fade-in">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg border-4 border-white">
                    <span className="text-white font-bold text-4xl">ॐ</span>
                </div>
                <h1 className="text-3xl font-bold text-primary">{t('Pulse Broker', 'पल्स ब्रोकर')}</h1>
                <p className="text-gray-500 font-medium mt-2">
                    {isSetupMode ? t('Create a 4-digit PIN', '4-अंकों का पिन सेट करें') : t('Enter your 4-digit PIN', 'अपना 4-अंकों का पिन दर्ज करें')}
                </p>
            </div>

            <div className="w-full max-w-xs animate-slide-in">
                {/* PIN Dots */}
                <div className="flex justify-center gap-4 mb-8">
                    {[0, 1, 2, 3].map(i => (
                        <div 
                            key={i} 
                            className={`w-4 h-4 rounded-full transition-all duration-300 ${inputPin.length > i ? 'bg-primary scale-110' : 'bg-gray-300'}`}
                        />
                    ))}
                </div>

                {/* Error Message */}
                <div className="h-6 text-center mb-4">
                    {error && <p className="text-red-500 font-bold animate-pulse">{error}</p>}
                </div>

                {/* Number Pad */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button 
                            key={num}
                            onClick={() => handlePinPress(num.toString())}
                            className="bg-white hover:bg-red-50 hover:text-primary hover:border-red-200 text-gray-800 text-2xl font-extrabold py-5 rounded-2xl shadow-sm border border-gray-100 active:scale-95 transition-all"
                        >
                            {num}
                        </button>
                    ))}
                    <div></div>
                    <button 
                        onClick={() => handlePinPress('0')}
                        className="bg-white hover:bg-red-50 hover:text-primary hover:border-red-200 text-gray-800 text-2xl font-extrabold py-5 rounded-2xl shadow-sm border border-gray-100 active:scale-95 transition-all"
                    >
                        0
                    </button>
                    <button 
                        onClick={handleDelete}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xl font-bold py-5 rounded-2xl shadow-sm active:scale-95 transition-all"
                    >
                        ⌫
                    </button>
                </div>

                {!isSetupMode && (
                    <div className="text-center mt-8">
                        <button onClick={handleReset} className="text-sm font-bold text-gray-400 hover:text-primary transition-colors underline">
                            {t('Reset PIN', 'पिन रीसेट करें')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Login;
