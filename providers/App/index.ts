import { StravaRouteDetailed } from "@/auth/strava";

export { AppProvider } from "./Provider";
export { AppContext } from "./Context";

export type AppContextType = {
  athleteId: number | null;
  // TODO: sure this should be held so high up?
  routes: StravaRouteDetailed[];
  loading: boolean;
  setLoading: (value: boolean) => void;
  isAuthenticating: boolean;
  setIsAuthenticating: (value: boolean) => void;
  isStravaAuthed: boolean;
  setIsStravaAuthed: (value: boolean) => void;
};
