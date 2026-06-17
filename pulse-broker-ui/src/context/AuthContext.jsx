import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // Check sessionStorage on initial load to keep user logged in if they refresh
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return sessionStorage.getItem('pulse_broker_auth') === 'true';
    });

    const login = () => {
        setIsAuthenticated(true);
        sessionStorage.setItem('pulse_broker_auth', 'true');
    };

    const logout = () => {
        setIsAuthenticated(false);
        sessionStorage.removeItem('pulse_broker_auth');
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
