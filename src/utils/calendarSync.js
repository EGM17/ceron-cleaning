import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import GoogleCalendarService from '../services/calendar/GoogleCalendarService';

/**
 * Sync a job to Google Calendar
 * @param {Object} job - Job object
 * @returns {Promise<string>} Google Calendar event ID
 */
export const syncJobToGoogle = async (job) => {
  try {
    const isConfigured = await GoogleCalendarService.isConfigured();
    if (!isConfigured) {
      console.warn('Google Calendar not configured');
      return null;
    }

    // Check if already synced
    if (job.googleEventId) {
      // Update existing event
      await GoogleCalendarService.updateEvent(job.googleEventId, job);
      return job.googleEventId;
    } else {
      // Create new event
      const event = await GoogleCalendarService.createEvent(job);
      if (event && event.id) {
        // Save event ID to job
        await updateDoc(doc(db, 'jobs', job.id), {
          googleEventId: event.id
        });
        return event.id;
      }
    }
  } catch (error) {
    console.error('Error syncing to Google Calendar:', error);
    throw error;
  }
};

/**
 * Remove job from Google Calendar
 * @param {Object} job - Job object with googleEventId
 */
export const unsyncJobFromGoogle = async (job) => {
  try {
    if (!job.googleEventId) return;

    const isConfigured = await GoogleCalendarService.isConfigured();
    if (!isConfigured) {
      console.warn('Google Calendar not configured');
      return;
    }

    await GoogleCalendarService.deleteEvent(job.googleEventId);
    
    // Remove event ID from job
    await updateDoc(doc(db, 'jobs', job.id), {
      googleEventId: null
    });
  } catch (error) {
    console.error('Error removing from Google Calendar:', error);
    throw error;
  }
};

/**
 * Sync all jobs to Google Calendar
 * @param {Array} jobs - Array of job objects
 * @returns {Promise<Object>} Sync results
 */
export const syncAllJobsToGoogle = async (jobs) => {
  const results = {
    synced: 0,
    failed: 0,
    skipped: 0
  };

  for (const job of jobs) {
    try {
      // Skip templates and completed/cancelled jobs
      if (job.type === 'template' || 
          job.status === 'completed' || 
          job.status === 'cancelled') {
        results.skipped++;
        continue;
      }

      await syncJobToGoogle(job);
      results.synced++;
    } catch (error) {
      console.error(`Failed to sync job ${job.id}:`, error);
      results.failed++;
    }
  }

  return results;
};

/**
 * Schedule auto-sync (call this periodically)
 */
export const scheduleAutoSync = async () => {
  try {
    const isConfigured = await GoogleCalendarService.isConfigured();
    if (!isConfigured) return;

    // Get all jobs that need syncing
    const snapshot = await getDocs(collection(db, 'jobs'));
    const jobs = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(job => 
        job.type !== 'template' && 
        (job.status === 'scheduled' || job.status === 'in-progress')
      );

    const results = await syncAllJobsToGoogle(jobs);
    console.log('Auto-sync completed:', results);
    
    return results;
  } catch (error) {
    console.error('Auto-sync failed:', error);
    throw error;
  }
};