import { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { getUserData, SECURE } from "@/db/secureStore";

export const useLoading = () => {
  const [loading, setLoading] = useState(true);
  const [fontLoaded, fontError] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [athleteId, setAthleteId] = useState<number | null>(null);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (fontError) {
      throw fontError;
    }
  }, [fontError]);

  useEffect(() => {
    if (fontLoaded && !loading) {
      SplashScreen.hideAsync().then();
    }
  }, [loading, fontLoaded]);

  useEffect(() => {
    const fn = async () => {
      const athleteId = await getUserData<number>(SECURE.USER_ID);
      setAthleteId(athleteId);
    };

    fn().then(() => {
      setLoading(false);
    });
  }, [loading]);

  return {
    athleteId,
    loading: !loading && fontLoaded,
    setLoading,
  };
};
