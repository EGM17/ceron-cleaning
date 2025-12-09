import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  DollarSign, 
  FileText,
  Calendar,
  Settings,
  X
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { formatCurrency } from '../../utils/helpers';

const Sidebar = ({ sidebarOpen, toggleSidebar }) => {
  const [stats, setStats] = useState({
    activeJobs: 0,
    pendingPayments: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuickStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchQuickStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchQuickStats = async () => {
    try {
      const [jobsSnapshot, invoicesSnapshot] = await Promise.all([
        getDocs(collection(db, 'jobs')),
        getDocs(collection(db, 'invoices'))
      ]);

      // Count active jobs
      let activeJobs = 0;
      jobsSnapshot.forEach(doc => {
        const job = doc.data();
        if (job.status !== 'completed' && job.status !== 'cancelled') {
          activeJobs++;
        }
      });

      // Calculate pending payments
      let pendingPayments = 0;
      invoicesSnapshot.forEach(doc => {
        const invoice = doc.data();
        if (invoice.status !== 'paid' && invoice.status !== 'void') {
          pendingPayments += invoice.total - (invoice.amountPaid || 0);
        }
      });

      setStats({ activeJobs, pendingPayments });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching quick stats:', error);
      setLoading(false);
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Jobs', path: '/jobs', icon: Briefcase },
    { name: 'Clients', path: '/clients', icon: Users },
    { name: 'Payments', path: '/payments', icon: DollarSign },
    { name: 'Invoices', path: '/invoices', icon: FileText },
    { name: 'Calendar', path: '/calendar', icon: Calendar },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-16 left-0 bottom-0 w-64 bg-white border-r border-gray-200 z-40
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="h-full overflow-y-auto py-6">
          <nav className="px-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => window.innerWidth < 1024 && toggleSidebar()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`
                }
              >
                <item.icon size={20} />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>

          {/* Quick stats - NOW DYNAMIC */}
          <div className="mt-8 px-6">
            <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl p-4 text-white shadow-lg">
              <h3 className="text-sm font-medium mb-3 opacity-90">Quick Stats</h3>
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto"></div>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="opacity-90">Active Jobs</span>
                    <span className="font-bold text-lg">{stats.activeJobs}</span>
                  </div>
                  <div className="h-px bg-white opacity-20"></div>
                  <div className="flex justify-between items-center">
                    <span className="opacity-90">Pending Payments</span>
                    <span className="font-bold text-lg">{formatCurrency(stats.pendingPayments)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;