// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB8CUjfRdVlSOACFuuhOtyIXO2IAhJD7VE",
  authDomain: "seasons-rp-ems.firebaseapp.com",
  projectId: "seasons-rp-ems",
  storageBucket: "seasons-rp-ems.firebasestorage.app",
  messagingSenderId: "76899273418",
  appId: "1:76899273418:web:19dc6d8bd90309f7f98233"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// EXPORT the database connection so portal.js can use it!
export const db = getFirestore(app);