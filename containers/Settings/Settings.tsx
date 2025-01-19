import Container from "@/components/Container";
import { ThemedText } from "@/components/ThemedText";
import { useLoading } from "@/hooks";
import { LogoStravaSquare } from "@/components/Logo/Strava";
import { View } from "react-native";
import { Button } from "@/components/Button/Buttons";

export const Settings = () => {
  const { isStravaAuthed } = useLoading();

  const handleConnection = () => {
    if (isStravaAuthed) {
      console.log("Strava: Disconnecting user");
    } else {
      console.log("Strava: Re-connecting user");
    }
  };

  return (
    <Container>
      <View
        style={{ display: "flex", flexDirection: "row", alignItems: "center" }}
      >
        <LogoStravaSquare width={40} height={40} />
        <ThemedText style={{ paddingLeft: 10 }}>
          Strava is {isStravaAuthed ? "connected" : "disconnected"}
        </ThemedText>
      </View>
      <Button
        title={isStravaAuthed ? "Disconnect" : "Connect"}
        onPress={() => {
          handleConnection();
        }}
        accessibilityLabel="This will connect/disconnect your Strava account."
      />
    </Container>
  );
};
