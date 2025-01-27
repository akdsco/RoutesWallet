import { createContext } from "react";
import { ColorMode, Theme, theme } from "@/constants/theme";

export const ThemeContext = createContext<{
  colorMode: ColorMode;
  theme: Theme;
}>({
  colorMode: "light",
  theme: theme.light,
});
