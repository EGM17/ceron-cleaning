import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Calendar, CheckCircle, XCircle, Save, AlertCircle } from 'lucide-react';
import GoogleCalendarService from '../../services/calendar/GoogleCalendarService';

const CalendarSettings = () => {
  const [settings, setSettings] = useState({
    providers: {
      google: {
        enabled: false,
        calendarId: 'primary',
        syncEnabled: true,
        reminderMinutes: [60, 1440]
      }
    },
    defaultProvider: 'google',
    syncInterval: 15,
    autoSync: true
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'calendar');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        if (data.providers?.google?.enabled && data.providers?.google?.accessToken) {
          setSettings(data);
        } else {
          setSettings({
            providers: {
              google: {
                enabled: false,
                calendarId: 'primary',
                syncEnabled: true,
                reminderMinutes: [60, 1440]
              }
            },
            defaultProvider: 'google',
            syncInterval: 15,
            autoSync: true
          });
        }
      }
    } catch (error) {
      console.error('Error fetching calendar settings:', error);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      providers: {
        ...prev.providers,
        google: {
          ...prev.providers.google,
          [field]: value
        }
      }
    }));
  };

  const handleReminderChange = (index, value) => {
    const newReminders = [...settings.providers.google.reminderMinutes];
    newReminders[index] = parseInt(value);
    handleChange('reminderMinutes', newReminders);
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      
      await setDoc(doc(db, 'settings', 'calendar'), {
        ...settings,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      alert('✅ Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleOAuthConnect = async () => {
    try {
      setLoading(true);
      const authenticated = await GoogleCalendarService.authenticate();
      
      if (authenticated) {
        await fetchSettings();
        alert('✅ Successfully connected to Google Calendar!');
      } else {
        alert('❌ Authentication failed. Please try again.');
      }
    } catch (error) {
      console.error('Error connecting to Google:', error);
      alert('Error connecting to Google Calendar. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect from Google Calendar?')) return;

    try {
      setLoading(true);
      await GoogleCalendarService.disconnect();
      
      setSettings({
        providers: {
          google: {
            enabled: false,
            calendarId: 'primary',
            syncEnabled: true,
            reminderMinutes: [60, 1440]
          }
        },
        defaultProvider: 'google',
        syncInterval: 15,
        autoSync: true
      });
      
      alert('✅ Disconnected from Google Calendar');
    } catch (error) {
      console.error('Error disconnecting:', error);
      alert('Error disconnecting. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setLoading(true);
      const result = await GoogleCalendarService.testConnection();
      
      if (result.success) {
        alert(`✅ ${result.message}\n\nCalendar: ${result.calendarName}\nTimezone: ${result.timeZone}`);
      } else {
        alert(`❌ ${result.message}`);
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      alert('Error testing connection. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isConnected = settings.providers?.google?.enabled || false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <div className="px-4 py-2 font-medium text-sm text-primary-600 border-b-2 border-primary-600">
          📅 Google Calendar
        </div>
      </div>

      {/* Connection status */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isConnected ? 'bg-green-100' : 'bg-gray-200'
          }`}>
            {isConnected ? (
              <CheckCircle className="text-green-600" size={20} />
            ) : (
              <XCircle className="text-gray-400" size={20} />
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900">Google Calendar</p>
            <p className="text-sm text-gray-500">
              {isConnected ? 'Connected and syncing' : 'Not connected'}
            </p>
          </div>
        </div>
        {isConnected ? (
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="btn bg-red-50 text-red-600 hover:bg-red-100"
          >
            {loading ? 'Disconnecting...' : 'Disconnect'}
          </button>
        ) : (
          <button
            onClick={handleOAuthConnect}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Connecting...' : 'Connect Google'}
          </button>
        )}
      </div>

      {/* Settings (only show if connected) */}
      {isConnected && (
        <>
          {/* Calendar Settings */}
          <div className="p-4 border border-gray-200 rounded-lg space-y-4">
            <h4 className="font-medium text-gray-900">Calendar Settings</h4>
            
            <div>
              <label className="label">Calendar ID</label>
              <input
                type="text"
                value={settings.providers.google.calendarId}
                onChange={(e) => handleChange('calendarId', e.target.value)}
                placeholder="primary"
                className="input"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use "primary" for your main calendar, or enter a specific calendar ID
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.providers.google.syncEnabled}
                  onChange={(e) => handleChange('syncEnabled', e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Enable automatic sync
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                Jobs will automatically sync to Google Calendar when created/edited
              </p>
            </div>

            <button
              onClick={handleTestConnection}
              disabled={loading}
              className="btn btn-secondary text-sm"
            >
              {loading ? 'Testing...' : 'Test Connection'}
            </button>
          </div>

          {/* Reminders */}
          <div className="p-4 border border-gray-200 rounded-lg space-y-4">
            <h4 className="font-medium text-gray-900">Event Reminders</h4>
            
            <div className="space-y-3">
              <div>
                <label className="label">First Reminder (minutes before)</label>
                <select
                  value={settings.providers.google.reminderMinutes[0]}
                  onChange={(e) => handleReminderChange(0, e.target.value)}
                  className="input"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="120">2 hours</option>
                </select>
              </div>

              <div>
                <label className="label">Second Reminder (minutes before)</label>
                <select
                  value={settings.providers.google.reminderMinutes[1]}
                  onChange={(e) => handleReminderChange(1, e.target.value)}
                  className="input"
                >
                  <option value="720">12 hours</option>
                  <option value="1440">1 day</option>
                  <option value="2880">2 days</option>
                  <option value="10080">1 week</option>
                </select>
              </div>
            </div>
          </div>

          {/* Global Settings */}
          <div className="p-4 border border-gray-200 rounded-lg space-y-4">
            <h4 className="font-medium text-gray-900">Global Settings</h4>
            
            <div>
              <label className="label">Auto-sync Interval (minutes)</label>
              <select
                value={settings.syncInterval}
                onChange={(e) => setSettings(prev => ({ ...prev, syncInterval: parseInt(e.target.value) }))}
                className="input"
              >
                <option value="5">Every 5 minutes</option>
                <option value="15">Every 15 minutes</option>
                <option value="30">Every 30 minutes</option>
                <option value="60">Every hour</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                How often to check for changes (future feature)
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoSync}
                  onChange={(e) => setSettings(prev => ({ ...prev, autoSync: e.target.checked }))}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Enable automatic background sync
                </span>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="btn btn-primary flex items-center gap-2"
            >
              <Save size={20} />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

          {/* Info banner */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex gap-3">
              <Calendar className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">📌 How Calendar Sync Works</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>Jobs sync automatically when created or modified</li>
                  <li>Format: MM/DD/YYYY with correct timezone</li>
                  <li>🏠 Residential = Blue, 🏢 Commercial = Green</li>
                  <li>Deleting a job removes it from calendar</li>
                  <li>Changes in calendar don't update jobs (one-way sync)</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Setup instructions (only show if not connected) */}
      {!isConnected && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex gap-2">
            <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-medium text-yellow-900 mb-1">
                🔒 Google Calendar Not Connected
              </p>
              <p className="text-sm text-yellow-800 mb-3">
                Connect your Google account to automatically sync jobs to your calendar.
              </p>
              <ul className="list-disc list-inside text-sm text-yellow-800 mb-3 space-y-1">
                <li>Events created with correct dates and times</li>
                <li>Automatic reminders before each job</li>
                <li>Share your calendar with employees</li>
                <li>View jobs on any device</li>
              </ul>
              <button
                onClick={handleOAuthConnect}
                disabled={loading}
                className="btn btn-primary text-sm"
              >
                {loading ? 'Connecting...' : 'Connect Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarSettings;