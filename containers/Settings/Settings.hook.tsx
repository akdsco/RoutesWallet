import { useEffect } from "react";
import { useApp } from "@/hooks";

export const useSettings = () => {
  const {} = useApp();

  useEffect(() => {
    console.log("Settings mounted");

    return () => {
      console.log("Settings unmounted");
    };
  }, []);

  return {
    // TODO: implement the actual checks
    isStravaAuthed: true,
  };
};
