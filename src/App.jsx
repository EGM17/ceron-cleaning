import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/shared/Navbar';
import Sidebar from './components/shared/Sidebar';
import Dashboard from './components/dashboard/Dashboard';
import Jobs from './components/jobs/Jobs';
import Clients from './components/clients/Clients';
import Payments from './components/payments/Payments';
import Invoices from './components/invoices/Invoices';
import Checks from './components/checks/Checks';
import Calendar from './components/calendar/Calendar';
import Settings from './components/settings/Settings';
import Login from './components/auth/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50">
                <Navbar toggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
                <Sidebar sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
                
                <main className="lg:pl-64 pt-16">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/jobs" element={<Jobs />} />
                      <Route path="/clients" element={<Clients />} />
                      <Route path="/payments" element={<Payments />} />
                      <Route path="/invoices" element={<Invoices />} />
                      <Route path="/checks" element={<Checks />} />
                      <Route path="/calendar" element={<Calendar />} />
                      <Route path="/settings" element={<Settings />} />
                    </Routes>
                  </div>
                </main>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;