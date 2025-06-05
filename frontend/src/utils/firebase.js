// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCvohv-L_521gRVDBm3jI9MSt01-HsVJlY",
  authDomain: "project-seashield.firebaseapp.com",
  projectId: "project-seashield",
  storageBucket: "project-seashield.firebasestorage.app",
  messagingSenderId: "1037745958",
  appId: "1:1037745958:web:cabe06a7212320788f4be7",
  measurementId: "G-H642CECWH9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase Services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Configure Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account' // Forces account selection dialog
});

export { auth, db, storage, googleProvider };