export { AppProvider } from "./Provider";
export { AppContext } from "./Context";

type UpdateFn<T> = (value: T) => void;

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
