import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // Check sessionStorage on initial load to keep user logged in if they refresh
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        const auth = sessionStorage.getItem('pulse_broker_auth');
        const lastActivity = sessionStorage.getItem('pulse_broker_last_activity');
        
        if (auth === 'true' && lastActivity) {
            // Check if 30 mins have passed
            const thirtyMins = 30 * 60 * 1000;
            if (Date.now() - parseInt(lastActivity) < thirtyMins) {
                return true;
            }
        }
        
        sessionStorage.removeItem('pulse_broker_auth');
        sessionStorage.removeItem('pulse_broker_last_activity');
        return false;
    });

    useEffect(() => {
        if (!isAuthenticated) return;

        // Throttle updates to sessionStorage so we aren't writing on every single pixel of scroll
        let throttleTimer = null;
        const updateActivity = () => {
            if (throttleTimer) return;
            throttleTimer = setTimeout(() => {
                sessionStorage.setItem('pulse_broker_last_activity', Date.now().toString());
                throttleTimer = null;
            }, 5000); // Only update at most once every 5 seconds
        };

        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach(e => window.addEventListener(e, updateActivity, { passive: true }));

        // Run a check every 1 minute to auto-logout if session expires while tab is open
        const checkExpiry = setInterval(() => {
            const lastActivity = sessionStorage.getItem('pulse_broker_last_activity');
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
            events.forEach(e => window.removeEventListener(e, updateActivity));
            clearInterval(checkExpiry);
            if (throttleTimer) clearTimeout(throttleTimer);
        };
    }, [isAuthenticated]);

    const login = () => {
        setIsAuthenticated(true);
        sessionStorage.setItem('pulse_broker_auth', 'true');
        sessionStorage.setItem('pulse_broker_last_activity', Date.now().toString());
    };

    const logout = () => {
        setIsAuthenticated(false);
        sessionStorage.removeItem('pulse_broker_auth');
        sessionStorage.removeItem('pulse_broker_last_activity');
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
