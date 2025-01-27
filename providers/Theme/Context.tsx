import { createContext } from "react";
import { ColorMode, Theme, theme } from "@/library/theme";

export const ThemeContext = createContext<{
  colorMode: ColorMode;
  theme: Theme;
}>({
  colorMode: "light",
  theme: theme.light,
});
