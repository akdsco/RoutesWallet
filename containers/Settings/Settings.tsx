import Container from "@/components/Container";
import { ThemedText } from "@/components/ThemedText";
import { View } from "react-native";
import { Button } from "@/components/Button/Buttons";
import { useSettings } from "@/containers/Settings/Settings.hook";
import { PoweredByStrava } from "@/components/Logo/PoweredByStrava";
import { Avatar } from "@rneui/base";

export const Settings = () => {
  const { userData, handleDisconnection } = useSettings();

  return (
    <Container>
      <View style={{ flex: 1, justifyContent: "space-between" }}>
        <View>
          <View
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              paddingVertical: 30,
            }}
          >
            <View
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Avatar
                size={54}
                rounded
                source={{
                  uri: userData?.profile_medium ?? "default-user",
                }}
                containerStyle={{ marginBottom: 16 }}
              />
              <View style={{ display: "flex", flexDirection: "row" }}>
                <ThemedText style={{ marginRight: 5 }}>
                  {userData?.firstname}
                </ThemedText>
                <ThemedText>{userData?.lastname}</ThemedText>
              </View>
            </View>
          </View>
          <Button
            title="Logout"
            onPress={handleDisconnection}
            accessibilityLabel="This will log you out"
          />
        </View>
        <View style={{ height: 40, marginBottom: 30 }}>
          <PoweredByStrava />
        </View>
      </View>
    </Container>
  );
};
