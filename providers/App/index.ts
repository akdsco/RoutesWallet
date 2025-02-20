import { UpdateFn } from "@/library/types";

export { AppProvider } from "./Provider";
export { AppContext } from "./Context";

export type AppContextType = {
  athleteId: number;
  setAthleteId: UpdateFn<number>;
  loading: boolean;
  setLoading: UpdateFn<boolean>;
  isAuthenticating: boolean;
  setIsAuthenticating: UpdateFn<boolean>;
  isStravaAuthed: boolean;
  setIsStravaAuthed: UpdateFn<boolean>;
};
