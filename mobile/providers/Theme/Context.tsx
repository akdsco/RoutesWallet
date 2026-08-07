import { createContext } from "react";
import { theme, ThemeContextType } from "@/library/theme";

export const ThemeContext = createContext<ThemeContextType>({
  colorMode: "light",
  theme: theme.light,
});
