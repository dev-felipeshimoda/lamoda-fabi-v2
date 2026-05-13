// shared/firebase.js
// Init unico do Firebase SDK. Importado por todos os modulos do app.
// A apiKey aqui NAO eh segredo — eh identificador publico do projeto.
// Seguranca real vem das Firestore Rules e Storage Rules (ver firebase/*.rules).

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth }       from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { getStorage }    from "https://www.gstatic.com/firebasejs/11.0.0/firebase-storage.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDtF1eCJDIClBPWW9Gs8tWPmLBfOJWmVqw",
  authDomain:        "lamoda-fabi.firebaseapp.com",
  projectId:         "lamoda-fabi",
  storageBucket:     "lamoda-fabi.firebasestorage.app",
  messagingSenderId: "744123180995",
  appId:             "1:744123180995:web:83fc638560c3b58f7f3f76",
  measurementId:     "G-XPZ75MKE7X"
};

export const app     = initializeApp(firebaseConfig);
export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);
