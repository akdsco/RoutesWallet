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
  contrastBg: string;
  contrastBgSecondary: string;
  tint: string;
  icon: string;
  iconSelected: string;
  shadowColor: string;
  toast: {
    info: string;
    success: string;
    warning: string;
    error: string;
  };
  borderColor: string;
  borderWidth: number;
  pop: string;
  popContrast: string;
};

const tintColorLight = "#151617";
const tintColorDark = "rgba(255,255,255,0.88)";

export const theme: Themes = {
  light: {
    text: "#4e535a",
    background: "#fff",
    contrastBg: "#efeff1",
    contrastBgSecondary: "#b8b8b8",
    tint: tintColorLight,
    shadowColor: "#000",
    icon: "#687076",
    iconSelected: tintColorLight,
    toast: {
      info: "#3b82f6",
      success: "#10b981",
      warning: "#dd6b20",
      error: "#ef4444",
    },
    borderColor: "#e1e1e1",
    borderWidth: 1,
    pop: "#6ac8d5",
    popContrast: "#40727f",
  },
  dark: {
    text: "#fff",
    background: "#11111f",
    contrastBg: "#1a1a28",
    contrastBgSecondary: "#272738",
    tint: tintColorDark,
    shadowColor: "#bfbfbf",
    icon: "#9BA1A6",
    iconSelected: tintColorDark,
    toast: {
      info: "#bfdbfe",
      success: "#a7f3d0",
      warning: "#fbd38d",
      error: "#fecaca",
    },
    borderColor: "#6c6c6c",
    borderWidth: 0.3,
    pop: "#6ac8d5",
    popContrast: "#40727f",
  },
};
