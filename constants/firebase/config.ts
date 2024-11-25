import { Platform } from "react-native";
import { getDatabase } from "@react-native-firebase/database";
import { getApp, initializeApp } from "@react-native-firebase/app";
import auth from "@react-native-firebase/auth";

import { getAnalyticsIfSupported } from "./functions";

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

  //TODO check if below setup also works on mobile, if not, probably have to re-structure
}

export const app = getApp();

export const db = getDatabase(app);
export const analytics = getAnalyticsIfSupported(app);
export { auth };

// For more information on how to access Firebase in your project,
// see the Firebase documentation: https://firebase.google.com/docs/web/setup#access-firebase
