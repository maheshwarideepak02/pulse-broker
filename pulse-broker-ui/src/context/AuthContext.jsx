import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // Check sessionStorage on initial load to keep user logged in if they refresh
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        const auth = sessionStorage.getItem('pulse_broker_auth');
        const loginTime = sessionStorage.getItem('pulse_broker_login_time');
        
        if (auth === 'true' && loginTime) {
            // Check if 12 hours have passed
            const twelveHours = 12 * 60 * 60 * 1000;
            if (Date.now() - parseInt(loginTime) < twelveHours) {
                return true;
            }
        }
        
        sessionStorage.removeItem('pulse_broker_auth');
        sessionStorage.removeItem('pulse_broker_login_time');
        return false;
    });

    useEffect(() => {
        // Run a check every 5 minutes to auto-logout if session expires while tab is open
        const checkExpiry = setInterval(() => {
            const loginTime = sessionStorage.getItem('pulse_broker_login_time');
            if (loginTime) {
                const twelveHours = 12 * 60 * 60 * 1000;
                if (Date.now() - parseInt(loginTime) >= twelveHours) {
                    logout();
                    alert("Session expired. Please log in again.");
                    window.location.href = '/login';
                }
            }
        }, 5 * 60 * 1000);
        
        return () => clearInterval(checkExpiry);
    }, []);

    const login = () => {
        setIsAuthenticated(true);
        sessionStorage.setItem('pulse_broker_auth', 'true');
        sessionStorage.setItem('pulse_broker_login_time', Date.now().toString());
    };

    const logout = () => {
        setIsAuthenticated(false);
        sessionStorage.removeItem('pulse_broker_auth');
        sessionStorage.removeItem('pulse_broker_login_time');
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
