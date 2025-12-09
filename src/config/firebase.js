import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Reemplaza estos valores con los de tu proyecto Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDFfL7ZB0yfpNcFTyIPWdrIu0QMpa7JE-w",
    authDomain: "ceron-cleaning.firebaseapp.com",
    projectId: "ceron-cleaning",
    storageBucket: "ceron-cleaning.firebasestorage.app",
    messagingSenderId: "606687018228",
    appId: "1:606687018228:web:d72911e44bccdf22ebf2a1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;