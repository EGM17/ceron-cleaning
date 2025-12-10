import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

class GoogleCalendarService {
  constructor() {
    this.gapi = null;
    this.gapiInited = false;
    this.gisInited = false;
    this.tokenClient = null;
    this.accessToken = null;
    this.expiryDate = null;
    
    this.CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    this.API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
    this.BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://us-central1-YOUR-PROJECT.cloudfunctions.net';
    this.DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
    this.SCOPES = 'https://www.googleapis.com/auth/calendar.events';
  }

  async initialize() {
    if (this.gapiInited && this.gisInited) return true;

    return new Promise((resolve, reject) => {
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

      const gisScript = document.createElement('script');
      gisScript.src = 'https://accounts.google.com/gsi/client';
      gisScript.onload = () => {
        this.tokenClient = window.google.accounts.oauth2.initCodeClient({
          client_id: this.CLIENT_ID,
          scope: this.SCOPES,
          ux_mode: 'popup',
          callback: async (response) => {
            if (response.code) {
              await this.exchangeCode(response.code);
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

  async exchangeCode(code) {
    try {
      const response = await fetch(`${this.BACKEND_URL}/exchangeGoogleCode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      if (!response.ok) throw new Error('Exchange failed');
      
      await this.loadToken();
    } catch (error) {
      console.error('Error exchanging code:', error);
      throw error;
    }
  }

  async loadToken() {
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'calendar'));
      if (settingsDoc.exists()) {
        const settings = settingsDoc.data();
        const google = settings.providers?.google;
        
        if (google?.enabled && google?.accessToken) {
          this.accessToken = google.accessToken;
          this.expiryDate = google.expiryDate;
          
          // Check if expired
          if (this.expiryDate && Date.now() >= this.expiryDate - 5 * 60 * 1000) {
            console.log('Token expired, refreshing...');
            await this.refreshAccessToken();
          }
          
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error loading token:', error);
      return false;
    }
  }

  async refreshAccessToken() {
    try {
      const response = await fetch(`${this.BACKEND_URL}/getAccessToken`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error('Refresh failed');
      
      const data = await response.json();
      this.accessToken = data.accessToken;
      this.expiryDate = data.expiryDate;
      
      console.log('✅ Token refreshed automatically');
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  }

  async authenticate() {
    await this.initialize();
    
    if (await this.loadToken()) {
      return true;
    }

    return new Promise((resolve) => {
      this.tokenClient.requestCode();
      setTimeout(() => resolve(true), 3000);
    });
  }

  async isConfigured() {
    return await this.loadToken();
  }

  async disconnect() {
    try {
      if (this.accessToken && window.google?.accounts?.oauth2) {
        window.google.accounts.oauth2.revoke(this.accessToken);
      }
      
      this.accessToken = null;
      this.expiryDate = null;
      
      await deleteDoc(doc(db, 'settings', 'calendar'));
      console.log('✅ Disconnected');
    } catch (error) {
      console.error('Error disconnecting:', error);
      throw error;
    }
  }

  async ensureValidToken() {
    if (!this.accessToken) {
      await this.loadToken();
    }
    
    if (this.expiryDate && Date.now() >= this.expiryDate - 5 * 60 * 1000) {
      await this.refreshAccessToken();
    }
    
    this.gapi.client.setToken({ access_token: this.accessToken });
  }

  async createEvent(job) {
    await this.initialize();
    await this.ensureValidToken();

    try {
      const [year, month, day] = job.date.split('-').map(Number);
      const [startHour, startMin] = (job.time || '09:00').split(':').map(Number);
      const [endHour, endMin] = (job.endTime || '11:00').split(':').map(Number);
      
      const startDateTime = new Date(year, month - 1, day, startHour, startMin, 0);
      const endDateTime = new Date(year, month - 1, day, endHour, endMin, 0);

      let description = job.description || 'Cleaning job';
      if (job.notes) description += `\n\nNotes: ${job.notes}`;
      if (job.amount) description += `\n\nAmount: $${job.amount.toFixed(2)}`;

      const event = {
        summary: `${job.jobType === 'residential' ? '🏠' : '🏢'} ${job.clientName}`,
        description,
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
        resource: event
      });

      console.log('✅ Event created');
      return {
        id: request.result.id,
        htmlLink: request.result.htmlLink
      };
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  async updateEvent(eventId, job) {
    await this.initialize();
    await this.ensureValidToken();

    try {
      const [year, month, day] = job.date.split('-').map(Number);
      const [startHour, startMin] = (job.time || '09:00').split(':').map(Number);
      const [endHour, endMin] = (job.endTime || '11:00').split(':').map(Number);
      
      const startDateTime = new Date(year, month - 1, day, startHour, startMin, 0);
      const endDateTime = new Date(year, month - 1, day, endHour, endMin, 0);

      let description = job.description || 'Cleaning job';
      if (job.notes) description += `\n\nNotes: ${job.notes}`;
      if (job.amount) description += `\n\nAmount: $${job.amount.toFixed(2)}`;

      const event = {
        summary: `${job.jobType === 'residential' ? '🏠' : '🏢'} ${job.clientName}`,
        description,
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
        eventId,
        resource: event
      });

      console.log('✅ Event updated');
      return {
        id: request.result.id,
        htmlLink: request.result.htmlLink
      };
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  async deleteEvent(eventId) {
    await this.initialize();
    await this.ensureValidToken();

    try {
      await this.gapi.client.calendar.events.delete({
        calendarId: 'primary',
        eventId
      });
      console.log('✅ Event deleted');
    } catch (error) {
      if (error.status !== 404) {
        console.error('Error deleting event:', error);
        throw error;
      }
    }
  }

  async testConnection() {
    await this.initialize();
    
    if (!this.accessToken) {
      return { success: false, message: 'Not authenticated' };
    }

    try {
      await this.ensureValidToken();
      
      const response = await this.gapi.client.calendar.calendars.get({
        calendarId: 'primary'
      });

      return {
        success: true,
        message: `Connected to: ${response.result.summary}`,
        calendarName: response.result.summary,
        timeZone: response.result.timeZone
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async syncAllJobs(jobs) {
    const results = { synced: 0, failed: 0, skipped: 0 };

    for (const job of jobs) {
      try {
        if (job.status === 'completed' || job.status === 'cancelled' || job.googleEventId) {
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