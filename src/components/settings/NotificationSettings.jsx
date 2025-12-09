import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Save, Bell, Mail, MessageSquare } from 'lucide-react';

const NotificationSettings = () => {
  const [formData, setFormData] = useState({
    email: {
      enabled: true,
      newJobCreated: true,
      jobCompleted: true,
      jobCancelled: false,
      paymentReceived: true,
      invoiceGenerated: true,
      invoiceOverdue: true,
      newClientAdded: false,
      dailySummary: true,
      weeklySummary: false
    },
    browser: {
      enabled: true,
      newJobCreated: true,
      jobDueToday: true,
      paymentReceived: true,
      invoiceOverdue: true
    },
    sms: {
      enabled: false,
      jobDueToday: false,
      invoiceOverdue: false,
      paymentReceived: false
    },
    emailAddresses: {
      primary: '',
      billing: '',
      notifications: ''
    },
    phoneNumber: '',
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'notifications');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setFormData(docSnap.data());
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    }
  };

  const handleChannelToggle = (channel, field) => {
    setFormData(prev => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [field]: !prev[channel][field]
      }
    }));
  };

  const handleEmailChange = (type, value) => {
    setFormData(prev => ({
      ...prev,
      emailAddresses: {
        ...prev.emailAddresses,
        [type]: value
      }
    }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      await setDoc(doc(db, 'settings', 'notifications'), {
        ...formData,
        updatedAt: new Date().toISOString()
      });

      alert('Notification settings saved successfully! ✅');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const NotificationRow = ({ label, channel, field, icon: Icon }) => (
    <div className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors">
      <div className="flex items-center gap-3">
        {Icon && <Icon size={18} className="text-gray-400" />}
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={formData[channel][field]}
          onChange={() => handleChannelToggle(channel, field)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
      </label>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email addresses */}
      <div className="p-4 border border-gray-200 rounded-lg space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Mail size={20} />
          Email Addresses
        </h3>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="label">Primary Email</label>
            <input
              type="email"
              value={formData.emailAddresses.primary}
              onChange={(e) => handleEmailChange('primary', e.target.value)}
              placeholder="admin@ceroncleaning.com"
              className="input"
            />
          </div>

          <div>
            <label className="label">Billing Email (Optional)</label>
            <input
              type="email"
              value={formData.emailAddresses.billing}
              onChange={(e) => handleEmailChange('billing', e.target.value)}
              placeholder="billing@ceroncleaning.com"
              className="input"
            />
          </div>

          <div>
            <label className="label">Notifications Email (Optional)</label>
            <input
              type="email"
              value={formData.emailAddresses.notifications}
              onChange={(e) => handleEmailChange('notifications', e.target.value)}
              placeholder="notifications@ceroncleaning.com"
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Email notifications */}
      <div className="p-4 border border-gray-200 rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Mail size={20} />
            Email Notifications
          </h3>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.email.enabled}
              onChange={() => handleChannelToggle('email', 'enabled')}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        {formData.email.enabled && (
          <div className="space-y-1">
            <NotificationRow label="New job created" channel="email" field="newJobCreated" />
            <NotificationRow label="Job completed" channel="email" field="jobCompleted" />
            <NotificationRow label="Job cancelled" channel="email" field="jobCancelled" />
            <NotificationRow label="Payment received" channel="email" field="paymentReceived" />
            <NotificationRow label="Invoice generated" channel="email" field="invoiceGenerated" />
            <NotificationRow label="Invoice overdue" channel="email" field="invoiceOverdue" />
            <NotificationRow label="New client added" channel="email" field="newClientAdded" />
            <NotificationRow label="Daily summary" channel="email" field="dailySummary" />
            <NotificationRow label="Weekly summary" channel="email" field="weeklySummary" />
          </div>
        )}
      </div>

      {/* Browser notifications */}
      <div className="p-4 border border-gray-200 rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Bell size={20} />
            Browser Notifications
          </h3>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.browser.enabled}
              onChange={() => handleChannelToggle('browser', 'enabled')}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        {formData.browser.enabled && (
          <div className="space-y-1">
            <NotificationRow label="New job created" channel="browser" field="newJobCreated" />
            <NotificationRow label="Job due today" channel="browser" field="jobDueToday" />
            <NotificationRow label="Payment received" channel="browser" field="paymentReceived" />
            <NotificationRow label="Invoice overdue" channel="browser" field="invoiceOverdue" />
          </div>
        )}
      </div>

      {/* SMS notifications */}
      <div className="p-4 border border-gray-200 rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare size={20} />
            SMS Notifications
          </h3>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.sms.enabled}
              onChange={() => handleChannelToggle('sms', 'enabled')}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        {formData.sms.enabled && (
          <>
            <div>
              <label className="label">Phone Number</label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="+1 (555) 123-4567"
                className="input"
              />
            </div>

            <div className="space-y-1">
              <NotificationRow label="Job due today" channel="sms" field="jobDueToday" />
              <NotificationRow label="Invoice overdue" channel="sms" field="invoiceOverdue" />
              <NotificationRow label="Payment received" channel="sms" field="paymentReceived" />
            </div>
          </>
        )}
      </div>

      {/* Quiet hours */}
      <div className="p-4 border border-gray-200 rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Quiet Hours</h3>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="quietHoursEnabled"
              checked={formData.quietHoursEnabled}
              onChange={handleChange}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        {formData.quietHoursEnabled && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Time</label>
              <input
                type="time"
                name="quietHoursStart"
                value={formData.quietHoursStart}
                onChange={handleChange}
                className="input"
              />
            </div>
            <div>
              <label className="label">End Time</label>
              <input
                type="time"
                name="quietHoursEnd"
                value={formData.quietHoursEnd}
                onChange={handleChange}
                className="input"
              />
            </div>
          </div>
        )}
        <p className="text-xs text-gray-500">
          No notifications will be sent during quiet hours
        </p>
      </div>

      {/* Save button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary flex items-center gap-2"
        >
          <Save size={20} />
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
  );
};

export default NotificationSettings;