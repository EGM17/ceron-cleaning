import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { Upload, X, Camera } from 'lucide-react';

const CheckForm = ({ check, onClose }) => {
  const [formData, setFormData] = useState({
    clientId: '',
    checkNumber: '',
    bank: '',
    amount: '',
    checkDate: new Date().toISOString().split('T')[0],
    depositDate: '',
    status: 'pending',
    notes: '',
    photo: ''
  });

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');

  useEffect(() => {
    fetchClients();
    if (check) {
      setFormData({
        ...check,
        checkDate: new Date(check.checkDate).toISOString().split('T')[0],
        depositDate: check.depositDate ? new Date(check.depositDate).toISOString().split('T')[0] : ''
      });
      setPhotoPreview(check.photo || '');
    }
  }, [check]);

  const fetchClients = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'clients'));
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const uploadPhoto = async () => {
    if (!photoFile) return formData.photo;

    const storageRef = ref(storage, `checks/${Date.now()}_${photoFile.name}`);
    await uploadBytes(storageRef, photoFile);
    return getDownloadURL(storageRef);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const photoUrl = await uploadPhoto();

      const checkData = {
        ...formData,
        amount: parseFloat(formData.amount),
        photo: photoUrl,
        updatedAt: new Date().toISOString()
      };

      if (check) {
        await updateDoc(doc(db, 'checks', check.id), checkData);
        alert('Check updated successfully! ✅');
      } else {
        await addDoc(collection(db, 'checks'), {
          ...checkData,
          createdAt: new Date().toISOString()
        });
        alert('Check registered successfully! ✅');
      }

      onClose();
    } catch (error) {
      console.error('Error saving check:', error);
      alert('Error saving check. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Client and Check Number */}
      <div className="grid grid-cols-2 gap-4">
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
        <div>
          <label className="label">Check Number *</label>
          <input
            type="text"
            name="checkNumber"
            value={formData.checkNumber}
            onChange={handleChange}
            required
            placeholder="12345678"
            className="input"
          />
        </div>
      </div>

      {/* Bank and Amount */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Bank *</label>
          <input
            type="text"
            name="bank"
            value={formData.bank}
            onChange={handleChange}
            required
            placeholder="Bank of America"
            className="input"
          />
        </div>
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
      </div>

      {/* Check Date and Deposit Date */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Check Date *</label>
          <input
            type="date"
            name="checkDate"
            value={formData.checkDate}
            onChange={handleChange}
            required
            className="input"
          />
        </div>
        <div>
          <label className="label">Deposit Date</label>
          <input
            type="date"
            name="depositDate"
            value={formData.depositDate}
            onChange={handleChange}
            className="input"
          />
        </div>
      </div>

      {/* Status */}
      <div>
        <label className="label">Status *</label>
        <select
          name="status"
          value={formData.status}
          onChange={handleChange}
          required
          className="input"
        >
          <option value="pending">Pending (To Deposit)</option>
          <option value="deposited">Deposited</option>
          <option value="bounced">Bounced</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Notes */}
      <div>
        <label className="label">Notes (Optional)</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows="3"
          placeholder="Additional notes about this check..."
          className="input"
        />
      </div>

      {/* Photo Upload */}
      <div>
        <label className="label">Check Photo</label>
        {photoPreview ? (
          <div className="relative">
            <img
              src={photoPreview}
              alt="Check preview"
              className="w-full h-48 object-cover rounded-lg border border-gray-200"
            />
            <button
              type="button"
              onClick={() => {
                setPhotoFile(null);
                setPhotoPreview('');
              }}
              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <label
            htmlFor="check-photo-upload"
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors cursor-pointer block"
          >
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="absolute w-0 h-0 opacity-0 pointer-events-none"
              id="check-photo-upload"
            />
            <Camera size={40} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">
              Click to upload check photo
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PNG, JPG, GIF up to 10MB
            </p>
          </label>
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
          {loading ? 'Saving...' : (check ? 'Update Check' : 'Register Check')}
        </button>
      </div>
    </form>
  );
};

export default CheckForm;