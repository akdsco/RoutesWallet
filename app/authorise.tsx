import { HomeScreen } from "@/containers/HomeScreen";
import { ThemedText } from "@/components/ThemedText";
import { Pressable, View } from "react-native";
import { initStravaAuth } from "@/auth/strava";
import { LogoStravaSquare } from "@/components/Logo/Strava";
import * as Linking from "expo-linking";
import { EventType } from "expo-linking";
import { useEffect } from "react";

export default function Authorise() {
  useEffect(() => {
    const handleDeepLink = (event: EventType) => {
      let data = Linking.parse(event.url);
      // TODO: most likely will move strava OAuth here...?
      console.log("Process deep link data: ", data); // Process the deep link data
    };

    // Add event listener for incoming links
    const sub = Linking.addEventListener("url", handleDeepLink);

    return () => {
      // Remove the listener when the component is unmounted
      sub.remove();
    };
  }, []);

  return (
    <HomeScreen>
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
    </HomeScreen>
  );
}
