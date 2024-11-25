import { useState, useEffect } from "react";
import { FirebaseData, User } from "./types";
import { auth, db, onAuthStateChanged } from "@/constants/firebase";

export const useFirebaseProvider = (): FirebaseData => {
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState<boolean>(true);

  useEffect(() => {
    let isCurrent = true;

    const unsubscribe = auth().onAuthStateChanged((user) => {
      if (!isCurrent) {
        return;
      }

      if (user) {
        const { displayName, photoURL, email } = user;

        // TODO: Is there a way to enforce below values from Firebase database?
        setUser({
          email: email || "no-email@dude.com",
          photoUrl: photoURL || "http://default-usr-img.png",
          displayName: displayName || "Unknown name",
        });
      } else {
        setUser(null);
      }

      setIsUserLoading(false);
    });

    return () => {
      isCurrent = false;
      unsubscribe();
    };
  }, []);

  return {
    user,
    isUserLoading,
    db,
  };
};
