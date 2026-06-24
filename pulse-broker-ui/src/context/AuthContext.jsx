import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        const token = localStorage.getItem('pulse_auth_token');
        const lastActivity = localStorage.getItem('pulse_broker_last_activity');
        
        if (token && lastActivity) {
            // Check if 30 mins have passed
            const thirtyMins = 30 * 60 * 1000;
            if (Date.now() - parseInt(lastActivity) < thirtyMins) {
                return true;
            }
        }
        
        localStorage.removeItem('pulse_auth_token');
        localStorage.removeItem('pulse_broker_last_activity');
        return false;
    });

    useEffect(() => {
        // Sync across tabs
        const handleStorageChange = (e) => {
            if (e.key === 'pulse_auth_token') {
                setIsAuthenticated(!!e.newValue);
            }
        };
        window.addEventListener('storage', handleStorageChange);

        if (!isAuthenticated) {
            return () => window.removeEventListener('storage', handleStorageChange);
        }

        let throttleTimer = null;
        const updateActivity = () => {
            if (throttleTimer) return;
            throttleTimer = setTimeout(() => {
                localStorage.setItem('pulse_broker_last_activity', Date.now().toString());
                throttleTimer = null;
            }, 5000);
        };

        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach(e => window.addEventListener(e, updateActivity, { passive: true }));

        const checkExpiry = setInterval(() => {
            const lastActivity = localStorage.getItem('pulse_broker_last_activity');
            if (lastActivity) {
                const thirtyMins = 30 * 60 * 1000;
                if (Date.now() - parseInt(lastActivity) >= thirtyMins) {
                    logout();
                    alert("Session expired due to 30 minutes of inactivity. Please log in again.");
                    window.location.href = '/login';
                }
            }
        }, 60 * 1000);
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            events.forEach(e => window.removeEventListener(e, updateActivity));
            clearInterval(checkExpiry);
            if (throttleTimer) clearTimeout(throttleTimer);
        };
    }, [isAuthenticated]);

    const login = (token) => {
        setIsAuthenticated(true);
        if (token) localStorage.setItem('pulse_auth_token', token);
        localStorage.setItem('pulse_broker_last_activity', Date.now().toString());
    };

    const logout = () => {
        setIsAuthenticated(false);
        localStorage.removeItem('pulse_auth_token');
        localStorage.removeItem('pulse_broker_last_activity');
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
