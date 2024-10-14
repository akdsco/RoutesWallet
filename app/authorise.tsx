import { ThemedText } from "@/components/ThemedText";
import { Pressable, View } from "react-native";
import { handleStravaAuthorisation, initStravaAuth } from "@/auth/strava";
import { LogoStravaSquare } from "@/components/Logo/Strava";
import * as Linking from "expo-linking";
import { EventType } from "expo-linking";
import { useCallback, useEffect, useRef } from "react";
import Container from "@/components/Container";

export default function Authorise() {
  const hasHandledDeepLink = useRef(false);

  const handleDeepLink = useCallback((event: EventType) => {
    if (hasHandledDeepLink.current) {
      return;
    }

    const { searchParams } = new URL(event.url);
    handleStravaAuthorisation(searchParams);

    console.log("Process deep link data: ", searchParams);
    hasHandledDeepLink.current = true;
  }, []);

  useEffect(() => {
    const sub = Linking.addEventListener("url", handleDeepLink);

    return () => {
      sub.remove();
    };
  }, [handleDeepLink]);

  return (
    <Container>
      <Pressable onPress={initStravaAuth} style={{ marginTop: 140 }}>
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#fc4c02",
            padding: 20,
          }}
        >
          <View style={{ marginRight: 15 }}>
            <LogoStravaSquare width={40} height={40} />
          </View>
          <ThemedText>Add routes from Strava</ThemedText>
        </View>
      </Pressable>
    </Container>
  );
}
