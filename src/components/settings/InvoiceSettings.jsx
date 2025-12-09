import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Save, FileText } from 'lucide-react';

const InvoiceSettings = () => {
  const [formData, setFormData] = useState({
    defaultTaxRate: 0,
    defaultDueInDays: 30,
    invoicePrefix: 'INV',
    invoiceNumberStart: 1000,
    paymentTerms: 'Payment is due within 30 days of invoice date.',
    notes: 'Thank you for your business!',
    includeCompanyLogo: true,
    currency: 'USD',
    currencySymbol: '$',
    dateFormat: 'MM/DD/YYYY',
    lateFeesEnabled: false,
    lateFeePercent: 5,
    lateFeeGraceDays: 7,
    sendAutoReminders: true,
    reminderDaysBefore: [7, 3, 1], // Days before due date
    reminderDaysAfter: [1, 7, 14] // Days after due date
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'invoices');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setFormData(docSnap.data());
      }
    } catch (error) {
      console.error('Error fetching invoice settings:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : 
              (type === 'number' ? parseFloat(value) : value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      await setDoc(doc(db, 'settings', 'invoices'), {
        ...formData,
        updatedAt: new Date().toISOString()
      });

      alert('Invoice settings saved successfully! ✅');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Invoice defaults */}
      <div className="p-4 border border-gray-200 rounded-lg space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <FileText size={20} />
          Invoice Defaults
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Default Tax Rate (%)</label>
            <input
              type="number"
              name="defaultTaxRate"
              value={formData.defaultTaxRate}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.1"
              className="input"
            />
          </div>

          <div>
            <label className="label">Default Due In (Days)</label>
            <input
              type="number"
              name="defaultDueInDays"
              value={formData.defaultDueInDays}
              onChange={handleChange}
              min="1"
              className="input"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Invoice Prefix</label>
            <input
              type="text"
              name="invoicePrefix"
              value={formData.invoicePrefix}
              onChange={handleChange}
              placeholder="INV"
              className="input"
            />
            <p className="text-xs text-gray-500 mt-1">
              Format: {formData.invoicePrefix}-YYYY-####
            </p>
          </div>

          <div>
            <label className="label">Starting Invoice Number</label>
            <input
              type="number"
              name="invoiceNumberStart"
              value={formData.invoiceNumberStart}
              onChange={handleChange}
              min="1"
              className="input"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Currency</label>
            <select
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              className="input"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="CAD">CAD - Canadian Dollar</option>
              <option value="MXN">MXN - Mexican Peso</option>
            </select>
          </div>

          <div>
            <label className="label">Currency Symbol</label>
            <input
              type="text"
              name="currencySymbol"
              value={formData.currencySymbol}
              onChange={handleChange}
              className="input"
            />
          </div>

          <div>
            <label className="label">Date Format</label>
            <select
              name="dateFormat"
              value={formData.dateFormat}
              onChange={handleChange}
              className="input"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY (EU)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payment terms */}
      <div className="p-4 border border-gray-200 rounded-lg space-y-4">
        <h3 className="font-semibold text-gray-900">Payment Terms & Notes</h3>

        <div>
          <label className="label">Payment Terms</label>
          <textarea
            name="paymentTerms"
            value={formData.paymentTerms}
            onChange={handleChange}
            rows="3"
            className="input"
            placeholder="Payment terms that appear on invoices..."
          />
        </div>

        <div>
          <label className="label">Default Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows="2"
            className="input"
            placeholder="Thank you message or additional notes..."
          />
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="includeCompanyLogo"
              checked={formData.includeCompanyLogo}
              onChange={handleChange}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              Include company logo on invoices
            </span>
          </label>
        </div>
      </div>

      {/* Late fees */}
      <div className="p-4 border border-gray-200 rounded-lg space-y-4">
        <h3 className="font-semibold text-gray-900">Late Fees</h3>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="lateFeesEnabled"
              checked={formData.lateFeesEnabled}
              onChange={handleChange}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              Enable late fee calculation
            </span>
          </label>
        </div>

        {formData.lateFeesEnabled && (
          <div className="grid grid-cols-2 gap-4 pl-6">
            <div>
              <label className="label">Late Fee (%)</label>
              <input
                type="number"
                name="lateFeePercent"
                value={formData.lateFeePercent}
                onChange={handleChange}
                min="0"
                max="100"
                step="0.1"
                className="input"
              />
            </div>

            <div>
              <label className="label">Grace Period (Days)</label>
              <input
                type="number"
                name="lateFeeGraceDays"
                value={formData.lateFeeGraceDays}
                onChange={handleChange}
                min="0"
                className="input"
              />
              <p className="text-xs text-gray-500 mt-1">
                Days after due date before late fee applies
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Auto reminders */}
      <div className="p-4 border border-gray-200 rounded-lg space-y-4">
        <h3 className="font-semibold text-gray-900">Automatic Reminders</h3>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="sendAutoReminders"
              checked={formData.sendAutoReminders}
              onChange={handleChange}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              Send automatic payment reminders
            </span>
          </label>
        </div>

        {formData.sendAutoReminders && (
          <div className="space-y-3 pl-6">
            <div>
              <label className="label">Reminders Before Due Date (Days)</label>
              <div className="flex gap-2">
                {[7, 3, 1].map((day, idx) => (
                  <div key={idx} className="flex-1">
                    <input
                      type="number"
                      value={formData.reminderDaysBefore[idx] || day}
                      onChange={(e) => {
                        const newReminders = [...formData.reminderDaysBefore];
                        newReminders[idx] = parseInt(e.target.value);
                        setFormData(prev => ({
                          ...prev,
                          reminderDaysBefore: newReminders
                        }));
                      }}
                      min="1"
                      className="input"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Send reminders 7, 3, and 1 days before due date
              </p>
            </div>

            <div>
              <label className="label">Reminders After Due Date (Days)</label>
              <div className="flex gap-2">
                {[1, 7, 14].map((day, idx) => (
                  <div key={idx} className="flex-1">
                    <input
                      type="number"
                      value={formData.reminderDaysAfter[idx] || day}
                      onChange={(e) => {
                        const newReminders = [...formData.reminderDaysAfter];
                        newReminders[idx] = parseInt(e.target.value);
                        setFormData(prev => ({
                          ...prev,
                          reminderDaysAfter: newReminders
                        }));
                      }}
                      min="1"
                      className="input"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Send reminders 1, 7, and 14 days after due date
              </p>
            </div>
          </div>
        )}
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

export default InvoiceSettings;