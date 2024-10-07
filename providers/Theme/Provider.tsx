import React, { useEffect, useState } from "react";
import { theme as baseTheme } from "@/constants/theme";
import { useColorScheme } from "react-native";
import { ThemeContext } from "./Context";

export const AppThemeProvider = ({ children }: React.PropsWithChildren) => {
  const colorScheme = useColorScheme();
  const initialScheme =
    colorScheme === "light" ? baseTheme.light : baseTheme.dark;
  const [theme, setTheme] = useState(initialScheme);

  console.log("Rendering theme: ", colorScheme);

  useEffect(() => {
    console.log("Changing theme: ", colorScheme);
    setTheme(colorScheme === "light" ? baseTheme.light : baseTheme.dark);
  }, [colorScheme]);

  return (
    <ThemeContext.Provider value={[theme, setTheme]}>
      {children}
    </ThemeContext.Provider>
  );
};
