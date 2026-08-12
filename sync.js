// ============================================================
// Nika's Notes — Firebase sync layer
// This file is fully separate from app.js. It doesn't rewrite your
// Store logic — it wraps localStorage.setItem/removeItem so every
// write also gets mirrored to Firestore, and listens for changes
// from other signed-in devices to pull back down automatically.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  enableIndexedDbPersistence,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAezSTi6KZUD9wQ3ip-_TM1e-7_gPKTx3o",
  authDomain: "nika-s-notes.firebaseapp.com",
  projectId: "nika-s-notes",
  storageBucket: "nika-s-notes.firebasestorage.app",
  messagingSenderId: "1061575678847",
  appId: "1:1061575678847:web:48ed9235154956512dd84a",
};

const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);
const provider = new GoogleAuthProvider();

// Best-effort offline cache for Firestore itself (separate from our own
// localStorage-based offline support, this just helps Firestore queue
// writes made while offline and flush them once back online).
enableIndexedDbPersistence(db).catch(() => {
  /* multiple tabs open, or unsupported browser — not critical, ignore */
});

const GATE_DISMISSED_KEY = "sync_gate_dismissed";

let suppressPush = false;
let pushTimer = null;
let currentUserDocRef = null;
let unsubscribeSnapshot = null;

// ---- DOM refs ----
const gateEl = document.getElementById("sync-gate");
const statusEl = document.getElementById("sync-status");
const signinBtn = document.getElementById("sync-signin-btn");
const skipBtn = document.getElementById("sync-skip-btn");
const sidebarSigninBtn = document.getElementById("btn-sync-signin");
const sidebarSignoutBtn = document.getElementById("btn-sync-signout");

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function showGate() {
  gateEl?.classList.remove("hidden");
}
function hideGate() {
  gateEl?.classList.add("hidden");
}

signinBtn?.addEventListener("click", () => {
  signInWithPopup(auth, provider).catch((err) => {
    alert("Sign-in failed: " + err.message);
  });
});

skipBtn?.addEventListener("click", () => {
  localStorage.setItem(GATE_DISMISSED_KEY, "1");
  hideGate();
});

sidebarSigninBtn?.addEventListener("click", () => {
  signInWithPopup(auth, provider).catch((err) => {
    alert("Sign-in failed: " + err.message);
  });
});

sidebarSignoutBtn?.addEventListener("click", () => {
  signOut(auth);
});

// ---- Patch localStorage so every write mirrors to Firestore ----
const _setItem = localStorage.setItem.bind(localStorage);
const _removeItem = localStorage.removeItem.bind(localStorage);

localStorage.setItem = function (key, value) {
  _setItem(key, value);
  if (key !== GATE_DISMISSED_KEY) schedulePush();
};
localStorage.removeItem = function (key) {
  _removeItem(key);
  if (key !== GATE_DISMISSED_KEY) schedulePush();
};

function schedulePush() {
  if (suppressPush || !currentUserDocRef) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushToCloud, 800);
}

async function pushToCloud() {
  if (!currentUserDocRef) return;
  const snapshot = window.Store.exportAll();
  suppressPush = true;
  try {
    await setDoc(currentUserDocRef, { data: snapshot, updatedAt: Date.now() });
    setStatus("Synced ✓");
  } catch (err) {
    console.error("Cloud push failed", err);
    setStatus("Sync error — will retry on next edit");
  } finally {
    suppressPush = false;
  }
}

function applyRemoteData(remoteData) {
  suppressPush = true;
  try {
    window.Store.importAll(remoteData);
  } finally {
    suppressPush = false;
  }
  if (typeof window.refreshAllViews === "function") {
    window.refreshAllViews();
  }
}

// ---- Auth state changes ----
onAuthStateChanged(auth, async (user) => {
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }

  if (!user) {
    currentUserDocRef = null;
    sidebarSigninBtn?.classList.remove("hidden");
    sidebarSignoutBtn?.classList.add("hidden");
    setStatus("Not signed in — local only");
    if (!localStorage.getItem(GATE_DISMISSED_KEY)) {
      showGate();
    }
    return;
  }

  hideGate();
  sidebarSigninBtn?.classList.add("hidden");
  sidebarSignoutBtn?.classList.remove("hidden");
  setStatus("Connecting…");

  currentUserDocRef = doc(db, "users", user.uid, "data", "store");

  try {
    const snap = await getDoc(currentUserDocRef);
    if (snap.exists()) {
      // Cloud already has data for this account — pull it down as the baseline
      applyRemoteData(snap.data().data || {});
    } else {
      // First time this account syncs — push current local data up as the baseline
      await pushToCloud();
    }
  } catch (err) {
    console.error("Initial sync failed", err);
    setStatus("Couldn't reach sync — working offline");
  }

  // Real-time listener: pulls changes made from any other signed-in device
  unsubscribeSnapshot = onSnapshot(currentUserDocRef, (docSnap) => {
    if (!docSnap.exists()) return;
    const remote = docSnap.data();
    if (remote && remote.data) {
      applyRemoteData(remote.data);
    }
  });

  setStatus(`Synced as ${user.displayName || user.email}`);
});
