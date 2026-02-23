import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, doc, setDoc, getDoc, getDocs, collection, deleteDoc, initializeFirestore, persistentLocalCache,
  getCountFromServer, query, where 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  getStorage, ref, uploadBytes, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged
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
const db = initializeFirestore(app, { localCache: persistentLocalCache({ cacheSizeBytes: 10485760 }) });
const storage = getStorage(app);
export const auth = getAuth(app); 

// ==========================================
// 🔐 AUTHENTICATION & PROFILES
// ==========================================
export async function loginUser(email, password) { return await signInWithEmailAndPassword(auth, email, password); }
export async function registerUser(email, password) { return await createUserWithEmailAndPassword(auth, email, password); }
export async function logoutUser() { await signOut(auth); }
export async function saveTeacherProfile(uid, profileData) { await setDoc(doc(db, "Teachers", uid), profileData, { merge: true }); }
export async function getTeacherProfile(uid) {
  const snap = await getDoc(doc(db, "Teachers", uid));
  return snap.exists() ? snap.data() : null;
}
export async function getAllTeachers() {
  const snap = await getDocs(collection(db, "Teachers"));
  let teachers = [];
  snap.forEach(d => teachers.push(d.data()));
  return teachers;
}

// ==========================================
// 🚀 SMART STATS (1-Read Optimized)
// ==========================================
export async function getAdminStats() {
  const pendingSnap = await getCountFromServer(collection(db, "Pending_Content"));
  const liveSnap = await getCountFromServer(collection(db, "Live_Content"));
  return { pending: pendingSnap.data().count, live: liveSnap.data().count };
}

export async function getTeacherStats(authorName) {
  if (!authorName) return { pending: 0, live: 0 };
  const pendingQ = query(collection(db, "Pending_Content"), where("author", "==", authorName));
  const liveQ = query(collection(db, "Live_Content"), where("author", "==", authorName));
  const pSnap = await getCountFromServer(pendingQ);
  const lSnap = await getCountFromServer(liveQ);
  return { pending: pSnap.data().count, live: lSnap.data().count };
}

// ==========================================
// 🚀 CONTENT DATABASE FUNCTIONS
// ==========================================
export function generateDocId(classId, subject, chapter, type) {
  return `class${classId}_${subject}_ch${chapter}_${type}`;
}

export async function submitContent(classId, subject, chapter, type, typeName, title, author, contentPayload) {
  const docId = generateDocId(classId, subject, chapter, type);
  await setDoc(doc(db, "Pending_Content", docId), {
    id: docId, class: classId, subject: subject, chapter: chapter, type: type, typeName: typeName,
    title: title, author: author, content: contentPayload, timestamp: new Date().getTime() 
  });
}

// PENDING ACTIONS
export async function getPendingContent() {
  const querySnapshot = await getDocs(collection(db, "Pending_Content"));
  let pendingItems = [];
  querySnapshot.forEach((doc) => pendingItems.push(doc.data()));
  return pendingItems;
}
export async function approveContent(pendingItem) {
  await setDoc(doc(db, "Live_Content", pendingItem.id), pendingItem); 
  await deleteDoc(doc(db, "Pending_Content", pendingItem.id)); 
}
export async function rejectContent(docId) { await deleteDoc(doc(db, "Pending_Content", docId)); }

// LIVE MANAGER ACTIONS (NEW)
export async function getLiveContentAll() {
  const querySnapshot = await getDocs(collection(db, "Live_Content"));
  let liveItems = [];
  querySnapshot.forEach((doc) => liveItems.push(doc.data()));
  return liveItems;
}
export async function fetchLiveContent(classId, subject, chapter, type) {
  const docSnap = await getDoc(doc(db, "Live_Content", generateDocId(classId, subject, chapter, type)));
  return docSnap.exists() ? docSnap.data() : null; 
}
export async function deleteLiveContent(docId) {
  await deleteDoc(doc(db, "Live_Content", docId));
}
export async function updateLiveContent(docId, newContentHtml) {
  await setDoc(doc(db, "Live_Content", docId), { content: newContentHtml }, { merge: true });
}