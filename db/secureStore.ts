import * as SecureStore from "expo-secure-store";

export const SECURE = {
  USER_ID: "USER_ID",
};

export const saveUserData = async (key: string, value: string) => {
  console.debug("Secure store SET", key, value);
  await SecureStore.setItemAsync(key, value);
};

export const getUserData = async <T>(key: string) => {
  const value = (await SecureStore.getItemAsync(key)) as unknown as T;
  console.debug("Secure store GET", key, value);
  return value;
};
