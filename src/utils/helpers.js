import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';

// Date formatting
export const formatDate = (date, formatStr = 'MMM dd, yyyy') => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
};

export const formatDateTime = (date) => {
  return formatDate(date, 'MMM dd, yyyy HH:mm');
};

// Currency formatting
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount || 0);
};

// Status helpers
export const getPaymentStatusColor = (status) => {
  const colors = {
    paid: 'success',
    partial: 'warning',
    pending: 'info',
    overdue: 'danger'
  };
  return colors[status] || 'info';
};

export const getJobStatusColor = (status) => {
  const colors = {
    completed: 'success',
    scheduled: 'info',
    'in-progress': 'warning',
    cancelled: 'danger'
  };
  return colors[status] || 'info';
};

// Payment calculations
export const calculateTotalPaid = (payments) => {
  if (!payments || !Array.isArray(payments)) return 0;
  return payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
};

export const calculateBalance = (total, payments) => {
  const paid = calculateTotalPaid(payments);
  return total - paid;
};

export const getPaymentStatus = (total, payments, dueDate) => {
  const balance = calculateBalance(total, payments);
  
  if (balance === 0) return 'paid';
  if (balance < total && balance > 0) return 'partial';
  
  if (dueDate) {
    const due = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate;
    if (isAfter(new Date(), due)) return 'overdue';
  }
  
  return 'pending';
};

// File upload helpers
export const getFileExtension = (filename) => {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
};

export const isImageFile = (filename) => {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  return imageExtensions.includes(getFileExtension(filename).toLowerCase());
};

// ID generation
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Validation
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePhone = (phone) => {
  const re = /^\+?1?\d{10,14}$/;
  return re.test(phone.replace(/[\s()-]/g, ''));
};

// Notification helpers
export const isDueForReminder = (dueDate, reminderDays = 3) => {
  if (!dueDate) return false;
  const due = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate;
  const reminderDate = addDays(new Date(), reminderDays);
  return isAfter(due, new Date()) && isBefore(due, reminderDate);
};

// Text helpers
export const truncate = (text, length = 50) => {
  if (!text || text.length <= length) return text;
  return text.substr(0, length) + '...';
};

export const capitalize = (text) => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
};