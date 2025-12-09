import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Briefcase, 
  Users, 
  FileText,
  TrendingUp,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { collection, query, getDocs, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { formatCurrency, formatDate } from '../../utils/helpers';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingPayments: 0,
    activeJobs: 0,
    totalClients: 0
  });
  const [recentJobs, setRecentJobs] = useState([]);
  const [upcomingJobs, setUpcomingJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobTypeData, setJobTypeData] = useState([
    { name: 'Residential', value: 0, color: '#3b82f6' },
    { name: 'Commercial', value: 0, color: '#10b981' }
  ]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel
      const [jobsSnapshot, clientsSnapshot, invoicesSnapshot] = await Promise.all([
        getDocs(collection(db, 'jobs')),
        getDocs(collection(db, 'clients')),
        getDocs(collection(db, 'invoices'))
      ]);

      // Calculate stats from INVOICES (not jobs)
      let totalRevenue = 0;
      let pendingPayments = 0;
      let activeJobsCount = 0;
      let residentialCount = 0;
      let commercialCount = 0;

      // Process INVOICES for revenue
      invoicesSnapshot.forEach(doc => {
        const invoice = doc.data();
        
        // Total revenue = sum of all paid amounts
        if (invoice.amountPaid > 0) {
          totalRevenue += invoice.amountPaid;
        }
        
        // Pending payments = total - paid for unpaid/partial invoices
        if (invoice.status !== 'paid' && invoice.status !== 'void') {
          const balance = invoice.total - (invoice.amountPaid || 0);
          pendingPayments += balance;
        }
      });

      // Process jobs - ONLY count instances and one-time jobs (NOT templates)
      const jobsData = [];
      const today = new Date().toISOString().split('T')[0];
      
      jobsSnapshot.forEach(doc => {
        const job = { id: doc.id, ...doc.data() };
        
        // Skip templates - they're not actual jobs
        if (job.type === 'template') return;
        
        jobsData.push(job);

        // Count active jobs (not completed or cancelled)
        // Active = scheduled or in-progress AND date is today or future
        if ((job.status === 'scheduled' || job.status === 'in-progress') && job.date >= today) {
          activeJobsCount++;
        }

        // Count by type (for pie chart)
        if (job.jobType === 'residential') {
          residentialCount++;
        } else if (job.jobType === 'commercial') {
          commercialCount++;
        }
      });

      // Update stats
      setStats({
        totalRevenue,
        pendingPayments,
        activeJobs: activeJobsCount,
        totalClients: clientsSnapshot.size
      });

      // Update job type data
      const total = residentialCount + commercialCount;
      if (total > 0) {
        setJobTypeData([
          { 
            name: 'Residential', 
            value: residentialCount, 
            percentage: Math.round((residentialCount / total) * 100),
            color: '#3b82f6' 
          },
          { 
            name: 'Commercial', 
            value: commercialCount,
            percentage: Math.round((commercialCount / total) * 100),
            color: '#10b981' 
          }
        ]);
      }

      // Get recent jobs (last 5 completed instances/one-time jobs)
      const recentJobsData = jobsData
        .filter(job => job.status === 'completed')
        .sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.date);
          const dateB = new Date(b.updatedAt || b.date);
          return dateB - dateA;
        })
        .slice(0, 5);
      setRecentJobs(recentJobsData);

      // Get upcoming jobs (scheduled and in-progress instances/one-time jobs)
      const upcomingJobsData = jobsData
        .filter(job => {
          const isActive = job.status === 'scheduled' || job.status === 'in-progress';
          const isFuture = job.date >= today;
          return isActive && isFuture;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 5);
      setUpcomingJobs(upcomingJobsData);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, change, color }) => (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
          {change && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp size={14} className="text-green-600" />
              <span className="text-sm text-green-600">{change}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-100`}>
          <Icon size={24} className={`text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">
          Welcome back! 👋
        </h1>
        <p className="text-gray-600">Here's what's happening with your business today.</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={DollarSign}
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          color="blue"
        />
        <StatCard
          icon={AlertCircle}
          title="Pending Payments"
          value={formatCurrency(stats.pendingPayments)}
          color="yellow"
        />
        <StatCard
          icon={Briefcase}
          title="Active Jobs"
          value={stats.activeJobs}
          color="green"
        />
        <StatCard
          icon={Users}
          title="Total Clients"
          value={stats.totalClients}
          color="blue"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Job types chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Jobs by Type</h3>
          {jobTypeData[0].value > 0 || jobTypeData[1].value > 0 ? (
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={jobTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} ${percentage}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {jobTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Briefcase size={48} className="mx-auto mb-4 text-gray-400" />
              <p>No jobs data yet.</p>
              <p className="text-sm mt-2">Create your first job to see statistics!</p>
            </div>
          )}
        </div>

        {/* Revenue Overview */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Overview</h3>
          <div className="text-center py-12">
            <div className="mb-4">
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {formatCurrency(stats.totalRevenue)}
              </div>
              <p className="text-sm text-gray-500">Total Revenue Collected</p>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Collected</p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Pending</p>
                <p className="text-lg font-bold text-yellow-600">
                  {formatCurrency(stats.pendingPayments)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent jobs */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Jobs</h3>
            <button 
              onClick={() => window.location.href = '/jobs'}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {recentJobs.length > 0 ? (
              recentJobs.map(job => (
                <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      job.jobType === 'residential' ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      <Briefcase size={20} className={
                        job.jobType === 'residential' ? 'text-blue-600' : 'text-green-600'
                      } />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{job.clientName || 'Unknown Client'}</p>
                      <p className="text-sm text-gray-500">{formatDate(job.date)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(job.amount)}
                    </span>
                    <p className="text-xs text-gray-500 capitalize">{job.status}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">No recent jobs</p>
            )}
          </div>
        </div>

        {/* Upcoming schedule */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Schedule</h3>
            <button 
              onClick={() => window.location.href = '/calendar'}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              View Calendar
            </button>
          </div>
          <div className="space-y-3">
            {upcomingJobs.length > 0 ? (
              upcomingJobs.map(job => (
                <div key={job.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <Calendar size={20} className="text-primary-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{job.clientName || 'Unknown Client'}</p>
                    <p className="text-sm text-gray-500">{formatDate(job.date)}</p>
                    {job.location && (
                      <p className="text-xs text-gray-500 mt-1">{job.location}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                        job.status === 'scheduled' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {job.status}
                      </span>
                      {job.type === 'instance' && (
                        <span className="inline-block px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                          Recurring #{job.instanceNumber}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-gray-900 text-sm">
                      {formatCurrency(job.amount)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">No upcoming jobs</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;