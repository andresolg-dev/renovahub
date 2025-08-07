// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getMessaging } from "firebase/messaging" // Import getMessaging

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCxV9tE40bZlziYEU5AgGmBJRubAPnKDLY",
  authDomain: "sincrolicencias.firebaseapp.com",
  projectId: "sincrolicencias",
  storageBucket: "sincrolicencias.firebasestorage.app",
  messagingSenderId: "984119162142",
  appId: "1:984119162142:web:5fece395e58cdd0e8b050f",
  measurementId: "G-N4DFJ7E08C",
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
export const auth = getAuth(app)
export const db = getFirestore(app)
export const messaging = typeof window !== "undefined" && getMessaging(app) // Initialize Messaging only on client-side
