import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { formatDate, formatCurrency } from '../../utils/helpers';
import GoogleCalendarService from '../../services/calendar/GoogleCalendarService';
import { Calendar, Clock, Plus, Edit2, Trash2, Save, X, MapPin, DollarSign } from 'lucide-react';

const ClientScheduleManager = ({ client, onClose }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    endTime: '11:00',
    amount: '',
    location: client.address || '',
    description: '',
    notes: ''
  });

  useEffect(() => {
    fetchClientJobs();
  }, [client]);

  const fetchClientJobs = async () => {
    try {
      setLoading(true);
      const jobsQuery = query(
        collection(db, 'jobs'),
        where('clientId', '==', client.id)
      );
      
      const snapshot = await getDocs(jobsQuery);
      const jobsData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      
      setJobs(jobsData);
    } catch (error) {
      console.error('Error fetching client jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculateDuration = (startTime, endTime) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    return (endHour * 60 + endMin) - (startHour * 60 + startMin);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const duration = calculateDuration(formData.time, formData.endTime);
      
      const jobData = {
        clientId: client.id,
        clientName: client.name,
        jobType: client.type || 'residential',
        isRecurring: true,
        date: formData.date,
        time: formData.time,
        endTime: formData.endTime,
        duration,
        status: 'scheduled',
        amount: parseFloat(formData.amount),
        location: formData.location,
        description: formData.description,
        notes: formData.notes,
        photos: [],
        updatedAt: new Date().toISOString()
      };

      if (editingJob) {
        // Update existing job
        await updateDoc(doc(db, 'jobs', editingJob.id), jobData);
        
        // Update Google Calendar
        if (editingJob.googleEventId) {
          try {
            await GoogleCalendarService.updateEvent(editingJob.googleEventId, jobData);
          } catch (error) {
            console.error('Error updating Google Calendar:', error);
          }
        }
        
        alert('Job updated successfully! ✅');
      } else {
        // Create new job
        const jobRef = await addDoc(collection(db, 'jobs'), {
          ...jobData,
          createdAt: new Date().toISOString()
        });
        
        // Create Google Calendar event
        try {
          const isConfigured = await GoogleCalendarService.isConfigured();
          if (isConfigured) {
            const event = await GoogleCalendarService.createEvent(jobData);
            if (event && event.id) {
              await updateDoc(doc(db, 'jobs', jobRef.id), {
                googleEventId: event.id
              });
            }
          }
        } catch (error) {
          console.error('Error creating Google Calendar event:', error);
        }
        
        alert('Job added to schedule! ✅');
      }

      setShowAddForm(false);
      setEditingJob(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        endTime: '11:00',
        amount: '',
        location: client.address || '',
        description: '',
        notes: ''
      });
      fetchClientJobs();
    } catch (error) {
      console.error('Error saving job:', error);
      alert('Error saving job. Please try again.');
    }
  };

  const handleEdit = (job) => {
    setEditingJob(job);
    setFormData({
      date: job.date,
      time: job.time || '09:00',
      endTime: job.endTime || '11:00',
      amount: job.amount,
      location: job.location || '',
      description: job.description || '',
      notes: job.notes || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (jobId) => {
    if (!window.confirm('Delete this scheduled job?')) return;

    try {
      const job = jobs.find(j => j.id === jobId);
      
      await deleteDoc(doc(db, 'jobs', jobId));
      
      // Delete from Google Calendar
      if (job?.googleEventId) {
        try {
          await GoogleCalendarService.deleteEvent(job.googleEventId);
        } catch (error) {
          console.error('Error deleting from Google Calendar:', error);
        }
      }
      
      fetchClientJobs();
      alert('Job deleted! ✅');
    } catch (error) {
      console.error('Error deleting job:', error);
      alert('Error deleting job. Please try again.');
    }
  };

  const handleStatusChange = async (jobId, newStatus) => {
    try {
      await updateDoc(doc(db, 'jobs', jobId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      fetchClientJobs();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status. Please try again.');
    }
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setEditingJob(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      time: '09:00',
      endTime: '11:00',
      amount: '',
      location: client.address || '',
      description: '',
      notes: ''
    });
  };

  const stats = {
    total: jobs.length,
    upcoming: jobs.filter(j => new Date(j.date) >= new Date() && j.status === 'scheduled').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    totalRevenue: jobs.filter(j => j.status === 'completed').reduce((sum, j) => sum + j.amount, 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Client Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{client.name}</h3>
            {client.company && <p className="text-gray-600 mb-2">{client.company}</p>}
            <p className="text-sm text-gray-500">{client.email} • {client.phone}</p>
            {client.address && (
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                <MapPin size={16} />
                <span>{client.address}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Add Date
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Total Scheduled</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-blue-600 mb-1">Upcoming</p>
          <p className="text-2xl font-bold text-blue-900">{stats.upcoming}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <p className="text-sm text-green-600 mb-1">Completed</p>
          <p className="text-2xl font-bold text-green-900">{stats.completed}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <p className="text-sm text-purple-600 mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-purple-900">{formatCurrency(stats.totalRevenue)}</p>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="card bg-gray-50">
          <h4 className="font-semibold text-gray-900 mb-4">
            {editingJob ? 'Edit Scheduled Job' : 'Add New Date to Schedule'}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Date *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="input"
                />
              </div>
              <div>
                <label className="label">Start Time *</label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  required
                  className="input"
                />
              </div>
              <div>
                <label className="label">End Time *</label>
                <input
                  type="time"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  required
                  className="input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Amount ($) *</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="123 Main St"
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="label">Service Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="2"
                placeholder="Regular office cleaning..."
                className="input"
              />
            </div>

            <div>
              <label className="label">Notes (Optional)</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="2"
                placeholder="Special instructions for this date..."
                className="input"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={cancelForm}
                className="flex-1 btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 btn btn-primary flex items-center justify-center gap-2"
              >
                <Save size={20} />
                {editingJob ? 'Update' : 'Add to Schedule'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Jobs List */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-900">Scheduled Dates ({jobs.length})</h4>
        
        {jobs.length > 0 ? (
          jobs.map(job => {
            const isPast = new Date(job.date) < new Date();
            const isToday = new Date(job.date).toDateString() === new Date().toDateString();
            
            return (
              <div
                key={job.id}
                className={`card ${
                  isToday ? 'border-primary-400 bg-primary-50' :
                  isPast && job.status !== 'completed' ? 'border-red-200 bg-red-50' :
                  ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar size={20} className="text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {formatDate(job.date)}
                          {isToday && <span className="ml-2 badge badge-info text-xs">Today</span>}
                          {isPast && job.status !== 'completed' && (
                            <span className="ml-2 badge badge-danger text-xs">Overdue</span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <Clock size={14} />
                          <span>{job.time} - {job.endTime}</span>
                          <span className="text-gray-400">•</span>
                          <span>{job.duration} min</span>
                        </div>
                      </div>
                    </div>

                    {job.description && (
                      <p className="text-sm text-gray-600 mb-2">{job.description}</p>
                    )}

                    {job.notes && (
                      <p className="text-sm text-gray-500 italic">Note: {job.notes}</p>
                    )}

                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <DollarSign size={14} />
                        <span className="font-semibold">{formatCurrency(job.amount)}</span>
                      </div>
                      {job.location && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin size={14} />
                          <span>{job.location}</span>
                        </div>
                      )}
                      <span className={`badge badge-${
                        job.status === 'completed' ? 'success' :
                        job.status === 'in-progress' ? 'warning' :
                        job.status === 'cancelled' ? 'danger' :
                        'info'
                      }`}>
                        {job.status}
                      </span>
                      {job.googleEventId && (
                        <span className="text-xs text-green-600">📅 Synced</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {job.status === 'scheduled' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(job.id, 'in-progress')}
                          className="btn bg-yellow-50 text-yellow-600 hover:bg-yellow-100 text-xs"
                        >
                          Start
                        </button>
                        <button
                          onClick={() => handleStatusChange(job.id, 'completed')}
                          className="btn btn-success text-xs"
                        >
                          Complete
                        </button>
                      </>
                    )}
                    {job.status === 'in-progress' && (
                      <button
                        onClick={() => handleStatusChange(job.id, 'completed')}
                        className="btn btn-success text-xs"
                      >
                        Complete
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(job)}
                      className="btn btn-secondary text-xs flex items-center gap-1"
                    >
                      <Edit2 size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(job.id)}
                      className="btn bg-red-50 text-red-600 hover:bg-red-100 text-xs flex items-center gap-1"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="card text-center py-12">
            <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">No dates scheduled yet for this client.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <Plus size={20} />
              Add First Date
            </button>
          </div>
        )}
      </div>

      {/* Close button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button onClick={onClose} className="btn btn-secondary">
          Close
        </button>
      </div>
    </div>
  );
};

export default ClientScheduleManager;