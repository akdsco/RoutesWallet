import { getAnalytics, isSupported } from "@react-native-firebase/analytics";
import { ReactNativeFirebase } from "@react-native-firebase/app";

export const getAnalyticsIfSupported = (
  app: ReactNativeFirebase.FirebaseApp,
) => {
  let analytics = null;

  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      } else {
        console.log("Analytics not supported");
      }
    })
    .catch((error) => {
      console.error("Error checking analytics support", error);
    });

  return analytics;
};
