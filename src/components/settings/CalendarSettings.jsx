import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Calendar, CheckCircle, XCircle, ExternalLink, Save, AlertCircle } from 'lucide-react';

const CalendarSettings = () => {
  const [settings, setSettings] = useState({
    providers: {
      google: {
        enabled: false,
        clientId: '',
        clientSecret: '',
        refreshToken: '',
        calendarId: 'primary',
        syncEnabled: true,
        reminderMinutes: [60, 1440] // 1 hour, 1 day
      },
      outlook: {
        enabled: false,
        clientId: '',
        clientSecret: '',
        refreshToken: '',
        calendarId: '',
        syncEnabled: false
      },
      apple: {
        enabled: false,
        username: '',
        password: '',
        calendarId: '',
        syncEnabled: false
      }
    },
    defaultProvider: 'google',
    syncInterval: 15,
    autoSync: true
  });
  const [loading, setLoading] = useState(false);
  const [activeProvider, setActiveProvider] = useState('google');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'calendar');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setSettings(docSnap.data());
      }
    } catch (error) {
      console.error('Error fetching calendar settings:', error);
    }
  };

  const handleProviderChange = (provider, field, value) => {
    setSettings(prev => ({
      ...prev,
      providers: {
        ...prev.providers,
        [provider]: {
          ...prev.providers[provider],
          [field]: value
        }
      }
    }));
  };

  const handleReminderChange = (provider, index, value) => {
    const newReminders = [...settings.providers[provider].reminderMinutes];
    newReminders[index] = parseInt(value);
    handleProviderChange(provider, 'reminderMinutes', newReminders);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      await setDoc(doc(db, 'settings', 'calendar'), {
        ...settings,
        updatedAt: new Date().toISOString()
      });

      alert('Calendar settings saved successfully! ✅');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (provider) => {
    // TODO: Implement actual connection test
    alert(`Testing ${provider} connection... (Not implemented yet)`);
  };

  const handleOAuthConnect = async (provider) => {
    if (provider !== 'google') {
      alert('Only Google Calendar is implemented');
      return;
    }

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
      await GoogleCalendarService.disconnect();
      await fetchSettings();
      alert('✅ Disconnected from Google Calendar');
    } catch (error) {
      console.error('Error disconnecting:', error);
      alert('Error disconnecting. Please try again.');
    }
  };

  const renderProviderSettings = (provider, providerName) => {
    const providerSettings = settings.providers[provider];
    const isConnected = providerSettings.enabled;

    return (
      <div className="space-y-4">
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
              <p className="font-medium text-gray-900">{providerName} Calendar</p>
              <p className="text-sm text-gray-500">
                {isConnected ? 'Connected and syncing' : 'Not connected'}
              </p>
            </div>
          </div>
          {isConnected ? (
            <button
              onClick={() => handleProviderChange(provider, 'enabled', false)}
              className="btn bg-red-50 text-red-600 hover:bg-red-100"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={() => handleOAuthConnect(provider)}
              className="btn btn-primary"
            >
              Connect {providerName}
            </button>
          )}
        </div>

        {/* Provider configuration (only show if enabled) */}
        {isConnected && (
          <>
            {/* API Credentials */}
            <div className="p-4 border border-gray-200 rounded-lg space-y-4">
              <h4 className="font-medium text-gray-900">API Credentials</h4>
              
              <div>
                <label className="label">Client ID</label>
                <input
                  type="text"
                  value={providerSettings.clientId}
                  onChange={(e) => handleProviderChange(provider, 'clientId', e.target.value)}
                  placeholder="your-client-id.apps.googleusercontent.com"
                  className="input font-mono text-sm"
                />
              </div>

              <div>
                <label className="label">Client Secret</label>
                <input
                  type="password"
                  value={providerSettings.clientSecret}
                  onChange={(e) => handleProviderChange(provider, 'clientSecret', e.target.value)}
                  placeholder="••••••••••••••••"
                  className="input font-mono text-sm"
                />
              </div>

              <div>
                <label className="label">Refresh Token (Optional)</label>
                <input
                  type="password"
                  value={providerSettings.refreshToken}
                  onChange={(e) => handleProviderChange(provider, 'refreshToken', e.target.value)}
                  placeholder="••••••••••••••••"
                  className="input font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Generated automatically after OAuth authorization
                </p>
              </div>

              <button
                onClick={() => handleTestConnection(provider)}
                className="btn btn-secondary text-sm"
              >
                Test Connection
              </button>
            </div>

            {/* Sync settings */}
            <div className="p-4 border border-gray-200 rounded-lg space-y-4">
              <h4 className="font-medium text-gray-900">Sync Settings</h4>
              
              <div>
                <label className="label">Calendar ID</label>
                <input
                  type="text"
                  value={providerSettings.calendarId}
                  onChange={(e) => handleProviderChange(provider, 'calendarId', e.target.value)}
                  placeholder="primary"
                  className="input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use "primary" for your main calendar or enter a specific calendar ID
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={providerSettings.syncEnabled}
                    onChange={(e) => handleProviderChange(provider, 'syncEnabled', e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Enable automatic sync
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Jobs will automatically sync to {providerName} Calendar
                </p>
              </div>
            </div>

            {/* Reminders */}
            {provider === 'google' && (
              <div className="p-4 border border-gray-200 rounded-lg space-y-4">
                <h4 className="font-medium text-gray-900">Event Reminders</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="label">First Reminder (minutes before)</label>
                    <select
                      value={providerSettings.reminderMinutes[0]}
                      onChange={(e) => handleReminderChange(provider, 0, e.target.value)}
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
                      value={providerSettings.reminderMinutes[1]}
                      onChange={(e) => handleReminderChange(provider, 1, e.target.value)}
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
            )}
          </>
        )}

        {/* Setup instructions */}
        {!isConnected && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex gap-3">
                <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-blue-900 flex-1">
                  <p className="font-medium mb-3">📋 Setup Instructions for {providerName}:</p>
                  
                  {provider === 'google' && (
                    <ol className="list-decimal list-inside space-y-2 text-blue-800">
                      <li>
                        <strong>Go to Google Cloud Console</strong>
                        <br />
                        <a 
                          href="https://console.cloud.google.com" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium mt-1"
                        >
                          Open Console
                          <ExternalLink size={14} />
                        </a>
                      </li>
                      <li>
                        <strong>Create or select a project</strong>
                        <br />
                        <span className="text-xs">Click "Select a project" → "New Project"</span>
                      </li>
                      <li>
                        <strong>Enable Google Calendar API</strong>
                        <br />
                        <span className="text-xs">Go to "APIs & Services" → "Enable APIs and Services" → Search "Google Calendar API" → Enable</span>
                      </li>
                      <li>
                        <strong>Create OAuth 2.0 Credentials</strong>
                        <br />
                        <span className="text-xs">Go to "Credentials" → "Create Credentials" → "OAuth client ID"</span>
                      </li>
                      <li>
                        <strong>Configure OAuth consent screen</strong>
                        <br />
                        <span className="text-xs">Select "External" → Add app name and support email</span>
                      </li>
                      <li>
                        <strong>Set redirect URI</strong>
                        <br />
                        <code className="text-xs bg-blue-100 px-2 py-1 rounded mt-1 inline-block">
                          {window.location.origin}/settings/calendar/callback
                        </code>
                      </li>
                      <li>
                        <strong>Add required scopes</strong>
                        <br />
                        <span className="text-xs">Add scope: <code className="bg-blue-100 px-1 rounded">https://www.googleapis.com/auth/calendar.events</code></span>
                      </li>
                      <li>
                        <strong>Copy Client ID and Client Secret</strong>
                        <br />
                        <span className="text-xs">Paste them in the fields above after connecting</span>
                      </li>
                      <li>
                        <strong>Click "Connect Google"</strong>
                        <br />
                        <span className="text-xs">Authorize access to your Google Calendar</span>
                      </li>
                    </ol>
                  )}

                  {provider === 'outlook' && (
                    <ol className="list-decimal list-inside space-y-2 text-blue-800">
                      <li>
                        <strong>Go to Azure Portal</strong>
                        <br />
                        <a 
                          href="https://portal.azure.com" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium mt-1"
                        >
                          Open Azure Portal
                          <ExternalLink size={14} />
                        </a>
                      </li>
                      <li>
                        <strong>Register an application</strong>
                        <br />
                        <span className="text-xs">Go to "Azure Active Directory" → "App registrations" → "New registration"</span>
                      </li>
                      <li>
                        <strong>Configure redirect URI</strong>
                        <br />
                        <code className="text-xs bg-blue-100 px-2 py-1 rounded mt-1 inline-block">
                          {window.location.origin}/settings/calendar/callback
                        </code>
                      </li>
                      <li>
                        <strong>Add API permissions</strong>
                        <br />
                        <span className="text-xs">Add "Calendars.ReadWrite" permission</span>
                      </li>
                      <li>
                        <strong>Create client secret</strong>
                        <br />
                        <span className="text-xs">Go to "Certificates & secrets" → "New client secret"</span>
                      </li>
                      <li>
                        <strong>Copy Application (client) ID and secret</strong>
                      </li>
                      <li>
                        <strong>Click "Connect Outlook"</strong>
                      </li>
                    </ol>
                  )}

                  {provider === 'apple' && (
                    <ol className="list-decimal list-inside space-y-2 text-blue-800">
                      <li>
                        <strong>Enable two-factor authentication</strong>
                        <br />
                        <span className="text-xs">Required for app-specific passwords</span>
                      </li>
                      <li>
                        <strong>Go to Apple ID settings</strong>
                        <br />
                        <a 
                          href="https://appleid.apple.com" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium mt-1"
                        >
                          Open Apple ID
                          <ExternalLink size={14} />
                        </a>
                      </li>
                      <li>
                        <strong>Generate app-specific password</strong>
                        <br />
                        <span className="text-xs">Go to "Security" → "App-Specific Passwords" → "Generate Password"</span>
                      </li>
                      <li>
                        <strong>Enter your Apple ID email and password</strong>
                      </li>
                      <li>
                        <strong>Click "Connect Apple"</strong>
                      </li>
                    </ol>
                  )}
                </div>
              </div>
            </div>

            {/* Video tutorial */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm font-medium text-gray-900 mb-2">📹 Need help?</p>
              <p className="text-sm text-gray-600 mb-3">
                Watch our step-by-step video tutorial on setting up {providerName} Calendar integration.
              </p>
              <button
                onClick={() => window.open('https://www.youtube.com/watch?v=example', '_blank')}
                className="btn btn-secondary text-sm inline-flex items-center gap-2"
              >
                Watch Tutorial
                <ExternalLink size={14} />
              </button>
            </div>

            {/* Test credentials */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex gap-2">
                <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-sm font-medium text-yellow-900 mb-1">⚠️ Testing Mode</p>
                  <p className="text-sm text-yellow-800">
                    For testing purposes, you can enable the provider without real credentials. 
                    Real sync will be enabled once you connect your actual {providerName} Calendar account.
                  </p>
                  <button
                    onClick={() => {
                      handleProviderChange(provider, 'enabled', true);
                      handleProviderChange(provider, 'clientId', 'test-client-id');
                      handleProviderChange(provider, 'clientSecret', 'test-client-secret');
                    }}
                    className="btn bg-yellow-100 text-yellow-800 hover:bg-yellow-200 text-sm mt-3"
                  >
                    Enable Test Mode
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Provider tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {['google', 'outlook', 'apple'].map((provider) => (
          <button
            key={provider}
            onClick={() => setActiveProvider(provider)}
            className={`px-4 py-2 font-medium text-sm capitalize transition-colors ${
              activeProvider === provider
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {provider === 'google' && '📅 Google'}
            {provider === 'outlook' && '📧 Outlook'}
            {provider === 'apple' && '🍎 Apple'}
          </button>
        ))}
      </div>

      {/* Active provider settings */}
      {renderProviderSettings(activeProvider, activeProvider.charAt(0).toUpperCase() + activeProvider.slice(1))}

      {/* Global settings */}
      <div className="p-4 border border-gray-200 rounded-lg space-y-4">
        <h4 className="font-medium text-gray-900">Global Settings</h4>
        
        <div>
          <label className="label">Default Calendar Provider</label>
          <select
            value={settings.defaultProvider}
            onChange={(e) => setSettings(prev => ({ ...prev, defaultProvider: e.target.value }))}
            className="input"
          >
            <option value="google">Google Calendar</option>
            <option value="outlook">Outlook Calendar</option>
            <option value="apple">Apple Calendar</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            New jobs will sync to this calendar by default
          </p>
        </div>

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
            How often to check for changes and sync
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
          <p className="text-xs text-gray-500 mt-1 ml-6">
            Jobs will automatically sync when created or modified
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex gap-3">
          <Calendar className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">📌 How Calendar Sync Works</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Jobs are synced as calendar events when created or modified</li>
              <li>Recurring jobs generate multiple calendar events automatically</li>
              <li>Deleting a job removes it from the calendar</li>
              <li>Changes in the calendar don't update jobs (one-way sync)</li>
              <li>Only scheduled and in-progress jobs are synced</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={loading}
          className="btn btn-primary flex items-center gap-2"
        >
          <Save size={20} />
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default CalendarSettings;