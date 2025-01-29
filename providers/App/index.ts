import { StravaRoute } from "@/auth/strava";

export { AppProvider } from "./Provider";
export { AppContext } from "./Context";

export type AppContextType = {
  athleteId: number | null;
  routes: StravaRoute[];
  loading: boolean;
  setLoading: (value: boolean) => void;
  isAuthenticating: boolean;
  setIsAuthenticating: (value: boolean) => void;
  isStravaAuthed: boolean;
  setIsStravaAuthed: (value: boolean) => void;
};
