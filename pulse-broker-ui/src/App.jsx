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

function App() {
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
