import { createContext } from "react";
import { Theme, theme } from "@/constants/theme";

export const ThemeContext = createContext<{
  colorMode: "light" | "dark";
  theme: Theme;
}>({
  colorMode: "light",
  theme: theme.light,
});
