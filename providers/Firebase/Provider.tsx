import { PropsWithChildren } from "react";
import { FirebaseContext } from "./Context";
import { useFirebaseProvider } from "./Provider.hook";

export const FirebaseProvider = ({ children }: PropsWithChildren) => {
  const firebaseData = useFirebaseProvider();

  return (
    <FirebaseContext.Provider value={firebaseData}>
      {children}
    </FirebaseContext.Provider>
  );
};
