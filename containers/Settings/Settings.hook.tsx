import { useApp } from "@/hooks";
import { log } from "@/library/logger";
import { useSQLiteContext } from "expo-sqlite";
import { disconnectStrava, StravaAthleteBasic } from "@/integrations/strava";
import { useEffect, useState } from "react";
import { getStravaAthleteBasicProfile } from "@/db/methods";
import { removeFromLocalSecureStorage, SECURE } from "@/db/secureStore";

const fnName = "useSettings";

export const useSettings = () => {
  const { isStravaAuthed, athleteId, setIsStravaAuthed, setAthleteId } =
    useApp();
  const [userData, setUserData] = useState<StravaAthleteBasic | null>(null);
  const db = useSQLiteContext();

  useEffect(() => {
    getStravaAthleteBasicProfile(db)(athleteId).then((user) => {
      setUserData(user);
    });
  }, []);

  const handleDisconnection = async () => {
    log.info(fnName, "Removing strava authentication");
    await disconnectStrava(db)(athleteId);

    setAthleteId(-1);
    await removeFromLocalSecureStorage(SECURE.USER_ID);

    setIsStravaAuthed(false);
    log.info(fnName, "User logged out");
  };

  return {
    userData,
    isStravaAuthed,
    handleDisconnection,
  };
};
