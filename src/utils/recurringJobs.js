import { addDoc, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Generate job instances from a recurring template
 * @param {Object} template - The recurring job template
 * @param {number} daysAhead - How many days ahead to generate (default: 90)
 * @returns {Array} Array of generated instances
 */
export const generateInstances = async (template, daysAhead = 90) => {
  const instances = [];
  const startDate = new Date(template.recurrenceRule.startDate);
  const endDate = template.recurrenceRule.endDate 
    ? new Date(template.recurrenceRule.endDate) 
    : null;
  const generationEndDate = new Date();
  generationEndDate.setDate(generationEndDate.getDate() + daysAhead);

  let currentDate = new Date(startDate);
  let instanceNumber = 1;

  // Check existing instances to avoid duplicates
  const existingInstancesQuery = query(
    collection(db, 'jobs'),
    where('templateId', '==', template.id),
    where('type', '==', 'instance')
  );
  const existingSnapshot = await getDocs(existingInstancesQuery);
  const existingDates = new Set(
    existingSnapshot.docs.map(doc => doc.data().date)
  );

  while (currentDate <= generationEndDate) {
    // Check if we've reached the end date
    if (endDate && currentDate > endDate) break;

    const dateString = currentDate.toISOString().split('T')[0];

    // Skip if instance already exists
    if (!existingDates.has(dateString)) {
      const instance = {
        type: 'instance',
        templateId: template.id,
        clientId: template.clientId,
        clientName: template.clientName,
        jobType: template.jobType,
        date: dateString,
        status: 'scheduled',
        amount: template.amount,
        location: template.location,
        description: template.description,
        notes: '',
        photos: [],
        instanceNumber: instanceNumber,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      instances.push(instance);
    }

    instanceNumber++;

    // Calculate next occurrence based on frequency
    switch (template.recurrenceRule.frequency) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'biweekly':
        currentDate.setDate(currentDate.getDate() + 14);
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      default:
        throw new Error(`Unknown frequency: ${template.recurrenceRule.frequency}`);
    }
  }

  return instances;
};

/**
 * Save generated instances to Firestore
 * @param {Array} instances - Array of job instances
 * @returns {Promise} Promise that resolves when all instances are saved
 */
export const saveInstances = async (instances) => {
  const promises = instances.map(instance => 
    addDoc(collection(db, 'jobs'), instance)
  );
  return Promise.all(promises);
};

/**
 * Update all future instances of a template
 * @param {string} templateId - Template ID
 * @param {Object} updates - Fields to update
 */
export const updateFutureInstances = async (templateId, updates) => {
  const today = new Date().toISOString().split('T')[0];
  
  const futureInstancesQuery = query(
    collection(db, 'jobs'),
    where('templateId', '==', templateId),
    where('type', '==', 'instance'),
    where('date', '>=', today),
    where('status', '==', 'scheduled')
  );
  
  const snapshot = await getDocs(futureInstancesQuery);
  
  const promises = snapshot.docs.map(docSnapshot => 
    updateDoc(doc(db, 'jobs', docSnapshot.id), {
      ...updates,
      updatedAt: new Date().toISOString()
    })
  );
  
  return Promise.all(promises);
};

/**
 * Cancel all future instances of a template
 * @param {string} templateId - Template ID
 */
export const cancelFutureInstances = async (templateId) => {
  return updateFutureInstances(templateId, { status: 'cancelled' });
};

/**
 * Get next occurrence date for a template
 * @param {Object} template - Template object
 * @returns {Date} Next occurrence date
 */
export const getNextOccurrence = (template) => {
  const today = new Date();
  const startDate = new Date(template.recurrenceRule.startDate);
  
  if (startDate > today) return startDate;
  
  let nextDate = new Date(startDate);
  
  while (nextDate <= today) {
    switch (template.recurrenceRule.frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'biweekly':
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
    }
  }
  
  return nextDate;
};

/**
 * Get human-readable recurrence description
 * @param {Object} recurrenceRule - Recurrence rule object
 * @returns {string} Human-readable description
 */
export const getRecurrenceDescription = (recurrenceRule) => {
  const { frequency, startDate, endDate } = recurrenceRule;
  
  const frequencyMap = {
    daily: 'Daily',
    weekly: 'Weekly',
    biweekly: 'Every 2 weeks',
    monthly: 'Monthly'
  };
  
  let description = frequencyMap[frequency] || frequency;
  
  if (endDate) {
    description += ` until ${new Date(endDate).toLocaleDateString()}`;
  }
  
  return description;
};

/**
 * Check if template needs instance generation
 * @param {Object} template - Template object
 * @param {number} minDaysAhead - Minimum days ahead to maintain (default: 30)
 * @returns {boolean} True if needs generation
 */
export const needsInstanceGeneration = async (template, minDaysAhead = 30) => {
  const checkDate = new Date();
  checkDate.setDate(checkDate.getDate() + minDaysAhead);
  const checkDateString = checkDate.toISOString().split('T')[0];
  
  const futureInstancesQuery = query(
    collection(db, 'jobs'),
    where('templateId', '==', template.id),
    where('type', '==', 'instance'),
    where('date', '>=', checkDateString)
  );
  
  const snapshot = await getDocs(futureInstancesQuery);
  return snapshot.empty;
};