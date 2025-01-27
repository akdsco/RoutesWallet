import { useEffect, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { useFonts } from "expo-font";
import { getUserData, SECURE } from "@/db/secureStore";
import {
  checkStravaConnection,
  getStravaRoutesFromDb,
  StravaRoute,
} from "@/auth/strava";
import { log } from "@/library/logger";

export const useAppProvider = () => {
  const [loading, setLoading] = useState(true);

  const db = useSQLiteContext();
  const [fontLoaded, fontError] = useFonts({
    SpaceMono: require("../../assets/fonts/SpaceMono-Regular.ttf"),
  });
  // TODO: can we deal with  null athleteId in the root? so we don't pass it null ever?
  const [athleteId, setAthleteId] = useState<number | null>(null);
  const [isStravaAuthed, setIsStravaAuthed] = useState<boolean>(false);
  const [routes, setRoutes] = useState<StravaRoute[]>([]);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (fontError) {
      throw fontError;
    }
  }, [fontError]);

  useEffect(() => {
    if (fontLoaded && !isStravaAuthed) {
      log.debug("useApp", `fontLoaded: ${fontLoaded}`);
      setLoading(false);
    }
  }, [fontLoaded]);

  useEffect(() => {
    const run = async () => {
      const athleteId = await getUserData<number>(SECURE.USER_ID);
      setAthleteId(athleteId);

      const isStravaAuthed = await checkStravaConnection(db)(athleteId);
      const routes = await getStravaRoutesFromDb(db)(athleteId);

      log.debug("useApp", `useEffect loading: ${loading}`);
      log.debug("useApp", `useEffect isStravaAuthed ${isStravaAuthed}`);

      setIsStravaAuthed(isStravaAuthed);
      setRoutes(routes);
    };

    run().then();
  }, [loading, fontLoaded, isStravaAuthed]);

  const setLoader = (value: boolean) => {
    setLoading(value);
  };

  const setStravaAuth = (value: boolean) => {
    setIsStravaAuthed(value);
  };

  return {
    routes,
    athleteId,
    loading,
    isStravaAuthed,
    setLoading: setLoader,
    setIsStravaAuthed: setStravaAuth,
  };
};
