import { createContext } from "react";
import { Theme, theme } from "@/constants/theme";

export const ThemeContext = createContext<Theme>(theme.light);
