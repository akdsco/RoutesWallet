import { useColorScheme } from "react-native";
import { ColorMode, theme as themesObject } from "@/constants/theme";
import { useEffect, useState } from "react";

export const useAppThemeProvider = () => {
  const colorScheme = useColorScheme();
  const defaultColorScheme = "light";

  const { light, dark } = themesObject;

  const initTheme = colorScheme === defaultColorScheme ? light : dark;

  const [theme, setTheme] = useState(initTheme);
  const [colorMode, setColorMode] = useState<ColorMode>(defaultColorScheme);

  console.debug("Rendering theme: ", colorScheme);

  useEffect(() => {
    console.log("Changing theme: ", colorScheme);

    setTheme(colorScheme === defaultColorScheme ? light : dark);
    setColorMode(colorScheme ? colorScheme : defaultColorScheme);
  }, [colorScheme]);

  return { colorMode, theme };
};
