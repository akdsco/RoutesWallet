import Container from "@/components/Container";
import { ThemedText } from "@/components/ThemedText";
import { LogoStravaSquare } from "@/components/Logo/Strava";
import { View } from "react-native";
import { Button } from "@/components/Button/Buttons";
import { useSettings } from "@/containers/Settings/Settings.hook";

export const Settings = () => {
  const { request, isStravaAuthed, handleDisconnection } = useSettings();

  return (
    <Container>
      <View
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingVertical: 30,
        }}
      >
        <LogoStravaSquare width={40} height={40} />
        <ThemedText style={{ paddingTop: 8 }}>
          Strava is {isStravaAuthed ? "connected" : "disconnected"}
        </ThemedText>
      </View>
      <Button
        title="Logout"
        disabled={!request}
        onPress={handleDisconnection}
        accessibilityLabel="This will log you out"
      />
    </Container>
  );
};
