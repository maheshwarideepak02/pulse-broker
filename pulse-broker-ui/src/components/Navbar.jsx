import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { NavLink } from 'react-router-dom';

const Navbar = () => {
    const { toggleLang, lang, t } = useLanguage();

    const navLinkClasses = ({ isActive }) =>
        `px-4 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 border-2 shadow-sm whitespace-nowrap ${
            isActive 
                ? 'bg-white text-primary border-white scale-105' 
                : 'text-white/90 border-transparent hover:bg-white/10 hover:text-white'
        }`;

    return (
        <nav className="bg-gradient-to-r from-primary to-red-900 border-b-4 border-secondary p-4 sticky top-0 z-40 shadow-lg shadow-red-900/20 overflow-x-auto custom-scrollbar">
            <div className="max-w-7xl mx-auto flex justify-between items-center min-w-max gap-8">
                <div className="font-black text-2xl text-white tracking-tight flex items-center gap-2 drop-shadow-md cursor-pointer hover:scale-105 transition-transform" onClick={() => window.location.href='/app/dashboard'}>
                    <span className="text-secondary text-2xl bg-white/10 p-1.5 rounded-lg border border-white/20 shadow-inner">ॐ</span> {t('Pulse Broker', 'पल्स ब्रोकर')}
                </div>
                <div className="flex space-x-2 items-center">
                    <NavLink to="/app/dashboard" className={navLinkClasses}>{t('Dashboard', 'डैशबोर्ड')}</NavLink>
                    <NavLink to="/app/parties" className={navLinkClasses}>{t('Parties & Firms', 'पार्टियां और फर्में')}</NavLink>
                    <NavLink to="/app/ledger" className={navLinkClasses}>{t('Ledger & Bills', 'खाता बही और बिल')}</NavLink>
                    <NavLink to="/app/pending" className={({ isActive }) =>
                        `px-4 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 border-2 shadow-sm whitespace-nowrap ${
                            isActive 
                                ? 'bg-white text-secondary border-white scale-105 shadow-yellow-500/20' 
                                : 'text-yellow-300 border-transparent hover:bg-white/10 hover:text-yellow-200'
                        }`
                    }>
                        <span className="flex items-center gap-2">🚚 {t('Pending Deals', 'लंबित सौदे')}</span>
                    </NavLink>
                    <NavLink to="/app/settings" className={navLinkClasses}>{t('Settings', 'सेटिंग्स')}</NavLink>
                    
                    <div className="w-px h-8 bg-red-950/50 mx-2 shadow-inner"></div>
                    
                    <NavLink to="/app/new-deal" className={({ isActive }) =>
                        `px-6 py-2.5 rounded-lg font-black text-sm shadow-xl border-2 transition-all duration-200 whitespace-nowrap uppercase tracking-wider flex items-center gap-2 ${
                            isActive ? 'bg-yellow-500 text-white border-yellow-400 scale-105' : 'bg-secondary hover:bg-yellow-500 border-yellow-600 text-white hover:scale-105'
                        }`
                    }>
                        <span>✍️</span> {t('New Deal', 'नया सौदा')}
                    </NavLink>
                    
                    <button onClick={toggleLang} className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3 py-2.5 rounded-lg font-bold text-sm ml-4 shadow-sm transition-all hover:scale-105 whitespace-nowrap backdrop-blur-sm">
                        {lang === 'en' ? '🌐 Switch to Hindi (अ)' : '🌐 Switch to English (A)'}
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
