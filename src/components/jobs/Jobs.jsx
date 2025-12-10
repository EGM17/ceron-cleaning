import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Calendar, MapPin, DollarSign, Image, Briefcase, Clock, Trash2, Edit2, Eye } from 'lucide-react';
import { collection, query, getDocs, orderBy, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { formatDate, formatCurrency, getJobStatusColor } from '../../utils/helpers';
import GoogleCalendarService from '../../services/calendar/GoogleCalendarService';
import Modal from '../shared/Modal';
import JobForm from './JobForm';
import ClientScheduleManager from './ClientScheduleManager';

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showScheduleManager, setShowScheduleManager] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('all'); // 'all', 'recurring', 'one-time'

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterJobs();
  }, [jobs, filterType, filterStatus, searchTerm, viewMode]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch jobs and clients in parallel
      const [jobsSnapshot, clientsSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'jobs'), orderBy('date', 'desc'))),
        getDocs(collection(db, 'clients'))
      ]);
      
      const jobsData = jobsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const clientsData = clientsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setJobs(jobsData);
      setClients(clientsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterJobs = () => {
    let filtered = [...jobs];

    // Filter by view mode
    if (viewMode === 'recurring') {
      filtered = filtered.filter(job => job.isRecurring === true);
    } else if (viewMode === 'one-time') {
      filtered = filtered.filter(job => !job.isRecurring);
    }

    // Filter by job type
    if (filterType !== 'all') {
      filtered = filtered.filter(job => job.jobType === filterType);
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(job => job.status === filterStatus);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(job =>
        job.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredJobs(filtered);
  };

  const handleEdit = (job) => {
    setSelectedJob(job);
    setShowModal(true);
  };

  const handleDelete = async (jobId) => {
    if (!window.confirm('⚠️ Delete this job permanently?')) return;
    
    try {
      const job = jobs.find(j => j.id === jobId);
      
      await deleteDoc(doc(db, 'jobs', jobId));
      
      // Delete from Google Calendar if exists
      if (job?.googleEventId) {
        try {
          await GoogleCalendarService.deleteEvent(job.googleEventId);
          console.log('✅ Deleted from Google Calendar');
        } catch (error) {
          console.error('Error deleting from Google Calendar:', error);
        }
      }
      
      fetchData();
      alert('Job deleted! ✅');
    } catch (error) {
      console.error('Error deleting job:', error);
      alert('Error deleting job. Please try again.');
    }
  };

  const handleManageSchedule = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setSelectedClient(client);
      setShowScheduleManager(true);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setShowScheduleManager(false);
    setSelectedJob(null);
    setSelectedClient(null);
    fetchData();
  };

  // Group jobs by client for recurring clients view
  const recurringClients = [...new Set(
    jobs.filter(j => j.isRecurring).map(j => j.clientId)
  )].map(clientId => {
    const client = clients.find(c => c.id === clientId);
    const clientJobs = jobs.filter(j => j.clientId === clientId && j.isRecurring);
    const upcomingJobs = clientJobs.filter(j => 
      new Date(j.date) >= new Date() && j.status === 'scheduled'
    );
    const totalRevenue = clientJobs
      .filter(j => j.status === 'completed')
      .reduce((sum, j) => sum + j.amount, 0);
    
    return {
      ...client,
      totalJobs: clientJobs.length,
      upcomingJobs: upcomingJobs.length,
      totalRevenue
    };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-600 mt-1">Manage your cleaning jobs and schedules</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          New Job
        </button>
      </div>

      {/* View Mode Tabs */}
      <div className="card">
        <div className="flex gap-2 mb-4 border-b border-gray-200">
          <button
            onClick={() => setViewMode('all')}
            className={`px-4 py-2 font-medium transition-colors ${
              viewMode === 'all'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Jobs ({jobs.length})
          </button>
          <button
            onClick={() => setViewMode('recurring')}
            className={`px-4 py-2 font-medium transition-colors ${
              viewMode === 'recurring'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🔁 Recurring Clients ({recurringClients.length})
          </button>
          <button
            onClick={() => setViewMode('one-time')}
            className={`px-4 py-2 font-medium transition-colors ${
              viewMode === 'one-time'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📅 One-time Jobs ({jobs.filter(j => !j.isRecurring).length})
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input"
            >
              <option value="all">All Types</option>
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'recurring' ? (
        // RECURRING CLIENTS VIEW
        <div className="space-y-4">
          {recurringClients.length > 0 ? (
            recurringClients.map(client => (
              <div key={client.id} className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Briefcase size={24} className="text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">{client.name}</h3>
                        {client.company && <p className="text-sm text-gray-600">{client.company}</p>}
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span>{client.email}</span>
                          <span>•</span>
                          <span>{client.phone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-white rounded-lg p-3 border border-blue-200">
                        <p className="text-xs text-gray-600 mb-1">Total Jobs</p>
                        <p className="text-xl font-bold text-gray-900">{client.totalJobs}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-blue-200">
                        <p className="text-xs text-gray-600 mb-1">Upcoming</p>
                        <p className="text-xl font-bold text-blue-600">{client.upcomingJobs}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-blue-200">
                        <p className="text-xs text-gray-600 mb-1">Total Revenue</p>
                        <p className="text-xl font-bold text-green-600">{formatCurrency(client.totalRevenue)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-blue-200">
                  <button
                    onClick={() => handleManageSchedule(client.id)}
                    className="btn btn-primary text-sm flex items-center gap-1"
                  >
                    <Calendar size={16} />
                    Manage Schedule
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="card text-center py-12">
              <Briefcase size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No recurring clients yet</h3>
              <p className="text-gray-600 mb-4">Create a recurring job to get started</p>
              <button
                onClick={() => setShowModal(true)}
                className="btn btn-primary inline-flex items-center gap-2"
              >
                <Plus size={20} />
                Create Recurring Job
              </button>
            </div>
          )}
        </div>
      ) : (
        // ALL JOBS / ONE-TIME JOBS VIEW
        <div>
          {filteredJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredJobs.map(job => {
                const isPast = new Date(job.date) < new Date();
                const isToday = new Date(job.date).toDateString() === new Date().toDateString();
                
                return (
                  <div key={job.id} className={`card hover:shadow-lg transition-shadow ${
                    isToday ? 'border-primary-400 border-2' : ''
                  }`}>
                    {/* Job header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          job.jobType === 'residential' ? 'bg-blue-100' : 'bg-green-100'
                        }`}>
                          <Briefcase size={20} className={
                            job.jobType === 'residential' ? 'text-blue-600' : 'text-green-600'
                          } />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{job.clientName}</h3>
                          <p className="text-sm text-gray-500 capitalize">{job.jobType}</p>
                          {job.isRecurring && (
                            <p className="text-xs text-blue-600">🔁 Recurring Client</p>
                          )}
                          {job.googleEventId && (
                            <p className="text-xs text-green-600">📅 Synced</p>
                          )}
                        </div>
                      </div>
                      <span className={`badge badge-${getJobStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>

                    {/* Job details */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar size={16} />
                        <span>{formatDate(job.date)}</span>
                        {isToday && <span className="badge badge-info text-xs ml-2">Today</span>}
                        {isPast && job.status !== 'completed' && (
                          <span className="badge badge-danger text-xs ml-2">Overdue</span>
                        )}
                      </div>
                      
                      {job.time && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock size={16} />
                          <span>{job.time}</span>
                          {job.endTime && <span>- {job.endTime}</span>}
                          {job.duration && <span className="text-gray-400">({job.duration} min)</span>}
                        </div>
                      )}
                      
                      {job.location && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin size={16} />
                          <span className="truncate">{job.location}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <DollarSign size={16} />
                        <span className="font-semibold">{formatCurrency(job.amount)}</span>
                      </div>
                      
                      {job.photos && job.photos.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Image size={16} />
                          <span>{job.photos.length} photo(s)</span>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    {job.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{job.description}</p>
                    )}

                    {/* Notes */}
                    {job.notes && (
                      <p className="text-sm text-gray-500 italic mb-4 line-clamp-1">
                        Note: {job.notes}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => handleEdit(job)}
                        className="flex-1 btn btn-secondary text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(job.id)}
                        className="flex-1 btn bg-red-50 text-red-600 hover:bg-red-100 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card text-center py-12">
              <Briefcase size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No jobs found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'Try adjusting your search' : 'Get started by creating your first job'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowModal(true)}
                  className="btn btn-primary inline-flex items-center gap-2"
                >
                  <Plus size={20} />
                  New Job
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Job form modal */}
      <Modal
        isOpen={showModal}
        onClose={handleModalClose}
        title={selectedJob?.id ? 'Edit Job' : 'New Job'}
        size="lg"
      >
        <JobForm
          job={selectedJob}
          onClose={handleModalClose}
        />
      </Modal>

      {/* Client Schedule Manager modal */}
      <Modal
        isOpen={showScheduleManager}
        onClose={handleModalClose}
        title={`Schedule: ${selectedClient?.name || ''}`}
        size="xl"
      >
        {selectedClient && (
          <ClientScheduleManager
            client={selectedClient}
            onClose={handleModalClose}
          />
        )}
      </Modal>
    </div>
  );
};

export default Jobs;