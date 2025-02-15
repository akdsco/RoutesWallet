import { PropsWithChildren } from "react";
import { useTheme } from "@/hooks";
import { createTheme, ThemeProvider } from "@rneui/themed";
import { Theme } from "@/library/theme";

const reactNativeElementsTheme = (theme: Theme) =>
  createTheme({
    components: {
      ListItem: {
        containerStyle: {
          backgroundColor: theme.background,
          borderBottomColor: theme.contrastBackground,
          borderBottomWidth: 2,
        },
      },
      ListItemCheckBox: {
        containerStyle: {
          backgroundColor: theme.background,
        },
      },
    },
  });

export const ElementsProvider = ({ children }: PropsWithChildren) => {
  const { theme } = useTheme();

  return (
    <ThemeProvider theme={reactNativeElementsTheme(theme)}>
      {children}
    </ThemeProvider>
  );
};
