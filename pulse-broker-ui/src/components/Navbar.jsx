import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Icon = ({ name, className = 'w-5 h-5' }) => {
    const paths = {
        dashboard: <><path d="M3 3h7v7H3zM14 3h7v4h-7zM14 11h7v10h-7zM3 14h7v7H3z" /></>,
        parties: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
        ledger: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /><path d="M8 7h8M8 11h6" /></>,
        pending: <><path d="M3 7h11v10H3zM14 10h4l3 3v4h-7z" /><circle cx="7" cy="19" r="2" /><circle cx="18" cy="19" r="2" /></>,
        new: <><path d="M12 5v14M5 12h14" /></>,
        margins: <><path d="M12 3v18M5 7h14M5 7l-3 6h6L5 7zM19 7l-3 6h6l-3-6z" /></>,
        settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.83 2.83-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21h-4v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06-2.83-2.83.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3v-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06 2.83-2.83.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3h4v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06 2.83 2.83-.06.06A1.65 1.65 0 0 0 19.4 9c.12.61.66 1.05 1.29 1.05H21v4h-.31c-.63 0-1.17.44-1.29 1.05z" /></>,
        more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    };
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{paths[name]}</svg>;
};

const Navbar = () => {
    const { toggleLang, lang, t } = useLanguage();
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);

    const links = [
        { to: '/app/dashboard', icon: 'dashboard', en: 'Dashboard', hi: 'डैशबोर्ड' },
        { to: '/app/parties', icon: 'parties', en: 'Parties', hi: 'पार्टियां' },
        { to: '/app/ledger', icon: 'ledger', en: 'Ledger & Bills', hi: 'खाता और बिल' },
        { to: '/app/margins', icon: 'margins', en: 'Trade Margins', hi: 'ट्रेड मार्जिन' },
        { to: '/app/pending', icon: 'pending', en: 'Pending', hi: 'लंबित' },
        { to: '/app/settings', icon: 'settings', en: 'Settings', hi: 'सेटिंग्स' },
    ];

    const handleLogout = () => { logout(); navigate('/login'); };

    return (
        <>
            <header className="sticky top-0 z-40 border-b border-stone-200/90 bg-white/90 backdrop-blur-xl print:hidden">
                <div className="max-w-[1440px] mx-auto h-16 lg:h-[72px] px-4 sm:px-6 flex items-center justify-between gap-5">
                    <button onClick={() => navigate('/app/dashboard')} className="flex items-center gap-3 group" aria-label={t('Go to dashboard', 'डैशबोर्ड पर जाएं')}>
                        <span className="w-10 h-10 rounded-xl bg-primary text-white grid place-items-center font-bold text-xl shadow-sm shadow-red-900/20 group-hover:scale-105 transition-transform">ॐ</span>
                        <span className="text-left hidden sm:block">
                            <span className="block font-extrabold text-[17px] tracking-tight text-gray-900 leading-5">{t('Pulse Broker', 'पल्स ब्रोकर')}</span>
                            <span className="block text-[10px] uppercase tracking-[.17em] text-textMuted font-semibold">Trade operations</span>
                        </span>
                    </button>

                    <nav className="hidden lg:flex items-center gap-1 bg-stone-100/80 p-1.5 rounded-xl border border-stone-200/80">
                        {links.map(link => (
                            <NavLink key={link.to} to={link.to} className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg text-xs xl:text-sm font-semibold transition-all whitespace-nowrap ${isActive ? 'bg-white text-primary shadow-sm ring-1 ring-stone-200' : 'text-gray-600 hover:bg-white/70 hover:text-gray-900'}`}>
                                <Icon name={link.icon} className="w-4 h-4" /> {t(link.en, link.hi)}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="flex items-center gap-2">
                        <button onClick={toggleLang} className="h-10 px-3 rounded-lg border border-stone-200 bg-white text-xs font-bold text-gray-600 hover:bg-stone-50 transition-colors">
                            {lang === 'en' ? 'हिंदी' : 'English'}
                        </button>
                        <button onClick={handleLogout} className="hidden sm:grid h-10 w-10 place-items-center rounded-lg border border-stone-200 text-gray-500 hover:text-primary hover:bg-red-50 transition-colors" title={t('Logout', 'लॉग आउट')}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
                        </button>
                        <NavLink to="/app/new-deal" className="hidden lg:flex h-10 items-center gap-2 px-4 rounded-lg bg-primary hover:bg-red-900 text-white text-sm font-bold shadow-sm transition-all hover:-translate-y-px">
                            <Icon name="new" className="w-4 h-4" /> {t('New Deal', 'नया सौदा')}
                        </NavLink>
                    </div>
                </div>
            </header>

            {menuOpen && <button className="lg:hidden fixed inset-0 z-40 bg-gray-950/30 backdrop-blur-[2px]" onClick={() => setMenuOpen(false)} aria-label="Close menu" />}
            <div className={`lg:hidden fixed z-50 left-3 right-3 bottom-[86px] bg-white rounded-2xl border border-stone-200 shadow-2xl p-3 transition-all duration-200 ${menuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                <div className="grid grid-cols-2 gap-2">
                    {links.slice(3).map(link => <NavLink key={link.to} to={link.to} onClick={() => setMenuOpen(false)} className={({isActive}) => `flex items-center gap-3 p-3 rounded-xl text-sm font-bold ${isActive ? 'bg-red-50 text-primary' : 'text-gray-600 bg-stone-50'}`}><Icon name={link.icon}/>{t(link.en,link.hi)}</NavLink>)}
                    <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="flex items-center gap-3 p-3 rounded-xl text-sm font-bold text-red-700 bg-red-50">↪ {t('Logout','लॉग आउट')}</button>
                </div>
            </div>

            <nav className="lg:hidden fixed z-50 bottom-3 left-3 right-3 h-[70px] rounded-2xl border border-stone-200/90 bg-white/95 backdrop-blur-xl shadow-[0_12px_40px_rgba(30,25,20,.18)] px-2 grid grid-cols-5 items-center print:hidden">
                {links.slice(0,2).map(link => <NavLink key={link.to} to={link.to} onClick={() => setMenuOpen(false)} className={({isActive}) => `h-14 flex flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold transition-colors ${isActive ? 'text-primary bg-red-50' : 'text-gray-500'}`}><Icon name={link.icon}/><span>{t(link.en,link.hi)}</span></NavLink>)}
                
                <div className="flex justify-center h-full relative">
                    <NavLink to="/app/new-deal" onClick={() => setMenuOpen(false)} className="absolute -top-4 w-[60px] h-[60px] flex flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-tr from-primary to-red-600 shadow-lg shadow-red-900/30 border-[4px] border-white active:scale-95 transition-transform">
                        <Icon name="new" className="w-5 h-5"/>
                        <span className="leading-none mt-0.5">{t('New','नया')}</span>
                    </NavLink>
                </div>

                {links.slice(2,3).map(link => <NavLink key={link.to} to={link.to} onClick={() => setMenuOpen(false)} className={({isActive}) => `h-14 flex flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold transition-colors ${isActive ? 'text-primary bg-red-50' : 'text-gray-500'}`}><Icon name={link.icon}/><span>{t(link.en,link.hi)}</span></NavLink>)}
                
                <button onClick={() => setMenuOpen(v => !v)} className={`h-14 flex flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold ${menuOpen ? 'text-primary bg-red-50' : 'text-gray-500'}`}><Icon name="more"/><span>{t('More','अधिक')}</span></button>
            </nav>
        </>
    );
};

export default Navbar;
