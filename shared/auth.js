// shared/auth.js
// Google Sign-In + upsert do doc users/{uid}.
// MVP single-user: o unico email whitelisted vira role 'admin' direto.

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import {
  doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { auth, db } from "./firebase.js";

const provider = new GoogleAuthProvider();
// Forca tela de selecao de conta (util quando ha varias contas Google no browser).
provider.setCustomParameters({ prompt: 'select_account' });

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, provider);
  await upsertUserDoc(result.user);
  return result.user;
}

export function signOut() {
  return fbSignOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

async function upsertUserDoc(user) {
  const ref  = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      uid:         user.uid,
      email:       user.email,
      displayName: user.displayName,
      photoURL:    user.photoURL,
      role:        'admin',          // MVP: unica conta whitelisted = admin
      provider:    'google',
      createdAt:   serverTimestamp(),
      lastLoginAt: serverTimestamp()
    });
  } else {
    await setDoc(ref, { lastLoginAt: serverTimestamp() }, { merge: true });
  }
}
