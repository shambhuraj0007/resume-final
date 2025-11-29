// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAjoi5dbLDmhzVcu194ucQqr1mf7O59p7o",
  authDomain: "resume-builder-abcca.firebaseapp.com",
  projectId: "resume-builder-abcca",
  storageBucket: "resume-builder-abcca.appspot.com", // <-- FIXED
  messagingSenderId: "1072733541152",
  appId: "1:1072733541152:web:1d31df3371873e7bb57d45",
  measurementId: "G-YHYV1Z4M53"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);