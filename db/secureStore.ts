import * as SecureStore from "expo-secure-store";
import { log } from "@/library/logger";

export const SECURE = {
  USER_ID: "USER_ID",
};

export const saveInLocalSecureStorage = async (key: string, value: string) => {
  log.debug("saveUserData", "Secure store SET", { key, value });
  await SecureStore.setItemAsync(key, value);
};

export const getFromLocalSecureStorage = async <
  T extends string | number | null,
>(
  key: string,
): Promise<T> => {
  const rawValue = await SecureStore.getItemAsync(key);
  log.debug("getUserData", "Secure store GET", { key, rawValue });

  // ✅ If T is a number, cast `rawValue` to a number
  if (typeof ({} as T) === "number") {
    const parsedNumber = Number(rawValue);
    if (isNaN(parsedNumber)) {
      throw new Error("Number parsing failed");
    }

    return parsedNumber as T;
  }

  return rawValue as T;
};
