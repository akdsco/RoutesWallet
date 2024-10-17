import { PropsWithChildren } from "react";
import { ThemeContext } from "./Context";
import { useAppThemeProvider } from "./Provider.hook";

export const AppThemeProvider = ({ children }: PropsWithChildren) => {
  const theme = useAppThemeProvider();

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
};
