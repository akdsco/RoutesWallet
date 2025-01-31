import { useApp } from "@/hooks";
import { log } from "@/library/logger";
import { useStravaAuthButton } from "@/containers/StravaAuth/StravaAuthButton.hook";
import { useSQLiteContext } from "expo-sqlite";
import { disconnectStrava } from "@/auth/strava/api";

const fnName = "useSettings";

export const useSettings = () => {
  const { isStravaAuthed, athleteId, setIsStravaAuthed } = useApp();
  const { request } = useStravaAuthButton();
  const db = useSQLiteContext();

  const handleDisconnection = async () => {
    if (!isStravaAuthed || !athleteId) {
      log.info(fnName, "User is not connected to Strava");
      setIsStravaAuthed(false);
      return;
    }

    log.info(fnName, "Removing strava authentication");
    await disconnectStrava(db)(athleteId);
    setIsStravaAuthed(false);
  };

  return {
    request,
    isStravaAuthed,
    handleDisconnection,
  };
};
