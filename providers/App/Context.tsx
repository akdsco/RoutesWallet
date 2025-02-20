import { createContext } from "react";
import { AppContextType } from "@/providers/App";

export const AppContext = createContext<AppContextType>({
  athleteId: 0,
  setAthleteId: (value: number) => undefined,
  loading: true,
  setLoading: (value: boolean) => undefined,
  isAuthenticating: false,
  setIsAuthenticating: (value: boolean) => undefined,
  isStravaAuthed: false,
  setIsStravaAuthed: (value: boolean) => undefined,
});
