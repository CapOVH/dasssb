import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyA7XyaJyqwIIRTKyT6XpcyCgmkPmHevT6k",
    authDomain: "ssbnerrdndaodata.firebaseapp.com",
    projectId: "ssbnerrdndaodata",
    storageBucket: "ssbnerrdndaodata.firebasestorage.app",
    messagingSenderId: "271418883230",
    appId: "1:271418883230:web:4d757f54c7323f1a848f8f",
    measurementId: "G-NEM3M5FTYL"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
