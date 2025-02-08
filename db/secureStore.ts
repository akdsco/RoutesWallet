import * as SecureStore from "expo-secure-store";
import { log } from "@/library/logger";

export const SECURE = {
  USER_ID: "USER_ID",
};

export const saveInLocalSecureStorage = async (key: string, value: string) => {
  log.debug("saveUserData", "Secure store SET", { key, value });
  await SecureStore.setItemAsync(key, value);
};

export const getFromLocalSecureStorage = async <T>(key: string) => {
  const value = (await SecureStore.getItemAsync(key)) as unknown as T;
  log.debug("getUserData", "Secure store GET", { key, value });

  // TODO: do we need such check if state / initial context is set to 0?
  if (key === "USER_ID" && !value) {
    return 0 as T;
  }

  // TODO: we should cast to a number if T is of type number

  return value;
};
