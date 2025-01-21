import Container from "@/components/Container";
import { StravaAuthButton } from "@/containers/StravaAuth/StravaAuthButton";
import { ThemedText } from "@/components/ThemedText";
import { View } from "react-native";
import { Logo } from "@/components/Logo/Logo";

export default function Authorise() {
  return (
    <Container>
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          padding: 7,
        }}
      >
        <Logo size={180} />
      </View>
      <View
        style={{
          height: "70%",
          paddingHorizontal: 7,
          justifyContent: "center",
        }}
      >
        <View style={{ paddingBottom: 25 }}>
          <ThemedText type="title" style={{ textAlign: "center" }}>
            Sync your Strava account
          </ThemedText>
        </View>
        <StravaAuthButton />
      </View>
    </Container>
  );
}
