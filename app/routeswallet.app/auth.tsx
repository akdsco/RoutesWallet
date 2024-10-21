import { usePathname, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { View, Text, Platform } from "react-native";

export default function AuthPage() {
  const router = useRouter();
  const pathName = usePathname();
  const [isReady, setIsReady] = React.useState(false);

  useEffect(() => {
    if (Platform.OS === "android") {
      const queryParams = new URLSearchParams(pathName.split("?")[1]);
      console.log("Query parameters:", Object.fromEntries(queryParams));
      console.log("router", router);
      console.log("pathName", pathName);
      router.back();
    } else {
      setIsReady(true);
    }
  }, [router, pathName]);

  if (!isReady) {
    return null;
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>
        Hello from Auth Page!
      </Text>
    </View>
  );
}
