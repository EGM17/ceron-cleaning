import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { formatDate, formatCurrency, getJobStatusColor } from '../../utils/helpers';
import { getRecurrenceDescription } from '../../utils/recurringJobs';
import GoogleCalendarService from '../../services/calendar/GoogleCalendarService';
import { Calendar, CheckCircle, XCircle, Clock, Trash2, AlertTriangle } from 'lucide-react';

const RecurringJobManager = ({ template, onClose }) => {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedInstances, setSelectedInstances] = useState(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  useEffect(() => {
    fetchInstances();
  }, [template]);

  const fetchInstances = async () => {
    try {
      setLoading(true);
      const instancesQuery = query(
        collection(db, 'jobs'),
        where('templateId', '==', template.id),
        where('type', '==', 'instance')
      );
      
      const snapshot = await getDocs(instancesQuery);
      const instancesData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      
      setInstances(instancesData);
    } catch (error) {
      console.error('Error fetching instances:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (instanceId, newStatus) => {
    try {
      await updateDoc(doc(db, 'jobs', instanceId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      fetchInstances();
    } catch (error) {
      console.error('Error updating instance:', error);
      alert('Error updating status. Please try again.');
    }
  };

  const handleDeleteInstance = async (instanceId) => {
    if (window.confirm('Delete this occurrence? This will not affect other instances.')) {
      try {
        const instance = instances.find(i => i.id === instanceId);
        
        await deleteDoc(doc(db, 'jobs', instanceId));
        
        // Delete from Google Calendar if exists
        if (instance?.googleEventId) {
          try {
            await GoogleCalendarService.deleteEvent(instance.googleEventId);
          } catch (error) {
            console.error('Error deleting from Google Calendar:', error);
          }
        }
        
        fetchInstances();
      } catch (error) {
        console.error('Error deleting instance:', error);
        alert('Error deleting instance. Please try again.');
      }
    }
  };

  const handleToggleSelect = (instanceId) => {
    const newSelected = new Set(selectedInstances);
    if (newSelected.has(instanceId)) {
      newSelected.delete(instanceId);
    } else {
      newSelected.add(instanceId);
    }
    setSelectedInstances(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedInstances.size === filteredInstances.length) {
      setSelectedInstances(new Set());
    } else {
      setSelectedInstances(new Set(filteredInstances.map(i => i.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedInstances.size === 0) {
      alert('No instances selected.');
      return;
    }

    if (!window.confirm(`⚠️ Delete ${selectedInstances.size} selected instances? This action cannot be undone!`)) {
      return;
    }

    try {
      const deletePromises = Array.from(selectedInstances).map(async (instanceId) => {
        const instance = instances.find(i => i.id === instanceId);
        
        await deleteDoc(doc(db, 'jobs', instanceId));
        
        if (instance?.googleEventId) {
          try {
            await GoogleCalendarService.deleteEvent(instance.googleEventId);
          } catch (error) {
            console.error(`Error deleting instance ${instanceId} from Google Calendar:`, error);
          }
        }
      });

      await Promise.all(deletePromises);
      
      setSelectedInstances(new Set());
      setBulkMode(false);
      fetchInstances();
      alert(`✅ Successfully deleted ${deletePromises.length} instances!`);
    } catch (error) {
      console.error('Error bulk deleting instances:', error);
      alert('Error deleting instances. Please try again.');
    }
  };

  const handleBulkStatusChange = async (newStatus) => {
    if (selectedInstances.size === 0) {
      alert('No instances selected.');
      return;
    }

    try {
      const updatePromises = Array.from(selectedInstances).map((instanceId) =>
        updateDoc(doc(db, 'jobs', instanceId), {
          status: newStatus,
          updatedAt: new Date().toISOString()
        })
      );

      await Promise.all(updatePromises);
      
      setSelectedInstances(new Set());
      setBulkMode(false);
      fetchInstances();
      alert(`✅ Updated ${updatePromises.length} instances to ${newStatus}!`);
    } catch (error) {
      console.error('Error bulk updating instances:', error);
      alert('Error updating instances. Please try again.');
    }
  };

  const filteredInstances = filterStatus === 'all' 
    ? instances 
    : instances.filter(i => i.status === filterStatus);

  const stats = {
    total: instances.length,
    scheduled: instances.filter(i => i.status === 'scheduled').length,
    completed: instances.filter(i => i.status === 'completed').length,
    cancelled: instances.filter(i => i.status === 'cancelled').length,
    inProgress: instances.filter(i => i.status === 'in-progress').length
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
      {/* Template Info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{template.clientName}</h3>
            <p className="text-gray-600 mb-2">🔁 {getRecurrenceDescription(template.recurrenceRule)}</p>
            <p className="text-sm text-gray-500">{template.description}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(template.amount)}</p>
            <p className="text-sm text-gray-500">per occurrence</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-blue-600 mb-1">Scheduled</p>
          <p className="text-2xl font-bold text-blue-900">{stats.scheduled}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <p className="text-sm text-yellow-600 mb-1">In Progress</p>
          <p className="text-2xl font-bold text-yellow-900">{stats.inProgress}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <p className="text-sm text-green-600 mb-1">Completed</p>
          <p className="text-2xl font-bold text-green-900">{stats.completed}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Cancelled</p>
          <p className="text-2xl font-bold text-gray-900">{stats.cancelled}</p>
        </div>
      </div>

      {/* Bulk Mode Toggle & Filter */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input"
          >
            <option value="all">All Instances ({instances.length})</option>
            <option value="scheduled">Scheduled ({stats.scheduled})</option>
            <option value="in-progress">In Progress ({stats.inProgress})</option>
            <option value="completed">Completed ({stats.completed})</option>
            <option value="cancelled">Cancelled ({stats.cancelled})</option>
          </select>
        </div>
        
        <button
          onClick={() => {
            setBulkMode(!bulkMode);
            setSelectedInstances(new Set());
          }}
          className={`btn ${bulkMode ? 'btn-primary' : 'btn-secondary'}`}
        >
          {bulkMode ? 'Exit Bulk Mode' : 'Bulk Actions'}
        </button>
      </div>

      {/* Bulk Actions Bar */}
      {bulkMode && (
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedInstances.size === filteredInstances.length && filteredInstances.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Select All ({selectedInstances.size} selected)
                </span>
              </label>
            </div>

            {selectedInstances.size > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkStatusChange('completed')}
                  className="btn btn-success text-sm"
                >
                  Mark Completed
                </button>
                <button
                  onClick={() => handleBulkStatusChange('cancelled')}
                  className="btn bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="btn bg-red-500 text-white hover:bg-red-600 text-sm flex items-center gap-1"
                >
                  <Trash2 size={16} />
                  Delete ({selectedInstances.size})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instances List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredInstances.length > 0 ? (
          filteredInstances.map(instance => {
            const isPast = new Date(instance.date) < new Date();
            const isToday = new Date(instance.date).toDateString() === new Date().toDateString();
            const isSelected = selectedInstances.has(instance.id);
            
            return (
              <div 
                key={instance.id} 
                className={`p-4 rounded-lg border transition-all ${
                  isSelected ? 'border-primary-500 bg-primary-50' :
                  isToday ? 'border-primary-400 bg-primary-50' :
                  isPast && instance.status !== 'completed' ? 'border-red-200 bg-red-50' :
                  'border-gray-200 bg-white hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {bulkMode && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(instance.id)}
                        className="w-5 h-5 text-primary-600 rounded"
                      />
                    )}
                    
                    <Calendar size={20} className={
                      isToday ? 'text-primary-600' :
                      isPast && instance.status !== 'completed' ? 'text-red-600' :
                      'text-gray-400'
                    } />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{formatDate(instance.date)}</p>
                        {isToday && <span className="badge badge-info text-xs">Today</span>}
                        {isPast && instance.status !== 'completed' && (
                          <span className="badge badge-danger text-xs">Overdue</span>
                        )}
                        <span className={`badge badge-${getJobStatusColor(instance.status)} text-xs`}>
                          {instance.status}
                        </span>
                        {instance.googleEventId && (
                          <span className="text-xs text-green-600">📅 Synced</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">Instance #{instance.instanceNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(instance.amount)}</p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions (only show if NOT in bulk mode) */}
                {!bulkMode && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                    {instance.status === 'scheduled' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(instance.id, 'in-progress')}
                          className="btn btn-secondary text-xs flex items-center gap-1"
                        >
                          <Clock size={14} />
                          Start
                        </button>
                        <button
                          onClick={() => handleStatusChange(instance.id, 'completed')}
                          className="btn btn-success text-xs flex items-center gap-1"
                        >
                          <CheckCircle size={14} />
                          Complete
                        </button>
                        <button
                          onClick={() => handleStatusChange(instance.id, 'cancelled')}
                          className="btn bg-gray-50 text-gray-600 hover:bg-gray-100 text-xs flex items-center gap-1"
                        >
                          <XCircle size={14} />
                          Cancel
                        </button>
                      </>
                    )}
                    {instance.status === 'in-progress' && (
                      <button
                        onClick={() => handleStatusChange(instance.id, 'completed')}
                        className="btn btn-success text-xs flex items-center gap-1"
                      >
                        <CheckCircle size={14} />
                        Complete
                      </button>
                    )}
                    {instance.status === 'completed' && (
                      <button
                        onClick={() => handleStatusChange(instance.id, 'scheduled')}
                        className="btn btn-secondary text-xs"
                      >
                        Mark as Scheduled
                      </button>
                    )}
                    {instance.status === 'cancelled' && (
                      <button
                        onClick={() => handleStatusChange(instance.id, 'scheduled')}
                        className="btn btn-secondary text-xs"
                      >
                        Reschedule
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteInstance(instance.id)}
                      className="btn bg-red-50 text-red-600 hover:bg-red-100 text-xs flex items-center gap-1 ml-auto"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Calendar size={48} className="mx-auto mb-4 text-gray-400" />
            <p>No instances found for this filter.</p>
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

export default RecurringJobManager;