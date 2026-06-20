import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Parties from './components/Parties';
import Ledger from './components/Ledger';
import Pending from './components/Pending';
import Settings from './components/Settings';
import NewDeal from './components/NewDeal';
import MarginLedger from './components/MarginLedger';
import Analytics from './components/Analytics';

const Layout = ({ children }) => (
    <div className="app-shell bg-background text-textMain min-h-screen">
        <Navbar />
        <main className="app-main">{children}</main>
    </div>
);

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated } = useAuth();
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

import { checkServerHealth } from './api';

function App() {
  const [isServerAwake, setIsServerAwake] = React.useState(false);
  const [isColdStarting, setIsColdStarting] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);
  const [hasFailed, setHasFailed] = React.useState(false);

  const checkHealth = React.useCallback(async (isManualRetry = false) => {
    if (isManualRetry) {
        setHasFailed(false);
        setRetryCount(0);
        setIsColdStarting(true);
    }
    
    try {
      await checkServerHealth();
    } catch (err) {
      if (err.response) {
          console.log("Server is awake, but returned status:", err.response.status);
          setIsColdStarting(false);
          setIsServerAwake(true);
          return;
      }
      
      console.error("Health check failed, assuming server is starting up", err);
      
      setRetryCount(prev => {
          const nextCount = prev + 1;
          if (nextCount > 15 && !isManualRetry) { // Approx 45 seconds
              setHasFailed(true);
          } else if (!hasFailed) {
              setTimeout(() => checkHealth(false), 3000);
          }
          return nextCount;
      });
      return;
    }

    // Server is awake!
    setIsColdStarting(false);
    setIsServerAwake(true);
  }, [hasFailed]);

  React.useEffect(() => {
    let timeoutId = setTimeout(() => {
      setIsColdStarting(true);
    }, 2000);

    checkHealth();
    return () => clearTimeout(timeoutId);
  }, [checkHealth]);

  if (!isServerAwake && isColdStarting) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-6 text-center z-50">
        {!hasFailed ? (
            <>
                <div className="w-24 h-24 border-8 border-gray-200 border-t-primary rounded-full animate-spin mb-8 shadow-lg"></div>
                <h1 className="text-3xl font-bold text-textMain mb-4">Waking up the Broker Engine 🌾<br/><span className="text-2xl mt-2 block text-secondary">सर्वर चालू हो रहा है</span></h1>
                <p className="text-gray-500 max-w-md text-lg">
                  Our servers were catching a quick nap! Please give it about 30 to 50 seconds to fully boot up.<br/><br/>
                  <span className="font-bold text-gray-600">सर्वर को पूरी तरह चालू होने में 30 से 50 सेकंड का समय लग सकता है। कृपया प्रतीक्षा करें।</span>
                </p>
                <div className="mt-8 px-6 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-bold animate-pulse">
                  ⏳ Please do not close this window | कृपया इस विंडो को बंद न करें
                </div>
            </>
        ) : (
            <>
                <div className="w-24 h-24 bg-red-100 text-primary rounded-full flex items-center justify-center text-5xl mb-8 shadow-lg">⚠️</div>
                <h1 className="text-3xl font-bold text-textMain mb-4">Taking longer than expected<br/><span className="text-2xl mt-2 block text-secondary">सर्वर शुरू नहीं हो पाया</span></h1>
                <p className="text-gray-500 max-w-md text-lg mb-8">
                  The server is taking an unusually long time to wake up. Please check your internet connection or try again.<br/><br/>
                  <span className="font-bold text-gray-600">सर्वर को चालू होने में सामान्य से अधिक समय लग रहा है। कृपया दोबारा प्रयास करें।</span>
                </p>
                <button onClick={() => checkHealth(true)} className="btn-primary bg-primary hover:bg-red-800 text-white px-8 py-3 rounded-xl font-bold text-lg shadow-md transition-transform active:scale-95">
                    Retry Now / फिर से प्रयास करें
                </button>
            </>
        )}
      </div>
    );
  }

  // If not cold starting yet (first 2 seconds), just return null or a tiny spinner to prevent flash of content
  if (!isServerAwake) {
    return <div className="fixed inset-0 bg-background flex items-center justify-center"><div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin"></div></div>;
  }

  return (
    <LanguageProvider>
      <ToastProvider>
        <AuthProvider>
          <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/app/*" element={
                <ProtectedRoute>
                  <Layout>
                      <Routes>
                        <Route path="dashboard" element={<Dashboard />} />
                        <Route path="parties" element={<Parties />} />
                        <Route path="ledger" element={<Ledger />} />
                        <Route path="margins" element={<MarginLedger />} />
                        <Route path="pending" element={<Pending />} />
                        <Route path="settings" element={<Settings />} />
                        <Route path="new-deal" element={<NewDeal />} />
                        <Route path="analytics" element={<Analytics />} />
                        <Route path="*" element={<Navigate to="dashboard" replace />} />
                      </Routes>
                  </Layout>
                </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
        </AuthProvider>
      </ToastProvider>
    </LanguageProvider>
  );
}

export default App;
