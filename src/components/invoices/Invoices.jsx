import { useState, useEffect } from 'react';
import { Plus, Search, FileText, Download, Eye, DollarSign, X, AlertCircle, RefreshCw, Edit2, Trash2 } from 'lucide-react';
import { collection, query, getDocs, orderBy, deleteDoc, doc, where, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { formatDate, formatCurrency, getPaymentStatusColor } from '../../utils/helpers';
import { downloadInvoice } from '../../utils/invoiceGenerator';
import Modal from '../shared/Modal';
import InvoiceForm from './InvoiceForm';
import InvoicePreview from './InvoicePreview';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    filterInvoices();
  }, [invoices, filterStatus, searchTerm]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const invoicesQuery = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(invoicesQuery);
      
      const invoicesData = await Promise.all(
        snapshot.docs.map(async (docSnapshot) => {
          const invoiceData = { id: docSnapshot.id, ...docSnapshot.data() };
          
          // Fetch client info
          if (invoiceData.clientId) {
            try {
              const clientDoc = await getDoc(doc(db, 'clients', invoiceData.clientId));
              if (clientDoc.exists()) {
                invoiceData.client = clientDoc.data();
              }
            } catch (error) {
              console.error('Error fetching client:', error);
            }
          }
          
          // Fetch job info
          if (invoiceData.jobId) {
            try {
              const jobDoc = await getDoc(doc(db, 'jobs', invoiceData.jobId));
              if (jobDoc.exists()) {
                invoiceData.job = jobDoc.data();
              }
            } catch (error) {
              console.error('Error fetching job:', error);
            }
          }
          
          return invoiceData;
        })
      );
      
      setInvoices(invoicesData);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterInvoices = () => {
    let filtered = [...invoices];

    if (filterStatus !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === filterStatus);
    }

    if (searchTerm) {
      filtered = filtered.filter(invoice =>
        invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredInvoices(filtered);
  };

  const handleEdit = (invoice) => {
    setSelectedInvoice(invoice);
    setShowModal(true);
  };

  const handlePreview = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPreview(true);
  };

  const handleDownload = async (invoice) => {
    if (invoice.client && invoice.job) {
      downloadInvoice(invoice, invoice.client, invoice.job);
    } else {
      alert('Missing client or job information');
    }
  };

  const handleMarkAsPaid = async (invoiceId) => {
    if (window.confirm('Mark this invoice as fully paid?')) {
      try {
        const invoice = invoices.find(inv => inv.id === invoiceId);
        await updateDoc(doc(db, 'invoices', invoiceId), {
          status: 'paid',
          amountPaid: invoice.total,
          updatedAt: new Date().toISOString()
        });
        fetchInvoices();
        alert('Invoice marked as paid! ✅');
      } catch (error) {
        console.error('Error updating invoice:', error);
        alert('Error updating invoice. Please try again.');
      }
    }
  };

  const handleMarkAsPending = async (invoiceId) => {
    if (window.confirm('Reset this invoice to pending? This will clear payment records from the invoice.')) {
      try {
        await updateDoc(doc(db, 'invoices', invoiceId), {
          status: 'pending',
          amountPaid: 0,
          payments: [],
          updatedAt: new Date().toISOString()
        });
        fetchInvoices();
        alert('Invoice reset to pending! ✅');
      } catch (error) {
        console.error('Error resetting invoice:', error);
        alert('Error resetting invoice. Please try again.');
      }
    }
  };

  const handleVoidInvoice = async (invoiceId) => {
    if (window.confirm('Void this invoice? This marks it as cancelled for your client.')) {
      try {
        await updateDoc(doc(db, 'invoices', invoiceId), {
          status: 'void',
          updatedAt: new Date().toISOString()
        });
        fetchInvoices();
        alert('Invoice voided! ✅');
      } catch (error) {
        console.error('Error voiding invoice:', error);
        alert('Error voiding invoice. Please try again.');
      }
    }
  };

  const handleUnvoidInvoice = async (invoiceId) => {
    if (window.confirm('Reactivate this voided invoice?')) {
      try {
        const invoice = invoices.find(inv => inv.id === invoiceId);
        const newStatus = invoice.amountPaid >= invoice.total ? 'paid' :
                         invoice.amountPaid > 0 ? 'partial' : 'pending';
        
        await updateDoc(doc(db, 'invoices', invoiceId), {
          status: newStatus,
          updatedAt: new Date().toISOString()
        });
        fetchInvoices();
        alert('Invoice reactivated! ✅');
      } catch (error) {
        console.error('Error reactivating invoice:', error);
        alert('Error reactivating invoice. Please try again.');
      }
    }
  };

  const handleDelete = async (invoiceId) => {
    if (window.confirm('⚠️ PERMANENTLY DELETE this invoice? This action cannot be undone!')) {
      try {
        await deleteDoc(doc(db, 'invoices', invoiceId));
        fetchInvoices();
        alert('Invoice deleted permanently! ✅');
      } catch (error) {
        console.error('Error deleting invoice:', error);
        alert('Error deleting invoice. Please try again.');
      }
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setShowPreview(false);
    setSelectedInvoice(null);
    fetchInvoices();
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
          <h1 className="text-3xl font-display font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600 mt-1">Manage your invoices and billing</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          New Invoice
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input"
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
      </div>

      {/* Invoices table */}
      {filteredInvoices.length > 0 ? (
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
                {filteredInvoices.map(invoice => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-gray-400" />
                        <span className="font-medium text-gray-900">{invoice.invoiceNumber}</span>
                      </div>
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
                            onClick={() => handleVoidInvoice(invoice.id)}
                            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                            title="Void Invoice"
                          >
                            <AlertCircle size={16} />
                          </button>
                        )}
                        
                        {/* Unvoid (if void) */}
                        {invoice.status === 'void' && (
                          <button
                            onClick={() => handleUnvoidInvoice(invoice.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Reactivate Invoice"
                          >
                            <RefreshCw size={16} />
                          </button>
                        )}
                        
                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(invoice.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Permanently"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card text-center py-12">
          <FileText size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No invoices found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'Try adjusting your search' : 'Create your first invoice'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowModal(true)}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <Plus size={20} />
              New Invoice
            </button>
          )}
        </div>
      )}

      {/* Invoice form modal */}
      <Modal
        isOpen={showModal}
        onClose={handleModalClose}
        title={selectedInvoice ? 'Edit Invoice' : 'New Invoice'}
        size="xl"
      >
        <InvoiceForm
          invoice={selectedInvoice}
          onClose={handleModalClose}
        />
      </Modal>

      {/* Invoice preview modal */}
      <Modal
        isOpen={showPreview}
        onClose={handleModalClose}
        title="Invoice Preview"
        size="xl"
      >
        {selectedInvoice && (
          <InvoicePreview
            invoice={selectedInvoice}
            onClose={handleModalClose}
          />
        )}
      </Modal>
    </div>
  );
};

export default Invoices;