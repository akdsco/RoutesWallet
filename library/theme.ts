/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

type Themes = {
  light: Theme;
  dark: Theme;
};

export type ThemeContextType = {
  colorMode: ColorMode;
  theme: Theme;
};

export type ColorMode = "light" | "dark";

export type Theme = {
  text: string;
  background: string;
  contrastBackground: string;
  tint: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
  shadowColor: string;
  toast: {
    info: string;
    success: string;
    warning: string;
    error: string;
  };
};

const tintColorLight = "#151617";
const tintColorDark = "#fff";

export const theme: Themes = {
  light: {
    text: "#4e535a",
    background: "#fff",
    contrastBackground: "#efeff1",
    tint: tintColorLight,
    shadowColor: "#000",
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
    toast: {
      info: "#3b82f6",
      success: "#10b981",
      warning: "#dd6b20",
      error: "#ef4444",
    },
  },
  dark: {
    text: "#fff",
    background: "#11111f",
    contrastBackground: "#1a1a28",
    tint: tintColorDark,
    shadowColor: "#bfbfbf",
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
    toast: {
      info: "#bfdbfe",
      success: "#a7f3d0",
      warning: "#fbd38d",
      error: "#fecaca",
    },
  },
};
