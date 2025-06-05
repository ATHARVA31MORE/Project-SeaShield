// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

export { auth, db, storage };