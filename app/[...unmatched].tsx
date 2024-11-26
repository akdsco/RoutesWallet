import React, { useEffect } from "react";
import { usePathname, useRouter } from "expo-router";
import { Platform, View, Text } from "react-native";

export default function Unmatched() {
  const router = useRouter();
  const pathName = usePathname();
  const [isReady, setIsReady] = React.useState(false);

  useEffect(() => {
    if (Platform.OS === "android") {
      const queryParams = new URLSearchParams(pathName.split("?")[1]);
      console.log("Query parameters:", Object.fromEntries(queryParams));
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
    <View>
      <Text>Unmatched route</Text>
    </View>
  );
}
