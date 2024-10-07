import { HomeScreen } from "@/containers/HomeScreen";
import { ThemedText } from "@/components/ThemedText";
import { Pressable, View } from "react-native";
import { initStravaAuth } from "@/auth/strava";
import { LogoStravaSquare } from "@/components/Logo/Strava";

export default function Authorise() {
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
            <LogoStravaSquare />
          </View>
          <ThemedText>Add routes from Strava</ThemedText>
        </View>
      </Pressable>
    </HomeScreen>
  );
}
