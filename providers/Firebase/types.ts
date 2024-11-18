import { Database } from "@firebase/database";

export type FirebaseData = {
  database: Database;
  user: User | null;
  isUserLoading: boolean;
};

export type User = {
  displayName: string;
  photoUrl: string;
  email?: string;
};
