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

const Layout = ({ children }) => (
    <div className="bg-background text-textMain min-h-screen pb-12">
        <Navbar />
        <main>{children}</main>
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

  React.useEffect(() => {
    let timeoutId;
    const checkHealth = async () => {
      // If it takes longer than 2 seconds, show the cold start screen
      timeoutId = setTimeout(() => {
        setIsColdStarting(true);
      }, 2000);

      try {
        await checkServerHealth();
      } catch (err) {
        // If we got a response from the server (like 401 Unauthorized or 403), the server IS awake!
        if (err.response) {
            console.log("Server is awake, but returned status:", err.response.status);
            clearTimeout(timeoutId);
            setIsColdStarting(false);
            setIsServerAwake(true);
            return;
        }
        
        console.error("Health check failed, assuming server is starting up", err);
        // It failed with no response (network error / timeout), server is asleep
        await new Promise(resolve => setTimeout(resolve, 3000));
        checkHealth();
        return;
      }

      // Server is awake!
      clearTimeout(timeoutId);
      setIsColdStarting(false);
      setIsServerAwake(true);
    };

    checkHealth();
    return () => clearTimeout(timeoutId);
  }, []);

  if (!isServerAwake && isColdStarting) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-6 text-center z-50">
        <div className="w-24 h-24 border-8 border-gray-200 border-t-primary rounded-full animate-spin mb-8 shadow-lg"></div>
        <h1 className="text-3xl font-bold text-textMain mb-4">Waking up the Broker Engine 🌾</h1>
        <p className="text-gray-500 max-w-md text-lg">
          Our servers were catching a quick nap! Please give it about 30 to 50 seconds to fully boot up. Once it's awake, it will run at lightning speed.
        </p>
        <div className="mt-8 px-6 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-bold animate-pulse">
          ⏳ Please do not close this window
        </div>
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
                        <Route path="pending" element={<Pending />} />
                        <Route path="settings" element={<Settings />} />
                        <Route path="new-deal" element={<NewDeal />} />
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
