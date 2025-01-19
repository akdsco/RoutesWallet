import { useEffect } from "react";
import { useLoading } from "@/hooks";

export const useSettings = () => {
  const {} = useLoading();

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
