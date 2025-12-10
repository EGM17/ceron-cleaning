import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Plus, Search, Filter, Eye, Edit2, Trash2, Download, Camera } from 'lucide-react';
import { formatDate, formatCurrency } from '../../utils/helpers';
import Modal from '../shared/Modal';
import CheckForm from './CheckForm';
import CheckPreview from './CheckPreview';

const Checks = () => {
  const [checks, setChecks] = useState([]);
  const [filteredChecks, setFilteredChecks] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedCheck, setSelectedCheck] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBank, setFilterBank] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterChecks();
  }, [checks, searchTerm, filterStatus, filterBank]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [checksSnapshot, clientsSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'checks'), orderBy('createdAt', 'desc'))),
        getDocs(collection(db, 'clients'))
      ]);

      const checksData = checksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const clientsData = clientsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Enrich checks with client data
      const enrichedChecks = checksData.map(check => ({
        ...check,
        client: clientsData.find(c => c.id === check.clientId)
      }));

      setChecks(enrichedChecks);
      setClients(clientsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterChecks = () => {
    let filtered = [...checks];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(check =>
        check.checkNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        check.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        check.bank?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(check => check.status === filterStatus);
    }

    // Bank filter
    if (filterBank !== 'all') {
      filtered = filtered.filter(check => check.bank === filterBank);
    }

    setFilteredChecks(filtered);
  };

  const handlePreview = (check) => {
    setSelectedCheck(check);
    setShowPreview(true);
  };

  const handleEdit = (check) => {
    setSelectedCheck(check);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this check? This action cannot be undone.')) return;

    try {
      await deleteDoc(doc(db, 'checks', id));
      fetchData();
      alert('Check deleted successfully! ✅');
    } catch (error) {
      console.error('Error deleting check:', error);
      alert('Error deleting check. Please try again.');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setShowPreview(false);
    setSelectedCheck(null);
    fetchData();
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      deposited: 'success',
      bounced: 'danger',
      cancelled: 'secondary'
    };
    return colors[status] || 'secondary';
  };

  const uniqueBanks = [...new Set(checks.map(c => c.bank))].filter(Boolean);

  const stats = {
    total: checks.length,
    pending: checks.filter(c => c.status === 'pending').length,
    deposited: checks.filter(c => c.status === 'deposited').length,
    bounced: checks.filter(c => c.status === 'bounced').length,
    totalAmount: checks.reduce((sum, c) => sum + (c.amount || 0), 0),
    pendingAmount: checks.filter(c => c.status === 'pending').reduce((sum, c) => sum + (c.amount || 0), 0)
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
          <h1 className="text-3xl font-display font-bold text-gray-900">Checks</h1>
          <p className="text-gray-600 mt-1">Manage and track received checks</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          New Check
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100">
          <p className="text-sm text-blue-600 mb-1">Total Checks</p>
          <p className="text-3xl font-bold text-blue-900">{stats.total}</p>
        </div>
        <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100">
          <p className="text-sm text-yellow-600 mb-1">Pending</p>
          <p className="text-3xl font-bold text-yellow-900">{stats.pending}</p>
        </div>
        <div className="card bg-gradient-to-br from-green-50 to-green-100">
          <p className="text-sm text-green-600 mb-1">Deposited</p>
          <p className="text-3xl font-bold text-green-900">{stats.deposited}</p>
        </div>
        <div className="card bg-gradient-to-br from-red-50 to-red-100">
          <p className="text-sm text-red-600 mb-1">Bounced</p>
          <p className="text-3xl font-bold text-red-900">{stats.bounced}</p>
        </div>
        <div className="card bg-gradient-to-br from-purple-50 to-purple-100">
          <p className="text-sm text-purple-600 mb-1">Pending Amount</p>
          <p className="text-2xl font-bold text-purple-900">{formatCurrency(stats.pendingAmount)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search checks..."
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
              <option value="deposited">Deposited</option>
              <option value="bounced">Bounced</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <select
              value={filterBank}
              onChange={(e) => setFilterBank(e.target.value)}
              className="input"
            >
              <option value="all">All Banks</option>
              {uniqueBanks.map(bank => (
                <option key={bank} value={bank}>{bank}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Checks table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
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
              {filteredChecks.length > 0 ? (
                filteredChecks.map(check => (
                  <tr key={check.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{check.checkNumber}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-900">{check.client?.name || 'Unknown'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {check.bank}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(check.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {formatDate(check.checkDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge badge-${getStatusColor(check.status)}`}>
                        {check.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handlePreview(check)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Preview"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleEdit(check)}
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(check.id)}
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
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    No checks found
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
          title={selectedCheck ? 'Edit Check' : 'New Check'}
          size="lg"
        >
          <CheckForm check={selectedCheck} onClose={handleModalClose} />
        </Modal>
      )}

      {showPreview && selectedCheck && (
        <Modal
          isOpen={showPreview}
          onClose={handleModalClose}
          title="Check Details"
          size="lg"
        >
          <CheckPreview check={selectedCheck} onClose={handleModalClose} />
        </Modal>
      )}
    </div>
  );
};

export default Checks;