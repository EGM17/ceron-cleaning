import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Zap } from 'lucide-react';

const QuickPayment = ({ onClose }) => {
  const [formData, setFormData] = useState({
    invoiceId: '',
    amount: '',
    method: 'cash',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const invoicesSnapshot = await getDocs(collection(db, 'invoices'));
      const invoicesData = invoicesSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(inv => inv.status !== 'paid'); // Only unpaid invoices
      
      setInvoices(invoicesData);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Auto-fill amount when invoice is selected
    if (name === 'invoiceId') {
      const selectedInvoice = invoices.find(inv => inv.id === value);
      if (selectedInvoice) {
        const balance = selectedInvoice.total - (selectedInvoice.amountPaid || 0);
        setFormData(prev => ({
          ...prev,
          amount: balance.toString()
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);

      // Create payment record
      await addDoc(collection(db, 'payments'), {
        invoiceId: formData.invoiceId,
        jobId: invoices.find(inv => inv.id === formData.invoiceId)?.jobId || '',
        amount: parseFloat(formData.amount),
        method: formData.method,
        date: formData.date,
        notes: 'Quick payment',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Update invoice
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
            notes: 'Quick payment'
          }],
          updatedAt: new Date().toISOString()
        });
      }

      alert('Payment recorded successfully! ✅');
      onClose();
    } catch (error) {
      console.error('Error recording quick payment:', error);
      alert('Error recording payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
        <Zap size={24} className="text-green-600" />
        <div>
          <h3 className="font-semibold text-green-900">Quick Payment</h3>
          <p className="text-sm text-green-700">Record a payment instantly</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Invoice selection */}
        <div>
          <label className="label">Select Invoice *</label>
          <select
            name="invoiceId"
            value={formData.invoiceId}
            onChange={handleChange}
            required
            className="input"
          >
            <option value="">Choose an invoice...</option>
            {invoices.map(invoice => {
              const balance = invoice.total - (invoice.amountPaid || 0);
              return (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNumber} - {invoice.client?.name || 'Unknown'} - 
                  Balance: ${balance.toFixed(2)}
                </option>
              );
            })}
          </select>
        </div>

        {/* Amount */}
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
            className="input text-2xl font-bold text-center"
          />
        </div>

        {/* Method and date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Method *</label>
            <select
              name="method"
              value={formData.method}
              onChange={handleChange}
              required
              className="input"
            >
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="transfer">Transfer</option>
            </select>
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

        {/* Actions */}
        <div className="flex gap-3 pt-4">
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
            className="flex-1 btn btn-success"
            disabled={loading}
          >
            {loading ? 'Processing...' : '⚡ Record Payment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuickPayment;