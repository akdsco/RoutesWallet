import React, { useEffect } from "react";
import { usePathname, useRouter } from "expo-router";
import { Platform, Text, View } from "react-native";
import { log } from "@/library/logger";

export default function Unmatched() {
  const router = useRouter();
  const pathName = usePathname();
  const [isReady, setIsReady] = React.useState(false);

  useEffect(() => {
    if (Platform.OS === "android") {
      const queryParams = new URLSearchParams(pathName.split("?")[1]);
      log.info(
        "Unmatched Route",
        "User requesting screen that does not exist",
        {
          queryParams: Object.fromEntries(queryParams),
          pathName,
        },
      );
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
