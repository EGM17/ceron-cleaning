import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

class GoogleCalendarService {
  constructor() {
    this.gapi = null;
    this.gapiInited = false;
    this.gisInited = false;
    this.tokenClient = null;
    this.accessToken = null;
    
    // Configuración (reemplaza con tus credenciales)
    this.CLIENT_ID = '973003252784-7vcdo5nn9is8je1pjj8ar1hif0qg53k5.apps.googleusercontent.com';
    this.API_KEY = 'AIzaSyAGPmHlPHo6Ep4omEWLhktb1RNiJoyQLBw';
    this.DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
    this.SCOPES = 'https://www.googleapis.com/auth/calendar.events';
  }

  /**
   * Initialize Google API
   */
  async initialize() {
    if (this.gapiInited && this.gisInited) {
      return true;
    }

    return new Promise((resolve, reject) => {
      // Load gapi script
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.onload = () => {
        window.gapi.load('client', async () => {
          await window.gapi.client.init({
            apiKey: this.API_KEY,
            discoveryDocs: [this.DISCOVERY_DOC]
          });
          this.gapi = window.gapi;
          this.gapiInited = true;
          
          if (this.gisInited) resolve(true);
        });
      };
      document.body.appendChild(gapiScript);

      // Load gis script
      const gisScript = document.createElement('script');
      gisScript.src = 'https://accounts.google.com/gsi/client';
      gisScript.onload = () => {
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: this.CLIENT_ID,
          scope: this.SCOPES,
          callback: (response) => {
            if (response.access_token) {
              this.accessToken = response.access_token;
              this.saveToken(response.access_token);
            }
          }
        });
        this.gisInited = true;
        
        if (this.gapiInited) resolve(true);
      };
      gisScript.onerror = reject;
      document.body.appendChild(gisScript);
    });
  }

  /**
   * Save token to Firestore
   */
  async saveToken(token) {
    try {
      await setDoc(doc(db, 'settings', 'calendar'), {
        providers: {
          google: {
            enabled: true,
            accessToken: token,
            calendarId: 'primary',
            syncEnabled: true
          }
        },
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error('Error saving token:', error);
    }
  }

  /**
   * Load token from Firestore
   */
  async loadToken() {
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'calendar'));
      if (settingsDoc.exists()) {
        const settings = settingsDoc.data();
        if (settings.providers?.google?.accessToken) {
          this.accessToken = settings.providers.google.accessToken;
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error loading token:', error);
      return false;
    }
  }

  /**
   * Authenticate with Google
   */
  async authenticate() {
    await this.initialize();
    
    // Check if already has token
    if (await this.loadToken()) {
      return true;
    }

    // Request new token
    return new Promise((resolve) => {
      this.tokenClient.callback = (response) => {
        if (response.access_token) {
          this.accessToken = response.access_token;
          this.saveToken(response.access_token);
          resolve(true);
        } else {
          resolve(false);
        }
      };
      
      this.tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  }

  /**
   * Check if configured
   */
  async isConfigured() {
    return await this.loadToken();
  }

  /**
   * Disconnect
   */
  async disconnect() {
    if (this.accessToken) {
      window.google.accounts.oauth2.revoke(this.accessToken, () => {
        console.log('Token revoked');
      });
    }
    
    this.accessToken = null;
    
    // Remove from Firestore
    await setDoc(doc(db, 'settings', 'calendar'), {
      providers: {
        google: {
          enabled: false,
          accessToken: null
        }
      },
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }

  /**
   * Create Calendar Event
   */
  async createEvent(job) {
    await this.initialize();
    
    if (!this.accessToken) {
      const authenticated = await this.authenticate();
      if (!authenticated) {
        throw new Error('Authentication failed');
      }
    }

    try {
      // Parse date and time
      const jobDate = new Date(job.date);
      const [startHour, startMin] = (job.time || '09:00').split(':').map(Number);
      const [endHour, endMin] = (job.endTime || '11:00').split(':').map(Number);
      
      const startDateTime = new Date(jobDate);
      startDateTime.setHours(startHour, startMin, 0, 0);
      
      const endDateTime = new Date(jobDate);
      endDateTime.setHours(endHour, endMin, 0, 0);

      // Build description
      let description = job.description || 'Cleaning job';
      if (job.notes) description += `\n\nNotes: ${job.notes}`;
      if (job.amount) description += `\n\nAmount: $${job.amount.toFixed(2)}`;

      const event = {
        summary: `${job.jobType === 'residential' ? '🏠' : '🏢'} ${job.clientName}`,
        description: description,
        location: job.location || '',
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: 'America/Los_Angeles'
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: 'America/Los_Angeles'
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 60 },
            { method: 'popup', minutes: 1440 }
          ]
        },
        colorId: job.jobType === 'residential' ? '7' : '10'
      };

      const request = await this.gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      console.log('✅ Event created:', request.result);
      return {
        id: request.result.id,
        htmlLink: request.result.htmlLink
      };
    } catch (error) {
      console.error('Error creating event:', error);
      
      // If token expired, re-authenticate
      if (error.status === 401) {
        await this.authenticate();
        return this.createEvent(job); // Retry
      }
      
      throw error;
    }
  }

  /**
   * Update Calendar Event
   */
  async updateEvent(eventId, job) {
    await this.initialize();
    
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      // Parse date and time
      const jobDate = new Date(job.date);
      const [startHour, startMin] = (job.time || '09:00').split(':').map(Number);
      const [endHour, endMin] = (job.endTime || '11:00').split(':').map(Number);
      
      const startDateTime = new Date(jobDate);
      startDateTime.setHours(startHour, startMin, 0, 0);
      
      const endDateTime = new Date(jobDate);
      endDateTime.setHours(endHour, endMin, 0, 0);

      // Build description
      let description = job.description || 'Cleaning job';
      if (job.notes) description += `\n\nNotes: ${job.notes}`;
      if (job.amount) description += `\n\nAmount: $${job.amount.toFixed(2)}`;

      const event = {
        summary: `${job.jobType === 'residential' ? '🏠' : '🏢'} ${job.clientName}`,
        description: description,
        location: job.location || '',
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: 'America/Los_Angeles'
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: 'America/Los_Angeles'
        },
        colorId: job.jobType === 'residential' ? '7' : '10'
      };

      const request = await this.gapi.client.calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        resource: event,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      console.log('✅ Event updated:', request.result);
      return {
        id: request.result.id,
        htmlLink: request.result.htmlLink
      };
    } catch (error) {
      console.error('Error updating event:', error);
      
      if (error.status === 401) {
        await this.authenticate();
        return this.updateEvent(eventId, job);
      }
      
      throw error;
    }
  }

  /**
   * Delete Calendar Event
   */
  async deleteEvent(eventId) {
    await this.initialize();
    
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      await this.gapi.client.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      console.log('✅ Event deleted');
    } catch (error) {
      console.error('Error deleting event:', error);
      
      if (error.status === 401) {
        await this.authenticate();
        return this.deleteEvent(eventId);
      }
      
      // Ignore 404 (already deleted)
      if (error.status !== 404) {
        throw error;
      }
    }
  }

  /**
   * Test connection
   */
  async testConnection() {
    await this.initialize();
    
    if (!this.accessToken) {
      return {
        success: false,
        message: 'Not authenticated. Please connect to Google Calendar first.'
      };
    }

    try {
      const response = await this.gapi.client.calendar.calendars.get({
        calendarId: 'primary',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return {
        success: true,
        message: `Connected to: ${response.result.summary}`,
        calendarName: response.result.summary,
        timeZone: response.result.timeZone
      };
    } catch (error) {
      console.error('Error testing connection:', error);
      return {
        success: false,
        message: `Connection failed: ${error.message}`
      };
    }
  }

  /**
   * Sync all jobs
   */
  async syncAllJobs(jobs) {
    const results = { synced: 0, failed: 0, skipped: 0 };

    for (const job of jobs) {
      try {
        if (job.status === 'completed' || job.status === 'cancelled') {
          results.skipped++;
          continue;
        }

        if (job.googleEventId) {
          results.skipped++;
          continue;
        }

        await this.createEvent(job);
        results.synced++;
      } catch (error) {
        console.error(`Failed to sync job ${job.id}:`, error);
        results.failed++;
      }
    }

    return results;
  }
}

export default new GoogleCalendarService();