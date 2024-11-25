import { createContext } from "react";
import { FirebaseData } from "./types";
import { db } from "@/constants/firebase";

export const FirebaseContext = createContext<FirebaseData>({
  db,
  user: null,
  isUserLoading: false,
});
