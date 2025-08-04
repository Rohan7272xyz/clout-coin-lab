import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC85uWvmhdqJVV0C5WuqWtHsCmqFUbuU8A",
  authDomain: "token-factory-78e3d.firebaseapp.com",
  projectId: "token-factory-78e3d",
  storageBucket: "token-factory-78e3d.firebasestorage.app",
  messagingSenderId: "378303848541",
  appId: "1:378303848541:web:0d4e9d4e45ecdcca2aedb4",
  measurementId: "G-DE8TSWZKFZ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);