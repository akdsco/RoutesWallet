import { useContext } from "react";
import { AppContext } from "@/providers/App";

export const useApp = () => useContext(AppContext);
