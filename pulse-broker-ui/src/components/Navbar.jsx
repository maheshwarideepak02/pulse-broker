import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const { toggleLang, lang, t } = useLanguage();
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navLinkClasses = ({ isActive }) =>
        `px-4 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 border-2 shadow-sm whitespace-nowrap ${
            isActive 
                ? 'bg-white text-primary border-white scale-105' 
                : 'text-white/90 border-transparent hover:bg-white/10 hover:text-white'
        }`;

    const mobileNavLinkClasses = ({ isActive }) =>
        `block px-4 py-3 rounded-lg font-bold text-sm transition-all duration-200 ${
            isActive 
                ? 'bg-white/20 text-white border-l-4 border-white' 
                : 'text-white/80 hover:bg-white/10 hover:text-white'
        }`;

    return (
        <nav className="bg-gradient-to-r from-primary to-red-900 border-b-4 border-secondary sticky top-0 z-40 shadow-lg shadow-red-900/20">
            {/* Desktop Nav */}
            <div className="hidden lg:flex max-w-7xl mx-auto justify-between items-center p-4 gap-8">
                <div className="font-black text-2xl text-white tracking-tight flex items-center gap-2 drop-shadow-md cursor-pointer hover:scale-105 transition-transform" onClick={() => window.location.href='/app/dashboard'}>
                    <span className="text-secondary text-2xl bg-white/10 p-1.5 rounded-lg border border-white/20 shadow-inner">ॐ</span> {t('Pulse Broker', 'पल्स ब्रोकर')}
                </div>
                <div className="flex space-x-2 items-center">
                    <NavLink to="/app/dashboard" className={navLinkClasses}>{t('Dashboard', 'डैशबोर्ड')}</NavLink>
                    <NavLink to="/app/parties" className={navLinkClasses}>{t('Parties & Firms', 'पार्टियां और फर्में')}</NavLink>
                    <NavLink to="/app/ledger" className={navLinkClasses}>{t('Ledger & Bills', 'खाता बही और बिल')}</NavLink>
                    <NavLink to="/app/margins" className={navLinkClasses}>{t('Trade Margins', 'ट्रेड मार्जिन')}</NavLink>
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
                        {lang === 'en' ? '🌐 Hindi (अ)' : '🌐 Eng (A)'}
                    </button>
                    <button onClick={handleLogout} className="bg-red-800 hover:bg-red-700 text-white border border-red-600 px-3 py-2.5 rounded-lg font-bold text-sm shadow-sm transition-all hover:scale-105 whitespace-nowrap">
                        {t('Logout', 'लॉग आउट')}
                    </button>
                </div>
            </div>

            {/* Mobile Nav */}
            <div className="lg:hidden">
                <div className="flex justify-between items-center p-3">
                    <div className="font-black text-lg text-white tracking-tight flex items-center gap-2 cursor-pointer" onClick={() => window.location.href='/app/dashboard'}>
                        <span className="text-secondary text-xl bg-white/10 p-1 rounded-lg border border-white/20">ॐ</span> {t('Pulse Broker', 'पल्स ब्रोकर')}
                    </div>
                    <div className="flex items-center gap-2">
                        <NavLink to="/app/new-deal" className="bg-secondary text-white px-3 py-2 rounded-lg font-bold text-xs uppercase tracking-wider shadow-lg" onClick={() => setMenuOpen(false)}>
                            ✍️ {t('New', 'नया')}
                        </NavLink>
                        <button aria-label="Menu" onClick={() => setMenuOpen(!menuOpen)} className="text-white p-2 rounded-lg hover:bg-white/10 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {menuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile Dropdown Menu */}
                {menuOpen && (
                    <div className="bg-red-900/95 backdrop-blur-sm border-t border-white/10 px-3 py-2 pb-4 space-y-1 animate-slide-in">
                        <NavLink to="/app/dashboard" className={mobileNavLinkClasses} onClick={() => setMenuOpen(false)}>📊 {t('Dashboard', 'डैशबोर्ड')}</NavLink>
                        <NavLink to="/app/parties" className={mobileNavLinkClasses} onClick={() => setMenuOpen(false)}>👥 {t('Parties & Firms', 'पार्टियां और फर्में')}</NavLink>
                        <NavLink to="/app/ledger" className={mobileNavLinkClasses} onClick={() => setMenuOpen(false)}>📒 {t('Ledger & Bills', 'खाता बही और बिल')}</NavLink>
                        <NavLink to="/app/margins" className={mobileNavLinkClasses} onClick={() => setMenuOpen(false)}>⚖️ {t('Trade Margins', 'ट्रेड मार्जिन')}</NavLink>
                        <NavLink to="/app/pending" className={mobileNavLinkClasses} onClick={() => setMenuOpen(false)}>🚚 {t('Pending Deals', 'लंबित सौदे')}</NavLink>
                        <NavLink to="/app/settings" className={mobileNavLinkClasses} onClick={() => setMenuOpen(false)}>⚙️ {t('Settings', 'सेटिंग्स')}</NavLink>
                        <NavLink to="/app/new-deal" className={mobileNavLinkClasses} onClick={() => setMenuOpen(false)}>✍️ {t('New Deal', 'नया सौदा')}</NavLink>
                        <div className="border-t border-white/10 pt-2 mt-2">
                            <button onClick={() => { toggleLang(); setMenuOpen(false); }} className="w-full text-left px-4 py-3 text-white/80 hover:text-white rounded-lg font-bold text-sm hover:bg-white/10 transition-all">
                                {lang === 'en' ? '🌐 Switch to Hindi (अ)' : '🌐 Switch to English (A)'}
                            </button>
                            <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="w-full text-left px-4 py-3 text-red-300 hover:text-red-100 rounded-lg font-bold text-sm hover:bg-red-900/50 transition-all">
                                🚪 {t('Logout', 'लॉग आउट')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
