import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

export let firebaseAuth   = null;
export let googleProvider = null;

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;

if (apiKey) {
  try {
    const app = initializeApp({
      apiKey,
      authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId:             import.meta.env.VITE_FIREBASE_APP_ID,
    });
    firebaseAuth   = getAuth(app);
    googleProvider = new GoogleAuthProvider();
  } catch {
    // Firebase credentials invalid — Google login will be unavailable
  }
}
