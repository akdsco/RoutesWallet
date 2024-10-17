import { useContext } from "react";
import { FirebaseContext } from "@/providers/Firebase";

export const useFirebase = () => useContext(FirebaseContext);
