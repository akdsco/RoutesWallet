import React, { createContext } from "react";
import { Theme, theme } from "@/constants/theme";

export const ThemeContext = createContext<
  [Theme, React.Dispatch<React.SetStateAction<Theme>>]
>([theme.light, () => {}]);
