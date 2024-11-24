import { Platform } from "react-native";
import { getDatabase } from "@react-native-firebase/database";
import { getApp, initializeApp } from "@react-native-firebase/app";

// import { getAnalyticsIfSupported, getFirebaseAuth } from "./functions";

if (Platform.OS === "web") {
  const firebaseConfig = {
    apiKey: "AIzaSyC3BLWcS_9vvmEFDLvi3UfNzEvHPhQCNNY",
    authDomain: "routeswallet.firebaseapp.com",
    projectId: "routeswallet",
    storageBucket: "routeswallet.appspot.com",
    messagingSenderId: "299957039299",
    appId: "1:299957039299:web:f176752f309c689c82b276",
    measurementId: "G-0PSXHMYS4D",
  };

  initializeApp(firebaseConfig);
}

export const app = getApp();

// Export Firebase variables
export const database = getDatabase(app);

// TODO: unlock analytics and auth once database is working
// export const analytics = getAnalyticsIfSupported(app);
// export const auth = getFirebaseAuth(app);

// For more information on how to access Firebase in your project,
// see the Firebase documentation: https://firebase.google.com/docs/web/setup#access-firebase
