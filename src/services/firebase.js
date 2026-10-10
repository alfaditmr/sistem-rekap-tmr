import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { getFirestore, doc, setDoc, updateDoc, getDoc, onSnapshot } from "firebase/firestore";

// ==========================================
// 🔴 KONFIGURASI DATABASE FIREBASE USER
// ==========================================
const myFirebaseConfig = {
  apiKey: "AIzaSyB_PtIg3kNwwpa62bIeFmBiDkn-KRxm5es",
  authDomain: "rekap-stsu.firebaseapp.com",
  projectId: "rekap-stsu",
  storageBucket: "rekap-stsu.firebasestorage.app",
  messagingSenderId: "811185738366",
  appId: "1:811185738366:web:2db209f6eab966bccd7e2f"
};

let app = null;
let auth = null;
let db = null;

try {
  app = initializeApp(myFirebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase init error", e);
}

export {
  app,
  auth,
  db,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  onSnapshot
};
