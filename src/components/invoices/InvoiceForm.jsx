import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Plus, X } from 'lucide-react';

const InvoiceForm = ({ invoice, onClose }) => {
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    clientId: '',
    jobId: '', // Optional now
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    serviceDescription: '',
    baseAmount: '',
    additionalCharges: [],
    discount: 0,
    discountPercent: 0,
    tax: 0,
    taxPercent: 0,
    notes: ''
  });

  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newCharge, setNewCharge] = useState({ 
    description: '', 
    amount: '', 
    date: new Date().toISOString().split('T')[0],
    jobId: ''
  });

  useEffect(() => {
    fetchData();
    if (!invoice) {
      generateInvoiceNumber();
    }
  }, []);

  useEffect(() => {
    if (invoice) {
      setFormData({
        ...invoice,
        date: new Date(invoice.date).toISOString().split('T')[0],
        dueDate: invoice.dueDate ? 
          new Date(invoice.dueDate).toISOString().split('T')[0] : ''
      });
    }
  }, [invoice]);

  const fetchData = async () => {
    try {
      const [jobsSnapshot, clientsSnapshot] = await Promise.all([
        getDocs(collection(db, 'jobs')),
        getDocs(collection(db, 'clients'))
      ]);

      setJobs(jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setClients(clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() + 10000).toString().padStart(4, '0');
    setFormData(prev => ({ ...prev, invoiceNumber: `INV-${year}-${random}` }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Auto-fill when job is selected (optional)
    if (name === 'jobId' && value) {
      const selectedJob = jobs.find(j => j.id === value);
      if (selectedJob) {
        setFormData(prev => ({
          ...prev,
          clientId: selectedJob.clientId,
          baseAmount: selectedJob.amount || prev.baseAmount,
          serviceDescription: selectedJob.description || prev.serviceDescription
        }));
      }
    }
  };

  const handleAddCharge = () => {
    if (newCharge.description && newCharge.amount && newCharge.date) {
      setFormData(prev => ({
        ...prev,
        additionalCharges: [...prev.additionalCharges, {
          description: newCharge.description,
          amount: parseFloat(newCharge.amount),
          date: newCharge.date,
          jobId: newCharge.jobId || null
        }]
      }));
      setNewCharge({ 
        description: '', 
        amount: '', 
        date: new Date().toISOString().split('T')[0],
        jobId: ''
      });
    }
  };

  const handleRemoveCharge = (index) => {
    setFormData(prev => ({
      ...prev,
      additionalCharges: prev.additionalCharges.filter((_, i) => i !== index)
    }));
  };

  const calculateTotals = () => {
    const base = parseFloat(formData.baseAmount) || 0;
    const charges = formData.additionalCharges.reduce((sum, charge) => sum + charge.amount, 0);
    const subtotal = base + charges;
    
    const discount = formData.discountPercent ? 
      (subtotal * formData.discountPercent / 100) : 
      parseFloat(formData.discount) || 0;
    const afterDiscount = subtotal - discount;
    
    const tax = formData.taxPercent ? 
      (afterDiscount * formData.taxPercent / 100) : 
      parseFloat(formData.tax) || 0;
    
    const total = afterDiscount + tax;

    return { subtotal, discount, tax, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const { subtotal, discount, tax, total } = calculateTotals();

      const invoiceData = {
        invoiceNumber: formData.invoiceNumber,
        clientId: formData.clientId,
        jobId: formData.jobId || null, // Can be null now
        date: formData.date,
        dueDate: formData.dueDate || null,
        serviceDescription: formData.serviceDescription,
        baseAmount: parseFloat(formData.baseAmount),
        additionalCharges: formData.additionalCharges,
        discount,
        discountPercent: parseFloat(formData.discountPercent) || 0,
        tax,
        taxPercent: parseFloat(formData.taxPercent) || 0,
        subtotal,
        total,
        amountPaid: 0,
        status: 'pending',
        notes: formData.notes,
        updatedAt: new Date().toISOString()
      };

      if (invoice) {
        await updateDoc(doc(db, 'invoices', invoice.id), invoiceData);
        alert('Invoice updated successfully! ✅');
      } else {
        await addDoc(collection(db, 'invoices'), {
          ...invoiceData,
          createdAt: new Date().toISOString()
        });
        alert('Invoice created successfully! ✅');
      }

      onClose();
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('Error saving invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, discount, tax, total } = calculateTotals();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Invoice details */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Invoice Number *</label>
          <input
            type="text"
            name="invoiceNumber"
            value={formData.invoiceNumber}
            onChange={handleChange}
            required
            className="input"
          />
        </div>
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
      </div>

      <div>
        <label className="label">Due Date</label>
        <input
          type="date"
          name="dueDate"
          value={formData.dueDate}
          onChange={handleChange}
          className="input"
        />
      </div>

      {/* Client selection (required) */}
      <div>
        <label className="label">Client *</label>
        <select
          name="clientId"
          value={formData.clientId}
          onChange={handleChange}
          required
          className="input"
        >
          <option value="">Select a client</option>
          {clients.map(client => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>

      {/* Job selection (OPTIONAL now) */}
      <div>
        <label className="label">Job (Optional)</label>
        <select
          name="jobId"
          value={formData.jobId}
          onChange={handleChange}
          className="input"
        >
          <option value="">No job linked</option>
          {jobs.map(job => (
            <option key={job.id} value={job.id}>
              {job.clientName} - {job.type} ({new Date(job.date).toLocaleDateString()})
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          You can create an invoice without linking to a specific job
        </p>
      </div>

      {/* Service description */}
      <div>
        <label className="label">Service Description *</label>
        <textarea
          name="serviceDescription"
          value={formData.serviceDescription}
          onChange={handleChange}
          required
          rows="3"
          className="input"
          placeholder="Describe the service provided..."
        />
      </div>

      {/* Base amount */}
      <div>
        <label className="label">Base Amount ($) *</label>
        <input
          type="number"
          name="baseAmount"
          value={formData.baseAmount}
          onChange={handleChange}
          required
          min="0"
          step="0.01"
          className="input"
        />
      </div>

      {/* Additional charges */}
      <div>
        <label className="label">Additional Services</label>
        <div className="space-y-2">
          {formData.additionalCharges.map((charge, index) => (
            <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="font-medium">{charge.description}</p>
                <p className="text-xs text-gray-500">
                  Date: {new Date(charge.date).toLocaleDateString()}
                  {charge.jobId && ` • Job linked`}
                </p>
              </div>
              <span className="font-medium">${charge.amount.toFixed(2)}</span>
              <button
                type="button"
                onClick={() => handleRemoveCharge(index)}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-3 p-4 border-2 border-dashed border-gray-300 rounded-lg space-y-3">
          <p className="text-sm font-medium text-gray-700">Add Additional Service</p>
          
          <input
            type="text"
            value={newCharge.description}
            onChange={(e) => setNewCharge({ ...newCharge, description: e.target.value })}
            placeholder="Service description"
            className="input w-full"
          />
          
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              value={newCharge.amount}
              onChange={(e) => setNewCharge({ ...newCharge, amount: e.target.value })}
              placeholder="Amount"
              min="0"
              step="0.01"
              className="input"
            />
            <input
              type="date"
              value={newCharge.date}
              onChange={(e) => setNewCharge({ ...newCharge, date: e.target.value })}
              className="input"
            />
          </div>
          
          <select
            value={newCharge.jobId}
            onChange={(e) => setNewCharge({ ...newCharge, jobId: e.target.value })}
            className="input w-full"
          >
            <option value="">No job linked (optional)</option>
            {jobs.map(job => (
              <option key={job.id} value={job.id}>
                {job.clientName} - {job.type} ({new Date(job.date).toLocaleDateString()})
              </option>
            ))}
          </select>
          
          <button
            type="button"
            onClick={handleAddCharge}
            className="btn btn-secondary w-full flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Add Service
          </button>
        </div>
      </div>

      {/* Discount and Tax */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Discount (%)</label>
          <input
            type="number"
            name="discountPercent"
            value={formData.discountPercent}
            onChange={handleChange}
            min="0"
            max="100"
            step="0.1"
            className="input"
          />
        </div>
        <div>
          <label className="label">Tax (%)</label>
          <input
            type="number"
            name="taxPercent"
            value={formData.taxPercent}
            onChange={handleChange}
            min="0"
            max="100"
            step="0.1"
            className="input"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="label">Notes</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows="2"
          className="input"
          placeholder="Additional notes..."
        />
      </div>

      {/* Total summary */}
      <div className="p-4 bg-gray-50 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span>Subtotal:</span>
          <span className="font-medium">${subtotal.toFixed(2)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-sm text-red-600">
            <span>Discount:</span>
            <span>-${discount.toFixed(2)}</span>
          </div>
        )}
        {tax > 0 && (
          <div className="flex justify-between text-sm">
            <span>Tax:</span>
            <span className="font-medium">${tax.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
          <span>Total:</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Form actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 btn btn-secondary"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 btn btn-primary"
          disabled={loading}
        >
          {loading ? 'Saving...' : (invoice ? 'Update Invoice' : 'Create Invoice')}
        </button>
      </div>
    </form>
  );
};

export default InvoiceForm;