import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

import { getAnalyticsIfSupported, getFirebaseAuth } from "./functions";

// Optionally import the services that you want to use
// import {...} from "firebase/auth";
// import {...} from "firebase/database";
// import {...} from "firebase/functions";
// import {...} from "firebase/storage";

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC3BLWcS_9vvmEFDLvi3UfNzEvHPhQCNNY",
  authDomain: "routeswallet.firebaseapp.com",
  projectId: "routeswallet",
  storageBucket: "routeswallet.appspot.com",
  messagingSenderId: "299957039299",
  appId: "1:299957039299:web:f176752f309c689c82b276",
  measurementId: "G-0PSXHMYS4D",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Export Firebase variables
export const analytics = getAnalyticsIfSupported(app);
export const database = getDatabase(app);
export const auth = getFirebaseAuth(app);

// For more information on how to access Firebase in your project,
// see the Firebase documentation: https://firebase.google.com/docs/web/setup#access-firebase
