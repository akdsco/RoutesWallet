import { createContext } from "react";
import { AppContextType } from "@/providers/App";

export const AppContext = createContext<AppContextType>({
  athleteId: null,
  routesAvailable: false,
  isStravaAuthed: false,
  loading: true,
  setInternalLoader: (value: boolean) => undefined,
  setIsStravaAuthed: (value: boolean) => undefined,
});
