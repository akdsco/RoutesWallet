import Container from "@/components/Container";
import { ThemedText } from "@/components/ThemedText";
import { useApp } from "@/hooks";
import { LogoStravaSquare } from "@/components/Logo/Strava";
import { View } from "react-native";
import { Button } from "@/components/Button/Buttons";
import { disconnectStrava } from "@/auth/strava/api";
import { useSQLiteContext } from "expo-sqlite";
import { useStravaAuthButton } from "@/containers/StravaAuth/StravaAuthButton.hook";
import { log } from "@/library/logger";

export const Settings = () => {
  const { isStravaAuthed, athleteId, setIsStravaAuthed } = useApp();
  const { request, promptAsync } = useStravaAuthButton();
  const db = useSQLiteContext();

  const handleConnection = async () => {
    if (isStravaAuthed && athleteId) {
      log.info("useSettings", "Removing strava authentication");
      if (athleteId) await disconnectStrava(db)(athleteId);
      setIsStravaAuthed(false);
    } else {
      // TODO: do we need this? Considering we take user back to login page straight away.
      console.log("Strava: Re-connecting user");
      await promptAsync();
      setIsStravaAuthed(true);
    }
  };

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
        title={isStravaAuthed ? "Logout" : "Connect"}
        disabled={!request}
        onPress={handleConnection}
        accessibilityLabel="This will connect/disconnect your Strava account."
      />
    </Container>
  );
};
