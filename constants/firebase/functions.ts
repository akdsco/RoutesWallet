// import { getAnalytics, isSupported } from "firebase/analytics";
// import {
//   initializeAuth,
//   getReactNativePersistence,
//   getAuth,
//   Auth,
// } from "firebase/auth";
// import { FirebaseApp } from "firebase/app";
// import { Platform } from "react-native";
// import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
//
// export const getAnalyticsIfSupported = (app: FirebaseApp) => {
//   let analytics = null;
//
//   isSupported()
//     .then((supported) => {
//       if (supported) {
//         analytics = getAnalytics(app);
//       } else {
//         console.log("Analytics not supported");
//       }
//     })
//     .catch((error) => {
//       console.error("Error checking analytics support", error);
//     });
//
//   return analytics;
// };
//
// export const getFirebaseAuth = (app: FirebaseApp): Auth => {
//   let auth = null;
//
//   if (Platform.OS === "web") {
//     auth = getAuth(app);
//   } else {
//     auth = initializeAuth(app, {
//       persistence: getReactNativePersistence(ReactNativeAsyncStorage),
//     });
//   }
//
//   return auth;
// };
