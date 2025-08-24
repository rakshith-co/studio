
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "q-commerce-insights",
  appId: "1:738146302687:web:50b9cbcc9c1c1c59c8876a",
  storageBucket: "q-commerce-insights.firebasestorage.app",
  apiKey: "AIzaSyC2DpT6B6TmoTVGJShR9cAqBRBg5wl_uN0",
  authDomain: "q-commerce-insights.firebaseapp.com",
  measurementId: "",
  messagingSenderId: "738146302687"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
