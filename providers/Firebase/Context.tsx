import { createContext } from "react";
import { FirebaseData } from "./types";
import { database } from "@/constants/firebase";

export const FirebaseContext = createContext<FirebaseData>({
  database,
  user: null,
  isUserLoading: false,
});
