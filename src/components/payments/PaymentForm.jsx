import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, getDocs, query } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { Upload, X } from 'lucide-react';

const PaymentForm = ({ payment, onClose }) => {
  const [formData, setFormData] = useState({
    jobId: '',
    invoiceId: '',
    amount: '',
    method: 'cash',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    photo: ''
  });
  
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
    if (payment) {
      setFormData(payment);
      if (payment.photo) {
        setPreviewUrl(payment.photo);
      }
    }
  }, [payment]);

  const fetchData = async () => {
    try {
      const [jobsSnapshot, invoicesSnapshot] = await Promise.all([
        getDocs(collection(db, 'jobs')),
        getDocs(collection(db, 'invoices'))
      ]);

      setJobs(jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setInvoices(invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Auto-select job when invoice is selected
    if (name === 'invoiceId') {
      const selectedInvoice = invoices.find(inv => inv.id === value);
      if (selectedInvoice) {
        setFormData(prev => ({
          ...prev,
          jobId: selectedInvoice.jobId || '',
          amount: (selectedInvoice.total - (selectedInvoice.amountPaid || 0)).toString()
        }));
      }
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl('');
  };

  const uploadPhoto = async () => {
    if (!selectedFile) return formData.photo;

    const storageRef = ref(storage, `payments/${Date.now()}_${selectedFile.name}`);
    await uploadBytes(storageRef, selectedFile);
    const url = await getDownloadURL(storageRef);
    return url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setUploading(true);

      // Upload photo if any
      let photoUrl = formData.photo;
      if (selectedFile) {
        photoUrl = await uploadPhoto();
      }

      const paymentData = {
        ...formData,
        amount: parseFloat(formData.amount),
        photo: photoUrl,
        updatedAt: new Date().toISOString()
      };

      if (payment) {
        await updateDoc(doc(db, 'payments', payment.id), paymentData);
      } else {
        await addDoc(collection(db, 'payments'), {
          ...paymentData,
          createdAt: new Date().toISOString()
        });
      }

      // Update invoice if linked
      if (formData.invoiceId) {
        const invoice = invoices.find(inv => inv.id === formData.invoiceId);
        if (invoice) {
          const newAmountPaid = (invoice.amountPaid || 0) + parseFloat(formData.amount);
          const newStatus = newAmountPaid >= invoice.total ? 'paid' : 
                           newAmountPaid > 0 ? 'partial' : 'pending';
          
          await updateDoc(doc(db, 'invoices', formData.invoiceId), {
            amountPaid: newAmountPaid,
            status: newStatus,
            payments: [...(invoice.payments || []), {
              amount: parseFloat(formData.amount),
              method: formData.method,
              date: formData.date,
              notes: formData.notes
            }]
          });
        }
      }

      onClose();
    } catch (error) {
      console.error('Error saving payment:', error);
      alert('Error saving payment. Please try again.');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Invoice selection */}
      <div>
        <label className="label">Invoice (Optional)</label>
        <select
          name="invoiceId"
          value={formData.invoiceId}
          onChange={handleChange}
          className="input"
        >
          <option value="">Select an invoice</option>
          {invoices.filter(inv => inv.status !== 'paid').map(invoice => (
            <option key={invoice.id} value={invoice.id}>
              {invoice.invoiceNumber} - {invoice.client?.name || 'Unknown'} - 
              Balance: ${(invoice.total - (invoice.amountPaid || 0)).toFixed(2)}
            </option>
          ))}
        </select>
      </div>

      {/* Job selection */}
      <div>
        <label className="label">Job (Optional)</label>
        <select
          name="jobId"
          value={formData.jobId}
          onChange={handleChange}
          className="input"
        >
          <option value="">Select a job</option>
          {jobs.map(job => (
            <option key={job.id} value={job.id}>
              {job.clientName} - {job.type} ({new Date(job.date).toLocaleDateString()})
            </option>
          ))}
        </select>
      </div>

      {/* Amount and method */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Amount ($) *</label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            placeholder="0.00"
            className="input"
          />
        </div>
        <div>
          <label className="label">Payment Method *</label>
          <select
            name="method"
            value={formData.method}
            onChange={handleChange}
            required
            className="input"
          >
            <option value="cash">Cash</option>
            <option value="check">Check</option>
            <option value="transfer">Bank Transfer</option>
          </select>
        </div>
      </div>

      {/* Date */}
      <div>
        <label className="label">Payment Date *</label>
        <input
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          required
          className="input"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="label">Notes</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows="3"
          placeholder="Additional notes (check number, reference, etc.)"
          className="input"
        />
      </div>

      {/* Photo upload */}
      <div>
        <label className="label">Receipt/Check Photo</label>
        {!previewUrl ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="payment-photo-upload"
            />
            <label htmlFor="payment-photo-upload" className="cursor-pointer">
              <Upload size={40} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">
                Click to upload receipt or check photo
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG, GIF up to 10MB
              </p>
            </label>
          </div>
        ) : (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Receipt preview"
              className="w-full h-48 object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={removeFile}
              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}
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
          {loading ? (uploading ? 'Uploading...' : 'Saving...') : 'Record Payment'}
        </button>
      </div>
    </form>
  );
};

export default PaymentForm;