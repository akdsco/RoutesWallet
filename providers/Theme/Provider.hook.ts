import { useColorScheme } from "react-native";
import { ColorMode, theme as themesObject } from "@/library/theme";
import { useEffect, useState } from "react";
import { log } from "@/library/logger";

export const useAppThemeProvider = () => {
  const colorScheme = useColorScheme();
  const defaultColorScheme = "light";

  const { light, dark } = themesObject;

  const initTheme = colorScheme === defaultColorScheme ? light : dark;

  const [theme, setTheme] = useState(initTheme);
  const [colorMode, setColorMode] = useState<ColorMode>(defaultColorScheme);

  log.debug("useAppTheme", "Rendering theme", { colorScheme });

  useEffect(() => {
    log.debug("useAppTheme", "Changing theme", { colorScheme });

    setTheme(colorScheme === defaultColorScheme ? light : dark);
    setColorMode(colorScheme ? colorScheme : defaultColorScheme);
  }, [colorScheme]);

  return { colorMode, theme };
};
