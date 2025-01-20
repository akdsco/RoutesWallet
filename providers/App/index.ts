export { AppProvider } from "./Provider";
export { AppContext } from "./Context";

export type AppContextType = {
  athleteId: number | null;
  routesAvailable: boolean;
  isStravaAuthed: boolean;
  loading: boolean;
  setInternalLoader: (value: boolean) => void;
  setIsStravaAuthed: (value: boolean) => void;
};
