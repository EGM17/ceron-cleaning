import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { Upload, Save, Building2 } from 'lucide-react';

const CompanySettings = () => {
  const [formData, setFormData] = useState({
    name: 'CERON CLEANING',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: 'WA',
    zipCode: '',
    logo: '',
    website: '',
    taxId: ''
  });
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'company');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setFormData(docSnap.data());
        setLogoPreview(docSnap.data().logo || '');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const uploadLogo = async () => {
    if (!logoFile) return formData.logo;

    const storageRef = ref(storage, `company/logo_${Date.now()}.png`);
    await uploadBytes(storageRef, logoFile);
    return getDownloadURL(storageRef);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);

      // Upload logo if new one selected
      const logoUrl = await uploadLogo();

      // Save to Firestore
      await setDoc(doc(db, 'settings', 'company'), {
        ...formData,
        logo: logoUrl,
        updatedAt: new Date().toISOString()
      });

      alert('Company settings saved successfully! ✅');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-start gap-6">
        {/* Logo upload */}
        <div>
          <label className="label">Company Logo</label>
          <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden hover:border-primary-400 transition-colors">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-4">
                <Building2 size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-xs text-gray-500">No logo</p>
              </div>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoSelect}
            className="hidden"
            id="logo-upload"
          />
          <label
            htmlFor="logo-upload"
            className="mt-2 btn btn-secondary text-sm w-full cursor-pointer flex items-center justify-center gap-2"
          >
            <Upload size={16} />
            Upload Logo
          </label>
        </div>

        {/* Company info */}
        <div className="flex-1 space-y-4">
          <div>
            <label className="label">Company Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input"
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Address */}
      <div>
        <label className="label">Address</label>
        <input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleChange}
          placeholder="123 Main St"
          className="input"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label">City</label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="Vancouver"
            className="input"
          />
        </div>
        <div>
          <label className="label">State</label>
          <input
            type="text"
            name="state"
            value={formData.state}
            onChange={handleChange}
            placeholder="WA"
            className="input"
          />
        </div>
        <div>
          <label className="label">ZIP Code</label>
          <input
            type="text"
            name="zipCode"
            value={formData.zipCode}
            onChange={handleChange}
            placeholder="98660"
            className="input"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Website</label>
          <input
            type="url"
            name="website"
            value={formData.website}
            onChange={handleChange}
            placeholder="https://ceroncleaning.com"
            className="input"
          />
        </div>
        <div>
          <label className="label">Tax ID / EIN</label>
          <input
            type="text"
            name="taxId"
            value={formData.taxId}
            onChange={handleChange}
            placeholder="12-3456789"
            className="input"
          />
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary flex items-center gap-2"
        >
          <Save size={20} />
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};

export default CompanySettings;