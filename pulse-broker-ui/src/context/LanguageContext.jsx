import React, { createContext, useState, useContext } from 'react';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [lang, setLang] = useState(() => {
        return localStorage.getItem('pulse_broker_lang') || 'en';
    });

    const toggleLang = () => {
        setLang(prev => {
            const newLang = prev === 'en' ? 'hi' : 'en';
            localStorage.setItem('pulse_broker_lang', newLang);
            return newLang;
        });
    };

    const t = (enText, hiText) => {
        return lang === 'en' ? enText : (hiText || enText);
    };

    return (
        <LanguageContext.Provider value={{ lang, toggleLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
