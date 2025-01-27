import { createContext } from "react";
import { AppContextType } from "@/providers/App";

export const AppContext = createContext<AppContextType>({
  athleteId: null,
  routes: [],
  loading: true,
  setLoading: (value: boolean) => undefined,
  isStravaAuthed: false,
  setIsStravaAuthed: (value: boolean) => undefined,
});
