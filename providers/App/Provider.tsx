import { PropsWithChildren } from "react";
import { AppContext } from "./Context";
import { useAppProvider } from "./Provider.hook";

export const AppProvider = ({ children }: PropsWithChildren) => {
  const appProvider = useAppProvider();

  return (
    <AppContext.Provider value={appProvider}>{children}</AppContext.Provider>
  );
};
