import { useEffect, useState } from "react";
import { useFonts } from "expo-font";
import { getUserData, SECURE } from "@/db/secureStore";
import { checkRoutesAvailable, checkStravaConnection } from "@/auth/strava";
import { useSQLiteContext } from "expo-sqlite";

export const useLoading = () => {
  const [internalLoader, setInternalLoader] = useState(true);
  const [externalLoader, setExternalLoader] = useState(true);

  const db = useSQLiteContext();
  const [fontLoaded, fontError] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [athleteId, setAthleteId] = useState<number | null>(null);
  const [isStravaAuthed, setIsStravaAuthed] = useState<boolean>(false);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (fontError) {
      throw fontError;
    }
  }, [fontError]);

  useEffect(() => {
    if (fontLoaded && !internalLoader) {
      setExternalLoader(false);
    }
  }, [internalLoader, fontLoaded]);

  useEffect(() => {
    const run = async () => {
      const athleteId = await getUserData<number>(SECURE.USER_ID);
      setAthleteId(athleteId);

      const isStravaAuthed = await checkStravaConnection(db)(athleteId);
      const routesAvailable = await checkRoutesAvailable(db)(athleteId);

      if (isStravaAuthed && routesAvailable) {
        setIsStravaAuthed(true);
      }
    };

    run().then(() => {
      setInternalLoader(false);
    });
  }, [internalLoader]);

  return {
    athleteId,
    isStravaAuthed: isStravaAuthed && !externalLoader,
    loading: externalLoader,
    setInternalLoader,
    setIsStravaAuthed,
  };
};
