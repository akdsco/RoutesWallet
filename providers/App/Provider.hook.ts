import { useEffect, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { useFonts } from "expo-font";
import { getUserData, SECURE } from "@/db/secureStore";
import { checkRoutesAvailable, checkStravaConnection } from "@/auth/strava";

export const useAppProvider = () => {
  const [internalLoader, setInternalLoader] = useState(true);
  const [externalLoader, setExternalLoader] = useState(true);

  const db = useSQLiteContext();
  const [fontLoaded, fontError] = useFonts({
    SpaceMono: require("../../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [athleteId, setAthleteId] = useState<number | null>(null);
  const [isStravaAuthed, setIsStravaAuthed] = useState<boolean>(false);
  const [routesAvailable, setRoutesAvailable] = useState<boolean>(false);

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

      if (routesAvailable) {
        setRoutesAvailable(true);
      }
    };

    run().then(() => {
      setInternalLoader(false);
    });
  }, [internalLoader]);

  const setLoader = (value: boolean) => {
    setInternalLoader(value);
  };

  const setStravaAuth = (value: boolean) => {
    setIsStravaAuthed(value);
  };

  return {
    athleteId,
    routesAvailable,
    isStravaAuthed: isStravaAuthed && !externalLoader,
    loading: externalLoader,
    setInternalLoader: setLoader,
    setIsStravaAuthed: setStravaAuth,
  };
};
