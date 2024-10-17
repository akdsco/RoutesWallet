import { Firestore } from "firebase/firestore";

export type FirebaseData = {
  database: Firestore;
  user: User | null;
  isUserLoading: boolean;
};

export type User = {
  displayName: string;
  photoUrl: string;
  email?: string;
};
