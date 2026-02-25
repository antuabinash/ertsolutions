import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, doc, setDoc, getDoc, getDocs, collection, deleteDoc,
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
// FIXED: Removed persistentLocalCache to prevent cross-account data bleeding on shared browsers
const db = getFirestore(app); 
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
  return snap.exists() ? Object.assign({uid: snap.id}, snap.data()) : null;
}
export async function getAllTeachers() {
  const snap = await getDocs(collection(db, "Teachers"));
  let teachers = [];
  snap.forEach(d => teachers.push(Object.assign({uid: d.id}, d.data())));
  return teachers;
}

// ==========================================
// 🚀 SMART STATS (UID Based for 100% Accuracy)
// ==========================================
export async function getAdminStats() {
  const pendingSnap = await getCountFromServer(collection(db, "Pending_Content"));
  const liveSnap = await getCountFromServer(collection(db, "Live_Content"));
  return { pending: pendingSnap.data().count, live: liveSnap.data().count };
}

export async function getTeacherStats(authorId, authorName) {
  if (!authorId) return { pending: 0, live: 0 };
  
  // Real-time server fetch guarantees accuracy
  const pSnap = await getDocs(query(collection(db, "Pending_Content"), where("authorId", "==", authorId)));
  const lSnap = await getDocs(query(collection(db, "Live_Content"), where("authorId", "==", authorId)));
  
  let pendingIds = new Set(); pSnap.forEach(d => pendingIds.add(d.id));
  let liveIds = new Set(); lSnap.forEach(d => liveIds.add(d.id));

  // Fallback for legacy documents
  if (authorName) {
    const legP = await getDocs(query(collection(db, "Pending_Content"), where("author", "==", authorName)));
    legP.forEach(d => { if(!d.data().authorId) pendingIds.add(d.id); });
    
    const legL = await getDocs(query(collection(db, "Live_Content"), where("author", "==", authorName)));
    legL.forEach(d => { if(!d.data().authorId) liveIds.add(d.id); });
  }

  return { pending: pendingIds.size, live: liveIds.size };
}

// ==========================================
// 🚀 CROWDSOURCED CONTENT DATABASE FUNCTIONS
// ==========================================
export async function submitContent(classId, subject, chapter, type, typeName, title, authorName, authorId, contentPayload) {
  // FIXED: Every single submission now gets a unique ID so they NEVER overwrite each other
  const baseId = `class${classId}_${subject}_ch${chapter}_${type}`;
  const uniqueId = baseId + '_' + Date.now(); 
  
  await setDoc(doc(db, "Pending_Content", uniqueId), {
    id: uniqueId, class: classId, subject: subject, chapter: chapter, type: type, typeName: typeName,
    title: title, author: authorName, authorId: authorId, content: contentPayload, timestamp: new Date().getTime() 
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
  // Moves the unique item to Live_Content safely
  const liveItem = { ...pendingItem };
  await setDoc(doc(db, "Live_Content", pendingItem.id), liveItem); 
  await deleteDoc(doc(db, "Pending_Content", pendingItem.id)); 
}
export async function rejectContent(docId) { await deleteDoc(doc(db, "Pending_Content", docId)); }

// LIVE MANAGER ACTIONS
export async function getLiveContentAll() {
  const querySnapshot = await getDocs(collection(db, "Live_Content"));
  let liveItems = [];
  querySnapshot.forEach((doc) => liveItems.push(doc.data()));
  return liveItems;
}

// ✨ MAGIC MERGE FUNCTION FOR STUDENT VIEWER ✨
export async function fetchLiveContent(classId, subject, chapter, type) {
  const q = query(collection(db, "Live_Content"),
    where("class", "==", classId),
    where("subject", "==", subject),
    where("chapter", "==", chapter),
    where("type", "==", type)
  );
  
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;

  let mergedContent = null;
  let authors = new Set();
  let title = "";
  let typeName = "";

  // This loops through ALL approved content for this chapter and combines them!
  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if(data.author) authors.add(data.author);
    if(!title) title = data.title;
    if(!typeName) typeName = data.typeName;

    if (type === 'quiz') {
      // Combines individual quiz submissions into one giant test array
      if (!mergedContent) mergedContent = [];
      mergedContent = mergedContent.concat(data.content);
    } else {
      // Combines HTML notes/lessons and adds a tiny nametag for each contributor
      if (!mergedContent) mergedContent = "";
      if (mergedContent !== "") mergedContent += `<hr class="my-8 border-slate-200">`;
      mergedContent += `<div class="relative pt-6"><div class="absolute top-0 right-0 bg-blue-50 text-sky px-3 py-1 rounded-lg text-xs font-bold border border-blue-100 shadow-sm">👨‍🏫 By ${data.author}</div>${data.content}</div>`;
    }
  });

  return {
    title: title || typeName,
    typeName: typeName,
    author: Array.from(authors).join(' & '), // Shows "Teacher A & Teacher B"
    content: mergedContent
  };
}

export async function deleteLiveContent(docId) { await deleteDoc(doc(db, "Live_Content", docId)); }
export async function updateLiveContent(docId, newContentPayload) { await setDoc(doc(db, "Live_Content", docId), { content: newContentPayload }, { merge: true }); }