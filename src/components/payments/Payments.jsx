import { useState, useEffect } from 'react';
import { Plus, Search, DollarSign, Calendar, CreditCard, Banknote, Building2, Image as ImageIcon } from 'lucide-react';
import { collection, query, getDocs, orderBy, deleteDoc, doc, where, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { formatDate, formatCurrency } from '../../utils/helpers';
import Modal from '../shared/Modal';
import PaymentForm from './PaymentForm';
import QuickPayment from './QuickPayment';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showQuickPayment, setShowQuickPayment] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [filterMethod, setFilterMethod] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [payments, filterMethod, searchTerm]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const paymentsQuery = query(collection(db, 'payments'), orderBy('date', 'desc'));
      const snapshot = await getDocs(paymentsQuery);
      
      const paymentsData = await Promise.all(
        snapshot.docs.map(async (docSnapshot) => {
          const paymentData = { id: docSnapshot.id, ...docSnapshot.data() };
          
          // Fetch invoice info
          if (paymentData.invoiceId) {
            try {
              const invoiceDoc = await getDoc(doc(db, 'invoices', paymentData.invoiceId));
              if (invoiceDoc.exists()) {
                paymentData.invoice = invoiceDoc.data();
              }
            } catch (error) {
              console.error('Error fetching invoice:', error);
            }
          }
          
          // Fetch job info
          if (paymentData.jobId) {
            try {
              const jobDoc = await getDoc(doc(db, 'jobs', paymentData.jobId));
              if (jobDoc.exists()) {
                paymentData.job = jobDoc.data();
              }
            } catch (error) {
              console.error('Error fetching job:', error);
            }
          }
          
          return paymentData;
        })
      );
      
      setPayments(paymentsData);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = [...payments];

    if (filterMethod !== 'all') {
      filtered = filtered.filter(payment => payment.method === filterMethod);
    }

    if (searchTerm) {
      filtered = filtered.filter(payment =>
        payment.job?.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.invoice?.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPayments(filtered);
  };

  const handleEdit = (payment) => {
    setSelectedPayment(payment);
    setShowModal(true);
  };

  const handleDelete = async (paymentId) => {
    if (window.confirm('Are you sure you want to delete this payment record? This will update the related invoice.')) {
      try {
        const payment = payments.find(p => p.id === paymentId);
        
        // Delete payment
        await deleteDoc(doc(db, 'payments', paymentId));

        // Update invoice if linked
        if (payment.invoiceId) {
          const invoiceRef = doc(db, 'invoices', payment.invoiceId);
          const invoiceSnap = await getDoc(invoiceRef);
          
          if (invoiceSnap.exists()) {
            const invoiceData = invoiceSnap.data();
            const newAmountPaid = Math.max(0, (invoiceData.amountPaid || 0) - payment.amount);
            const newStatus = newAmountPaid <= 0 ? 'pending' : 
                             newAmountPaid >= invoiceData.total ? 'paid' : 'partial';
            
            // Remove payment from payments array
            const updatedPayments = (invoiceData.payments || []).filter(p => 
              !(p.amount === payment.amount && p.date === payment.date && p.method === payment.method)
            );
            
            await updateDoc(invoiceRef, {
              amountPaid: newAmountPaid,
              status: newStatus,
              payments: updatedPayments,
              updatedAt: new Date().toISOString()
            });
          }
        }

        alert('Payment deleted and invoice updated successfully! ✅');
        fetchPayments();
      } catch (error) {
        console.error('Error deleting payment:', error);
        alert('Error deleting payment. Please try again.');
      }
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setShowQuickPayment(false);
    setSelectedPayment(null);
    fetchPayments();
  };

  const getMethodIcon = (method) => {
    switch (method) {
      case 'check':
        return <Banknote size={16} className="text-blue-600" />;
      case 'cash':
        return <DollarSign size={16} className="text-green-600" />;
      case 'transfer':
        return <Building2 size={16} className="text-purple-600" />;
      default:
        return <CreditCard size={16} className="text-gray-600" />;
    }
  };

  const getMethodColor = (method) => {
    switch (method) {
      case 'check':
        return 'bg-blue-100 text-blue-800';
      case 'cash':
        return 'bg-green-100 text-green-800';
      case 'transfer':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600 mt-1">Track and manage payment transactions</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowQuickPayment(true)}
            className="btn btn-success flex items-center gap-2"
          >
            <DollarSign size={20} />
            Quick Payment
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            New Payment
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div>
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="input"
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="transfer">Bank Transfer</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payments grid */}
      {filteredPayments.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPayments.map(payment => (
            <div key={payment.id} className="card hover:shadow-lg transition-shadow">
              {/* Payment header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    payment.method === 'cash' ? 'bg-green-100' :
                    payment.method === 'check' ? 'bg-blue-100' : 'bg-purple-100'
                  }`}>
                    {getMethodIcon(payment.method)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {formatCurrency(payment.amount)}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {payment.job?.clientName || 'Unknown Client'}
                    </p>
                  </div>
                </div>
                <span className={`badge ${getMethodColor(payment.method)}`}>
                  {payment.method}
                </span>
              </div>

              {/* Payment details */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar size={16} />
                  <span>{formatDate(payment.date)}</span>
                </div>
                {payment.invoice?.invoiceNumber && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CreditCard size={16} />
                    <span>Invoice: {payment.invoice.invoiceNumber}</span>
                  </div>
                )}
                {payment.notes && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {payment.notes}
                  </p>
                )}
                {payment.photo && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <ImageIcon size={16} />
                    <span>Receipt attached</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-gray-100">
                {payment.photo && (
                  <button
                    onClick={() => window.open(payment.photo, '_blank')}
                    className="flex-1 btn btn-secondary text-sm"
                  >
                    View Receipt
                  </button>
                )}
                <button
                  onClick={() => handleDelete(payment.id)}
                  className="flex-1 btn bg-red-50 text-red-600 hover:bg-red-100 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <DollarSign size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No payments found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'Try adjusting your search' : 'Record your first payment'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowQuickPayment(true)}
              className="btn btn-success inline-flex items-center gap-2"
            >
              <DollarSign size={20} />
              Quick Payment
            </button>
          )}
        </div>
      )}

      {/* Payment form modal */}
      <Modal
        isOpen={showModal}
        onClose={handleModalClose}
        title="Record Payment"
        size="lg"
      >
        <PaymentForm
          payment={selectedPayment}
          onClose={handleModalClose}
        />
      </Modal>

      {/* Quick payment modal */}
      <Modal
        isOpen={showQuickPayment}
        onClose={handleModalClose}
        title="Quick Payment"
        size="md"
      >
        <QuickPayment onClose={handleModalClose} />
      </Modal>
    </div>
  );
};

export default Payments;