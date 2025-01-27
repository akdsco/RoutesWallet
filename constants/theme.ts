/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

type Themes = {
  light: Theme;
  dark: Theme;
};

export type ColorMode = "light" | "dark";

export type Theme = {
  text: string;
  background: string;
  tint: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
  shadowColor: string;
};

const tintColorLight = "#151617";
const tintColorDark = "#fff";

export const theme: Themes = {
  light: {
    text: "#4e535a",
    background: "#fff",
    tint: tintColorLight,
    shadowColor: "#000",
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#fff",
    background: "#11111f",
    tint: tintColorDark,
    shadowColor: "#bfbfbf",
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
  },
};
