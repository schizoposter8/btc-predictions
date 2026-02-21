import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// ======================================================
// PASTE YOUR FIREBASE CONFIG HERE
// Go to Firebase Console > Project Settings > Your apps
// Copy the firebaseConfig object and replace the placeholder below
// ======================================================
const firebaseConfig = {
  apiKey: "AIzaSyBDpDSunVdaPTsmPiqjTrxBwkzZsLm-heE",
  authDomain: "btc-prediction-2026.firebaseapp.com",
  projectId: "btc-prediction-2026",
  storageBucket: "btc-prediction-2026.firebasestorage.app",
  messagingSenderId: "231219428967",
  appId: "1:231219428967:web:99b2f268b02d22a3e9dec2",
  measurementId: "G-SKHM75HXEY"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
