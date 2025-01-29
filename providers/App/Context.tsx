import { createContext } from "react";
import { AppContextType } from "@/providers/App";

export const AppContext = createContext<AppContextType>({
  athleteId: null,
  routes: [],
  loading: true,
  setLoading: (value: boolean) => undefined,
  isStravaAuthed: false,
  isAuthenticating: false,
  setIsAuthenticating: (value: boolean) => undefined,
  setIsStravaAuthed: (value: boolean) => undefined,
});
