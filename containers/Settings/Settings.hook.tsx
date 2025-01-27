import { useEffect } from "react";
import { useApp } from "@/hooks";
import { log } from "@/library/logger";

const fnName = "useSettings";

export const useSettings = () => {
  const {} = useApp();

  useEffect(() => {
    log.info(fnName, "Settings mounted");

    return () => {
      log.info(fnName, "Settings unmounted");
    };
  }, []);

  return {
    // TODO: implement the actual checks
    isStravaAuthed: true,
  };
};
