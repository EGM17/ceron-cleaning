import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import Header from './components/shared/Header';
import Sidebar from './components/shared/Sidebar';
import Dashboard from './components/dashboard/Dashboard';
import Jobs from './components/jobs/Jobs';
import Clients from './components/clients/Clients';
import Payments from './components/payments/Payments';
import Invoices from './components/invoices/Invoices';
import Calendar from './components/calendar/Calendar'; // NUEVO
import Settings from './components/settings/Settings';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Header toggleSidebar={toggleSidebar} />
        <Sidebar sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
        
        <main className="lg:pl-64 pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/calendar" element={<Calendar />} /> {/* NUEVO */}
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;