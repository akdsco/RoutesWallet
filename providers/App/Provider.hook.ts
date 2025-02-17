import { useEffect, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { useFonts } from "expo-font";
import { getFromLocalSecureStorage, SECURE } from "@/db/secureStore";
import { checkStravaConnection } from "@/integrations/strava";
import { log } from "@/library/logger";
import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

export const useAppProvider = () => {
  const [loading, setLoading] = useState(true);

  const db = useSQLiteContext();
  const [fontLoaded, fontError] = useFonts({
    SpaceMono: require("../../assets/fonts/SpaceMono-Regular.ttf"),
  });
  // TODO: can we deal with  null athleteId in the root? so we don't pass it null ever?
  const [athleteId, setAthleteId] = useState<number>(-1);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [isStravaAuthed, setIsStravaAuthed] = useState<boolean>(false);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (fontError) {
      throw fontError;
    }
  }, [fontError]);

  useEffect(() => {
    const run = async () => {
      const athleteId = await getFromLocalSecureStorage<number>(SECURE.USER_ID);
      setAthleteId(athleteId);

      const isStravaAuthed = await checkStravaConnection(db)(athleteId);

      log.debug("useApp", `useEffect`, {
        fontLoaded,
        loading,
        isAuthenticating,
        isStravaAuthed,
      });

      setIsStravaAuthed(isStravaAuthed);

      if (
        !loading &&
        fontLoaded &&
        !isAuthenticating &&
        isStravaAuthed &&
        Number(athleteId) > 0
      ) {
        log.debug(
          "useApp",
          "Redirecting to authed root as user is authenticated",
          {
            loading,
            isStravaAuthed,
          },
        );
        router.navigate("/(tabs)/routes/");
      }
    };

    run().then(() => {
      if (!isAuthenticating) {
        setLoading(false);
        SplashScreen.hide();
      }
    });
  }, [loading, fontLoaded, isAuthenticating, isStravaAuthed]);

  const getAthleteId = () => {
    if (!athleteId) {
      // TODO: can we in any way make sure athleteId is always a number and not null?
    }
    return athleteId;
  };

  return {
    athleteId: getAthleteId(),
    loading,
    setLoading: (value: boolean) => setLoading(value),
    isStravaAuthed,
    setIsStravaAuthed: (value: boolean) => setIsStravaAuthed(value),
    isAuthenticating,
    setIsAuthenticating: (value: boolean) => setIsAuthenticating(value),
  };
};
