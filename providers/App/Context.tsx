import { createContext } from "react";
import { AppContextType } from "@/providers/App";

export const AppContext = createContext<AppContextType>({
  athleteId: 0,
  setAthleteId: () => undefined,
  loading: true,
  setLoading: () => undefined,
  isAuthenticating: false,
  setIsAuthenticating: () => undefined,
  isStravaAuthed: false,
  setIsStravaAuthed: () => undefined,
});
