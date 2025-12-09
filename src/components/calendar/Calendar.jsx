import { useState, useEffect, useMemo } from 'react';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter, RefreshCw } from 'lucide-react';
import Modal from '../shared/Modal';
import JobForm from '../jobs/JobForm';
import GoogleCalendarService from '../../services/calendar/GoogleCalendarService';
import './calendar.css';

const localizer = momentLocalizer(moment);

const Calendar = () => {
  const [events, setEvents] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [showJobModal, setShowJobModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [googleCalendarEnabled, setGoogleCalendarEnabled] = useState(false);

  useEffect(() => {
    fetchJobs();
    checkGoogleCalendar();
  }, []);

  useEffect(() => {
    convertJobsToEvents();
  }, [jobs, filterType, filterStatus]);

  const checkGoogleCalendar = async () => {
    const isConfigured = await GoogleCalendarService.isConfigured();
    setGoogleCalendarEnabled(isConfigured);
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'jobs'));
      
      const jobsData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(job => job.type !== 'template'); // Exclude templates
      
      setJobs(jobsData);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const convertJobsToEvents = () => {
    let filteredJobs = [...jobs];

    // Apply filters
    if (filterType !== 'all') {
      filteredJobs = filteredJobs.filter(job => job.jobType === filterType);
    }
    if (filterStatus !== 'all') {
      filteredJobs = filteredJobs.filter(job => job.status === filterStatus);
    }

    const calendarEvents = filteredJobs.map(job => {
      const jobDate = new Date(job.date);

      // Parse time if available
      let startDate = jobDate;
      let endDate = new Date(jobDate.getTime() + 2 * 60 * 60 * 1000); // Default +2 hours

      if (job.time) {
        const [startHour, startMin] = job.time.split(':').map(Number);
        startDate = new Date(jobDate);
        startDate.setHours(startHour, startMin, 0, 0);

        if (job.endTime) {
          const [endHour, endMin] = job.endTime.split(':').map(Number);
          endDate = new Date(jobDate);
          endDate.setHours(endHour, endMin, 0, 0);
        } else {
          endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
        }
      }

      return {
        id: job.id,
        title: `${job.jobType === 'residential' ? '🏠' : '🏢'} ${job.clientName}`,
        start: startDate,
        end: endDate,
        resource: job,
        allDay: false
      };
    });

    setEvents(calendarEvents);
  };

  const handleSelectEvent = (event) => {
    setSelectedJob(event.resource);
    setShowJobModal(true);
  };

  const handleSelectSlot = ({ start }) => {
    setSelectedJob({ date: moment(start).format('YYYY-MM-DD') });
    setShowJobModal(true);
  };

  const handleEventDrop = async ({ event, start }) => {
    try {
      const newDate = moment(start).format('YYYY-MM-DD');
      
      // Update in Firestore
      await updateDoc(doc(db, 'jobs', event.id), {
        date: newDate,
        updatedAt: new Date().toISOString()
      });

      // Update in Google Calendar if enabled
      if (googleCalendarEnabled && event.resource.googleEventId) {
        await GoogleCalendarService.updateEvent(event.resource.googleEventId, {
          ...event.resource,
          date: newDate
        });
      }

      // Refresh
      fetchJobs();
      alert('Job rescheduled successfully! ✅');
    } catch (error) {
      console.error('Error rescheduling job:', error);
      alert('Error rescheduling job. Please try again.');
    }
  };

  const handleSyncToGoogle = async () => {
    if (!googleCalendarEnabled) {
      alert('Please configure Google Calendar in Settings first.');
      return;
    }

    try {
      const jobsToSync = jobs.filter(job => 
        (job.status === 'scheduled' || job.status === 'in-progress') &&
        !job.googleEventId
      );

      await GoogleCalendarService.syncAllJobs(jobsToSync);
      alert(`✅ Synced ${jobsToSync.length} jobs to Google Calendar!`);
    } catch (error) {
      console.error('Error syncing to Google Calendar:', error);
      alert('Error syncing to Google Calendar. Please try again.');
    }
  };

  const eventStyleGetter = (event) => {
    const job = event.resource;
    let backgroundColor = '#3b82f6'; // Default blue

    if (job.status === 'completed') {
      backgroundColor = '#10b981'; // Green
    } else if (job.status === 'cancelled') {
      backgroundColor = '#ef4444'; // Red
    } else if (job.status === 'in-progress') {
      backgroundColor = '#f59e0b'; // Orange
    } else if (job.jobType === 'commercial') {
      backgroundColor = '#8b5cf6'; // Purple
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '0.875rem',
        fontWeight: '500'
      }
    };
  };

  const handleModalClose = () => {
    setShowJobModal(false);
    setSelectedJob(null);
    fetchJobs();
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">
            Calendar
          </h1>
          <p className="text-gray-600">View and manage your job schedule</p>
        </div>
        <div className="flex gap-2">
          {googleCalendarEnabled && (
            <button
              onClick={handleSyncToGoogle}
              className="btn btn-secondary flex items-center gap-2"
            >
              <RefreshCw size={20} />
              Sync to Google
            </button>
          )}
          <button
            onClick={() => setShowJobModal(true)}
            className="btn btn-primary"
          >
            + New Job
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input text-sm"
          >
            <option value="all">All Types</option>
            <option value="residential">🏠 Residential</option>
            <option value="commercial">🏢 Commercial</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input text-sm"
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Legend */}
          <div className="flex gap-4 ml-auto">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-xs text-gray-600">Residential</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 rounded"></div>
              <span className="text-xs text-gray-600">Commercial</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-xs text-gray-600">Completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="card p-0 overflow-hidden">
        <div style={{ height: '700px' }}>
          <BigCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            view={view}
            onView={setView}
            date={date}
            onNavigate={setDate}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            onEventDrop={handleEventDrop}
            selectable
            resizable
            popup
            eventPropGetter={eventStyleGetter}
            views={['month', 'week', 'day']}
            step={30}
            showMultiDayTimes
            defaultDate={new Date()}
            style={{ height: '100%' }}
          />
        </div>
      </div>

      {/* Google Calendar Status */}
      {googleCalendarEnabled && (
        <div className="card bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CalendarIcon size={20} className="text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-900">Google Calendar Connected</p>
              <p className="text-sm text-green-700">Jobs will sync automatically</p>
            </div>
          </div>
        </div>
      )}

      {/* Job modal */}
      <Modal
        isOpen={showJobModal}
        onClose={handleModalClose}
        title={selectedJob?.id ? 'Edit Job' : 'New Job'}
        size="lg"
      >
        <JobForm
          job={selectedJob}
          onClose={handleModalClose}
        />
      </Modal>
    </div>
  );
};

export default Calendar;