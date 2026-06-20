import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { checkAuthStatus, setupApp, loginApp, resetApp } from '../api';
import PromptModal from './PromptModal';

const Login = () => {
    const { toggleLang, lang, t } = useLanguage();
    const navigate = useNavigate();
    const { login } = useAuth();

    const [inputPin, setInputPin] = useState('');
    const [isSetupMode, setIsSetupMode] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [secretDialog, setSecretDialog] = useState({ isOpen: false, mode: '', pin: '' });

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
                setSecretDialog({ isOpen: true, mode: 'setup', pin: pinStr });
                setIsLoading(false);
                return;
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

    const handleReset = () => setSecretDialog({ isOpen: true, mode: 'reset', pin: '' });

    const handleSecretSubmit = async (masterSecret) => {
        setIsLoading(true);
        try {
            if (secretDialog.mode === 'setup') {
                const res = await setupApp({ pin: secretDialog.pin, masterSecret });
                localStorage.setItem('pulse_auth_token', res.token);
                login();
                navigate('/app/dashboard');
            } else {
                await resetApp({ masterSecret });
                localStorage.removeItem('pulse_auth_token');
                setIsSetupMode(true);
                setInputPin('');
                setError(t('PIN reset successfully. Create a new PIN.', 'पिन रीसेट सफल रहा। नया पिन बनाएं।'));
            }
            setSecretDialog({ isOpen: false, mode: '', pin: '' });
        } catch (e) {
            setError(e.response?.data?.message || t('Incorrect master secret', 'गलत मास्टर सीक्रेट'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-[1.05fr_.95fr] bg-background relative overflow-hidden">
            <div className="hidden lg:flex relative bg-[#34161a] text-white p-14 xl:p-20 flex-col justify-between overflow-hidden">
                <div className="absolute -top-40 -right-32 w-[34rem] h-[34rem] rounded-full border-[80px] border-white/[.035]"></div>
                <div className="absolute -bottom-56 -left-40 w-[38rem] h-[38rem] rounded-full bg-secondary/[.08]"></div>
                <div className="relative z-10 flex items-center gap-3">
                    <span className="w-11 h-11 rounded-xl bg-white/10 border border-white/10 grid place-items-center text-2xl">ॐ</span>
                    <div><div className="font-extrabold text-xl tracking-tight">{t('Pulse Broker', 'पल्स ब्रोकर')}</div><div className="text-[10px] uppercase tracking-[.2em] text-white/50">Trade operations</div></div>
                </div>
                <div className="relative z-10 max-w-xl">
                    <div className="text-secondary text-xs font-bold uppercase tracking-[.22em] mb-5">Simple. Accurate. Dependable.</div>
                    <h1 className="text-4xl xl:text-5xl font-extrabold leading-[1.12] tracking-tight mb-6">{t('Your brokerage business, organised in one place.', 'आपका ब्रोकरेज व्यवसाय, एक ही जगह पर व्यवस्थित।')}</h1>
                    <p className="text-white/60 text-lg leading-relaxed max-w-lg">{t('Manage deals, loadings, brokerage and payments with confidence.', 'सौदे, लोडिंग, दलाली और भुगतान को विश्वास के साथ संभालें।')}</p>
                </div>
                <p className="relative z-10 text-xs text-white/35">Secure business workspace</p>
            </div>

            <div className="min-h-screen flex flex-col items-center justify-center p-5 sm:p-10 relative">
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
                <button 
                    onClick={toggleLang} 
                    className="bg-white text-gray-600 border border-stone-200 hover:bg-stone-50 px-4 py-2 rounded-lg font-bold shadow-sm transition-colors text-xs"
                >
                    {lang === 'en' ? 'हिंदी' : 'English'}
                </button>
            </div>

            <div className="w-full max-w-md bg-white border border-stone-200 rounded-[28px] shadow-[0_24px_70px_rgba(50,35,25,.10)] p-6 sm:p-9 animate-slide-in">
                <div className="text-center mb-7">
                    <div className="lg:hidden w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md shadow-red-900/20">
                        <span className="text-white font-bold text-2xl">ॐ</span>
                    </div>
                    <div className="text-[10px] text-secondary font-bold uppercase tracking-[.18em] mb-2">{isSetupMode ? t('First-time setup', 'पहली बार सेटअप') : t('Secure access', 'सुरक्षित प्रवेश')}</div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">{isSetupMode ? t('Create your PIN', 'अपना पिन बनाएं') : t('Welcome back', 'वापसी पर स्वागत है')}</h2>
                    <p className="text-gray-500 font-medium mt-2 text-sm">
                        {isSetupMode ? t('Choose a memorable 4-digit PIN', 'याद रहने वाला 4-अंकों का पिन चुनें') : t('Enter your 4-digit PIN to continue', 'आगे बढ़ने के लिए अपना 4-अंकों का पिन दर्ज करें')}
                    </p>
                </div>

                {/* PIN Dots */}
                <div className="flex justify-center gap-3 mb-5">
                    {[0, 1, 2, 3].map(i => (
                        <div 
                            key={i} 
                            className={`w-3 h-3 rounded-full transition-all duration-300 ${inputPin.length > i ? 'bg-primary scale-110' : 'bg-stone-200'}`}
                        />
                    ))}
                </div>

                {/* Error Message */}
                <div className="min-h-6 text-center mb-3">
                    {error && <p className="text-red-600 font-semibold text-sm">{error}</p>}
                </div>

                {/* Number Pad */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button 
                            key={num}
                            onClick={() => handlePinPress(num.toString())}
                            disabled={isLoading}
                            className="bg-stone-50 hover:bg-red-50 hover:text-primary text-gray-800 text-xl font-bold h-14 sm:h-16 rounded-xl border border-stone-200 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {num}
                        </button>
                    ))}
                    <div></div>
                    <button 
                        onClick={() => handlePinPress('0')}
                        disabled={isLoading}
                        className="bg-stone-50 hover:bg-red-50 hover:text-primary text-gray-800 text-xl font-bold h-14 sm:h-16 rounded-xl border border-stone-200 active:scale-95 transition-all disabled:opacity-50"
                    >
                        0
                    </button>
                    <button 
                        onClick={handleDelete}
                        className="bg-white hover:bg-stone-100 text-gray-500 text-lg font-bold h-14 sm:h-16 rounded-xl border border-stone-200 active:scale-95 transition-all"
                    >
                        ⌫
                    </button>
                </div>

                {!isSetupMode && (
                    <div className="text-center mt-2">
                        <button onClick={handleReset} className="text-xs font-bold text-gray-400 hover:text-primary transition-colors">
                            {t('Reset PIN', 'पिन रीसेट करें')}
                        </button>
                    </div>
                )}
                {isLoading && <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-gray-400"><span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></span>{t('Please wait…', 'कृपया प्रतीक्षा करें…')}</div>}
            </div>
            </div>
            <PromptModal
                isOpen={secretDialog.isOpen}
                title={secretDialog.mode === 'setup' ? t('Authorise setup', 'सेटअप अधिकृत करें') : t('Reset PIN', 'पिन रीसेट करें')}
                message={t('Enter the server master secret to continue securely.', 'सुरक्षित रूप से आगे बढ़ने के लिए सर्वर मास्टर सीक्रेट दर्ज करें।')}
                inputLabel={t('Master secret', 'मास्टर सीक्रेट')}
                confirmText={t('Continue', 'जारी रखें')}
                cancelText={t('Cancel', 'रद्द करें')}
                secret
                isBusy={isLoading}
                onConfirm={handleSecretSubmit}
                onCancel={() => { setSecretDialog({ isOpen: false, mode: '', pin: '' }); setInputPin(''); }}
            />
        </div>
    );
};

export default Login;
