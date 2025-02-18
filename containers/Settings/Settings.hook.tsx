import { useApp } from "@/hooks";
import { log } from "@/library/logger";
import { useSQLiteContext } from "expo-sqlite";
import { disconnectStrava, StravaAthleteBasic } from "@/integrations/strava";
import { useEffect, useState } from "react";
import { getStravaAthleteBasicProfile } from "@/db/methods";

const fnName = "useSettings";

export const useSettings = () => {
  const { isStravaAuthed, athleteId, setIsStravaAuthed } = useApp();
  const [userData, setUserData] = useState<StravaAthleteBasic | null>(null);
  const db = useSQLiteContext();

  useEffect(() => {
    getStravaAthleteBasicProfile(db)(athleteId).then((user) => {
      setUserData(user);
    });
  }, []);

  const handleDisconnection = async () => {
    if (!isStravaAuthed || athleteId === 0) {
      log.info(fnName, "User is not connected to Strava");
      setIsStravaAuthed(false);
      return;
    }

    log.info(fnName, "Removing strava authentication");
    await disconnectStrava(db)(athleteId);
    setIsStravaAuthed(false);
  };

  return {
    userData,
    isStravaAuthed,
    handleDisconnection,
  };
};
