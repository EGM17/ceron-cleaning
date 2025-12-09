import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { Upload, X, Plus } from 'lucide-react';
import GoogleCalendarService from '../../services/calendar/GoogleCalendarService';

const JobForm = ({ job, onClose }) => {
  const [formData, setFormData] = useState({
    clientId: '',
    clientName: '',
    jobType: 'residential',
    isRecurring: false,
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    endTime: '11:00',
    status: 'scheduled',
    location: '',
    amount: '',
    description: '',
    notes: '',
    photos: []
  });

  const [clients, setClients] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClients();
    if (job) {
      setFormData({
        ...job,
        time: job.time || '09:00',
        endTime: job.endTime || '11:00'
      });
      
      if (job.photos && job.photos.length > 0) {
        setPreviewUrls(job.photos);
      }
    }
  }, [job]);

  const fetchClients = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'clients'));
      const clientsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClients(clientsData);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'clientId') {
      const selectedClient = clients.find(c => c.id === value);
      setFormData(prev => ({
        ...prev,
        clientId: value,
        clientName: selectedClient ? selectedClient.name : '',
        jobType: selectedClient?.type || 'residential',
        location: selectedClient?.address || prev.location
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
    
    const newPreviewUrls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async () => {
    if (selectedFiles.length === 0) return formData.photos || [];

    const uploadPromises = selectedFiles.map(async (file) => {
      const storageRef = ref(storage, `jobs/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      return getDownloadURL(storageRef);
    });

    const uploadedUrls = await Promise.all(uploadPromises);
    return [...(formData.photos || []), ...uploadedUrls];
  };

  const calculateDuration = (startTime, endTime) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    return (endHour * 60 + endMin) - (startHour * 60 + startMin);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setUploading(true);

      // Upload photos
      const photoUrls = await uploadPhotos();
      
      const duration = calculateDuration(formData.time, formData.endTime);

      const jobData = {
        clientId: formData.clientId,
        clientName: formData.clientName,
        jobType: formData.jobType,
        isRecurring: formData.isRecurring,
        date: formData.date,
        time: formData.time,
        endTime: formData.endTime,
        duration,
        status: formData.status,
        amount: parseFloat(formData.amount),
        location: formData.location,
        description: formData.description,
        notes: formData.notes,
        photos: photoUrls,
        updatedAt: new Date().toISOString()
      };

      if (job) {
        // UPDATING EXISTING JOB
        await updateDoc(doc(db, 'jobs', job.id), jobData);
        
        // Update Google Calendar event if exists
        if (job.googleEventId) {
          try {
            await GoogleCalendarService.updateEvent(job.googleEventId, jobData);
            console.log('✅ Google Calendar event updated');
          } catch (error) {
            console.error('Error updating Google Calendar:', error);
          }
        } else {
          // Try to create Google Calendar event if not synced yet
          try {
            const isConfigured = await GoogleCalendarService.isConfigured();
            if (isConfigured) {
              const event = await GoogleCalendarService.createEvent(jobData);
              if (event && event.id) {
                await updateDoc(doc(db, 'jobs', job.id), {
                  googleEventId: event.id
                });
                console.log('✅ Google Calendar event created');
              }
            }
          } catch (error) {
            console.error('Error creating Google Calendar event:', error);
          }
        }
        
        alert('Job updated successfully! ✅');
      } else {
        // CREATING NEW JOB
        const jobRef = await addDoc(collection(db, 'jobs'), {
          ...jobData,
          createdAt: new Date().toISOString()
        });
        
        // Create Google Calendar event
        try {
          const isConfigured = await GoogleCalendarService.isConfigured();
          if (isConfigured) {
            const event = await GoogleCalendarService.createEvent(jobData);
            if (event && event.id) {
              await updateDoc(doc(db, 'jobs', jobRef.id), {
                googleEventId: event.id
              });
              console.log('✅ Google Calendar event created');
            }
          }
        } catch (error) {
          console.error('Error creating Google Calendar event:', error);
        }
        
        alert('Job created successfully! ✅');
      }

      onClose();
    } catch (error) {
      console.error('Error saving job:', error);
      alert('Error saving job. Please try again.');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Client selection */}
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
              {client.name} {client.company && `(${client.company})`}
            </option>
          ))}
        </select>
      </div>

      {/* Job type and recurring toggle */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Job Type *</label>
          <select
            name="jobType"
            value={formData.jobType}
            onChange={handleChange}
            required
            className="input"
          >
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
          </select>
        </div>
        
        <div className="flex items-center">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="isRecurring"
              checked={formData.isRecurring}
              onChange={handleChange}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              🔁 Recurring Client
            </span>
          </label>
        </div>
      </div>

      {/* Date and Time */}
      <div className="grid grid-cols-3 gap-4">
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
        
        <div>
          <label className="label">Start Time *</label>
          <input
            type="time"
            name="time"
            value={formData.time}
            onChange={handleChange}
            required
            className="input"
          />
        </div>
        
        <div>
          <label className="label">End Time *</label>
          <input
            type="time"
            name="endTime"
            value={formData.endTime}
            onChange={handleChange}
            required
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
          <option value="scheduled">Scheduled</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Location and Amount */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Location</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="123 Main St, City, State"
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

      {/* Description */}
      <div>
        <label className="label">Service Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows="3"
          placeholder="Regular office cleaning, windows, floors..."
          className="input"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="label">Notes (Optional)</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows="2"
          placeholder="Special instructions for this job..."
          className="input"
        />
      </div>

      {/* Photos */}
      <div>
        <label className="label">Photos</label>
        {previewUrls.length === 0 ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="job-photos-upload"
            />
            <label htmlFor="job-photos-upload" className="cursor-pointer">
              <Upload size={40} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">
                Click to upload job photos
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG, GIF up to 10MB
              </p>
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {previewUrls.map((url, index) => (
              <div key={index} className="relative">
                <img
                  src={url}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <div className="border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-primary-400 transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="job-photos-upload-more"
              />
              <label htmlFor="job-photos-upload-more" className="cursor-pointer p-4 text-center">
                <Plus size={24} className="mx-auto text-gray-400" />
                <p className="text-xs text-gray-500 mt-1">Add more</p>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Info banner */}
      {formData.isRecurring && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>ℹ️ Recurring Client:</strong> This job will be marked as part of a recurring schedule. 
            You can manage all jobs for this client in the "Recurring Clients" tab.
          </p>
        </div>
      )}

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
          {loading ? (uploading ? 'Uploading...' : 'Saving...') : (job ? 'Update Job' : 'Create Job')}
        </button>
      </div>
    </form>
  );
};

export default JobForm;