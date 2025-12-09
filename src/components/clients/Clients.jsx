import { useState, useEffect } from 'react';
import { Plus, Search, Mail, Phone, MapPin, Briefcase, DollarSign, Users } from 'lucide-react';
import { collection, query, getDocs, orderBy, deleteDoc, doc, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { formatCurrency } from '../../utils/helpers';
import Modal from '../shared/Modal';
import ClientForm from './ClientForm';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    filterClients();
  }, [clients, searchTerm]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const clientsQuery = query(collection(db, 'clients'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(clientsQuery);
      
      const clientsData = await Promise.all(
        snapshot.docs.map(async (docSnapshot) => {
          const clientData = { id: docSnapshot.id, ...docSnapshot.data() };
          
          // Get job count and total spent
          const jobsQuery = query(collection(db, 'jobs'), where('clientId', '==', docSnapshot.id));
          const jobsSnapshot = await getDocs(jobsQuery);
          
          let totalSpent = 0;
          jobsSnapshot.forEach(jobDoc => {
            totalSpent += jobDoc.data().amount || 0;
          });
          
          return {
            ...clientData,
            jobCount: jobsSnapshot.size,
            totalSpent
          };
        })
      );
      
      setClients(clientsData);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterClients = () => {
    if (!searchTerm) {
      setFilteredClients(clients);
      return;
    }

    const filtered = clients.filter(client =>
      client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredClients(filtered);
  };

  const handleEdit = (client) => {
    setSelectedClient(client);
    setShowModal(true);
  };

  const handleDelete = async (clientId) => {
    if (window.confirm('Are you sure you want to delete this client? This will not delete associated jobs.')) {
      try {
        await deleteDoc(doc(db, 'clients', clientId));
        fetchClients();
      } catch (error) {
        console.error('Error deleting client:', error);
      }
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedClient(null);
    fetchClients();
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
          <h1 className="text-3xl font-display font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600 mt-1">Manage your client relationships</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          New Client
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search clients by name, email, company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Clients grid */}
      {filteredClients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredClients.map(client => (
            <div key={client.id} className="card hover:shadow-lg transition-shadow">
              {/* Client header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {client.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{client.name}</h3>
                    {client.company && (
                      <p className="text-sm text-gray-500">{client.company}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Client details */}
              <div className="space-y-2 mb-4">
                {client.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail size={16} />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone size={16} />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin size={16} />
                    <span className="truncate">{client.address}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 mb-4">
                <div>
                  <div className="flex items-center gap-1 text-gray-500 mb-1">
                    <Briefcase size={14} />
                    <span className="text-xs">Jobs</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{client.jobCount || 0}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-gray-500 mb-1">
                    <DollarSign size={14} />
                    <span className="text-xs">Total Spent</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(client.totalSpent || 0)}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(client)}
                  className="flex-1 btn btn-secondary text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(client.id)}
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
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No clients found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'Try adjusting your search' : 'Get started by adding your first client'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowModal(true)}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <Plus size={20} />
              New Client
            </button>
          )}
        </div>
      )}

      {/* Client form modal */}
      <Modal
        isOpen={showModal}
        onClose={handleModalClose}
        title={selectedClient ? 'Edit Client' : 'New Client'}
        size="lg"
      >
        <ClientForm
          client={selectedClient}
          onClose={handleModalClose}
        />
      </Modal>
    </div>
  );
};

export default Clients;