import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Eye, Download, Edit2, Trash2, Plus, Filter, DollarSign, RefreshCw, XCircle } from 'lucide-react';
import { formatDate, formatCurrency, getPaymentStatusColor } from '../../utils/helpers';
import Modal from '../shared/Modal';
import InvoiceForm from './InvoiceForm';
import InvoicePreview from './InvoicePreview';
import { downloadInvoice } from '../../utils/invoiceGenerator';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [companySettings, setCompanySettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invoicesSnapshot, clientsSnapshot, jobsSnapshot, companyDoc] = await Promise.all([
        getDocs(collection(db, 'invoices')),
        getDocs(collection(db, 'clients')),
        getDocs(collection(db, 'jobs')),
        getDoc(doc(db, 'settings', 'company'))
      ]);

      const invoicesData = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const clientsData = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const jobsData = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Attach client and job data to invoices
      const enrichedInvoices = invoicesData.map(invoice => ({
        ...invoice,
        client: clientsData.find(c => c.id === invoice.clientId),
        job: jobsData.find(j => j.id === invoice.jobId)
      }));

      setInvoices(enrichedInvoices);
      setClients(clientsData);
      setJobs(jobsData);
      
      if (companyDoc.exists()) {
        setCompanySettings(companyDoc.data());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPreview(true);
  };

  const handleDownload = async (invoice) => {
    if (invoice.client && invoice.job) {
      await downloadInvoice(invoice, invoice.client, invoice.job, companySettings);
    } else {
      alert('Missing client or job data for this invoice');
    }
  };

  const handleEdit = (invoice) => {
    setSelectedInvoice(invoice);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice? This action cannot be undone.')) return;

    try {
      await deleteDoc(doc(db, 'invoices', id));
      fetchData();
      alert('Invoice deleted successfully! ✅');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Error deleting invoice. Please try again.');
    }
  };

  const handleMarkAsPaid = async (id) => {
    if (!window.confirm('Mark this invoice as paid?')) return;

    try {
      await updateDoc(doc(db, 'invoices', id), {
        status: 'paid',
        amountPaid: invoices.find(i => i.id === id).total,
        paidDate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      fetchData();
      alert('Invoice marked as paid! ✅');
    } catch (error) {
      console.error('Error updating invoice:', error);
      alert('Error updating invoice. Please try again.');
    }
  };

  const handleMarkAsPending = async (id) => {
    if (!window.confirm('Reset invoice to pending?')) return;

    try {
      await updateDoc(doc(db, 'invoices', id), {
        status: 'pending',
        amountPaid: 0,
        paidDate: null,
        updatedAt: new Date().toISOString()
      });
      fetchData();
      alert('Invoice reset to pending! ✅');
    } catch (error) {
      console.error('Error updating invoice:', error);
      alert('Error updating invoice. Please try again.');
    }
  };

  const handleVoid = async (id) => {
    if (!window.confirm('Void this invoice? This will cancel it permanently.')) return;

    try {
      await updateDoc(doc(db, 'invoices', id), {
        status: 'void',
        updatedAt: new Date().toISOString()
      });
      fetchData();
      alert('Invoice voided! ✅');
    } catch (error) {
      console.error('Error voiding invoice:', error);
      alert('Error voiding invoice. Please try again.');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setShowPreview(false);
    setSelectedInvoice(null);
    fetchData();
  };

  const filteredInvoices = invoices.filter(invoice => {
    if (filterStatus === 'all') return true;
    return invoice.status === filterStatus;
  });

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
          <h1 className="text-3xl font-display font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600 mt-1">Manage and track your invoices</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          New Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100">
          <p className="text-sm text-blue-600 mb-1">Total Invoices</p>
          <p className="text-3xl font-bold text-blue-900">{invoices.length}</p>
        </div>
        <div className="card bg-gradient-to-br from-green-50 to-green-100">
          <p className="text-sm text-green-600 mb-1">Paid</p>
          <p className="text-3xl font-bold text-green-900">
            {invoices.filter(i => i.status === 'paid').length}
          </p>
        </div>
        <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100">
          <p className="text-sm text-yellow-600 mb-1">Pending</p>
          <p className="text-3xl font-bold text-yellow-900">
            {invoices.filter(i => i.status === 'pending').length}
          </p>
        </div>
        <div className="card bg-gradient-to-br from-purple-50 to-purple-100">
          <p className="text-sm text-purple-600 mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-purple-900">
            {formatCurrency(invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0))}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-4">
          <Filter size={20} className="text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input flex-1"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="partial">Partially Paid</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="void">Void</option>
          </select>
        </div>
      </div>

      {/* Invoices table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map(invoice => (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{invoice.invoiceNumber}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-900">{invoice.client?.name || 'Unknown'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {formatDate(invoice.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {formatCurrency(invoice.total)}
                        </div>
                        {invoice.amountPaid > 0 && (
                          <div className="text-xs text-gray-500">
                            Paid: {formatCurrency(invoice.amountPaid)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge badge-${getPaymentStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-1">
                        {/* Preview */}
                        <button
                          onClick={() => handlePreview(invoice)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Preview"
                        >
                          <Eye size={16} />
                        </button>
                        
                        {/* Download */}
                        <button
                          onClick={() => handleDownload(invoice)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Download PDF"
                        >
                          <Download size={16} />
                        </button>
                        
                        {/* Edit */}
                        <button
                          onClick={() => handleEdit(invoice)}
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                          title="Edit Invoice"
                        >
                          <Edit2 size={16} />
                        </button>
                        
                        {/* Mark as Paid (only if not paid or void) */}
                        {invoice.status !== 'paid' && invoice.status !== 'void' && (
                          <button
                            onClick={() => handleMarkAsPaid(invoice.id)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Mark as Paid"
                          >
                            <DollarSign size={16} />
                          </button>
                        )}
                        
                        {/* Reset to Pending (if paid or partial) */}
                        {(invoice.status === 'paid' || invoice.status === 'partial') && (
                          <button
                            onClick={() => handleMarkAsPending(invoice.id)}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Reset to Pending"
                          >
                            <RefreshCw size={16} />
                          </button>
                        )}
                        
                        {/* Void (if not already void) */}
                        {invoice.status !== 'void' && (
                          <button
                            onClick={() => handleVoid(invoice.id)}
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                            title="Void Invoice"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                        
                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(invoice.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    No invoices found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showModal && (
        <Modal 
          isOpen={showModal} 
          onClose={handleModalClose}
          title={selectedInvoice ? 'Edit Invoice' : 'New Invoice'}
          size="xl"
        >
          <InvoiceForm invoice={selectedInvoice} onClose={handleModalClose} />
        </Modal>
      )}

      {showPreview && selectedInvoice && (
        <Modal 
          isOpen={showPreview}
          onClose={handleModalClose}
          title="Invoice Preview" 
          size="xl"
        >
          <InvoicePreview invoice={selectedInvoice} onClose={handleModalClose} companySettings={companySettings} />
        </Modal>
      )}
    </div>
  );
};

export default Invoices;