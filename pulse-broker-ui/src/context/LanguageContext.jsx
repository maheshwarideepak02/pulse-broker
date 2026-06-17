import React, { createContext, useState, useContext } from 'react';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [lang, setLang] = useState('en');

    const toggleLang = () => {
        setLang(prev => prev === 'en' ? 'hi' : 'en');
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
