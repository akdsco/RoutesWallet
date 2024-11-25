import { FirebaseDatabaseTypes } from "@react-native-firebase/database";

export type FirebaseData = {
  db: FirebaseDatabaseTypes.Module;
  user: User | null;
  isUserLoading: boolean;
};

export type User = {
  displayName: string;
  photoUrl: string;
  email?: string;
};
