import { useColorScheme } from "react-native";
import { theme as baseTheme } from "@/constants/theme";
import { useState, useEffect } from "react";

export const useAppThemeProvider = () => {
  const colorScheme = useColorScheme();
  const initialScheme =
    colorScheme === "light" ? baseTheme.light : baseTheme.dark;

  const [theme, setTheme] = useState(initialScheme);

  console.log("Rendering theme: ", colorScheme);

  useEffect(() => {
    console.log("Changing theme: ", colorScheme);
    setTheme(colorScheme === "light" ? baseTheme.light : baseTheme.dark);
  }, [colorScheme]);

  return theme;
};
