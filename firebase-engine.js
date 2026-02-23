// firebase-engine.js - Centralized Modern Database Logic

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, doc, setDoc, getDoc, getDocs, collection, deleteDoc, initializeFirestore, persistentLocalCache 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  getStorage, ref, uploadBytes, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDf5Jn5s4bgs50uwCP0XkU-kHS-nTbjnhM",
  authDomain: "ertsolutions-40d76.firebaseapp.com",
  projectId: "ertsolutions-40d76",
  storageBucket: "ertsolutions-40d76.firebasestorage.app",
  messagingSenderId: "559504462996",
  appId: "1:559504462996:web:05fb96aa56f1dd727f9081",
  measurementId: "G-PRSYHJYPZX"
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache() 
});
const storage = getStorage(app);
const auth = getAuth(app); 

// ==========================================
// 🔐 AUTHENTICATION FUNCTIONS
// ==========================================
export async function loginUser(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function registerUser(email, password) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function logoutUser() {
  await signOut(auth);
}

// ==========================================
// 🚀 DATABASE FUNCTIONS
// ==========================================
export function generateDocId(classId, subject, chapter, type) {
  return `class${classId}_${subject}_ch${chapter}_${type}`;
}

export async function submitContent(classId, subject, chapter, type, typeName, title, author, contentPayload) {
  const docId = generateDocId(classId, subject, chapter, type);
  const docRef = doc(db, "Pending_Content", docId);
  
  await setDoc(docRef, {
    id: docId, class: classId, subject: subject, chapter: chapter, type: type, typeName: typeName,
    title: title, author: author, content: contentPayload,
    timestamp: new Date().getTime() 
  });
}

export async function getPendingContent() {
  const querySnapshot = await getDocs(collection(db, "Pending_Content"));
  let pendingItems = [];
  querySnapshot.forEach((doc) => pendingItems.push(doc.data()));
  return pendingItems;
}

export async function approveContent(pendingItem) {
  const docId = pendingItem.id;
  await setDoc(doc(db, "Live_Content", docId), pendingItem); 
  await deleteDoc(doc(db, "Pending_Content", docId)); 
}

export async function rejectContent(docId) {
  await deleteDoc(doc(db, "Pending_Content", docId));
}

export async function fetchLiveContent(classId, subject, chapter, type) {
  const docId = generateDocId(classId, subject, chapter, type);
  const docRef = doc(db, "Live_Content", docId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data(); 
  } else {
    return null; 
  }
}