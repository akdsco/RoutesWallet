import React from "react";
import { useTheme } from "@/hooks/useTheme";
import { HomeScreen } from "@/containers/HomeScreen";
import { ThemedText } from "@/components/ThemedText";
import { Link } from "expo-router";
import { View } from "react-native";

export default function Index() {
  const [theme] = useTheme();

  const noRoutesAvailable = true;

  if (noRoutesAvailable) {
    return (
      <HomeScreen>
        <View style={{ marginTop: 140 }}>
          <Link
            href={{ pathname: "/authorise" }}
            style={{
              width: "100%",
              textAlign: "center",
              padding: 20,
              borderWidth: 1,
              borderColor: "green",
            }}
          >
            <ThemedText>Add routes</ThemedText>
          </Link>
        </View>
      </HomeScreen>
    );
  }

  return (
    <HomeScreen>
      <ThemedText>Hello</ThemedText>
    </HomeScreen>
  );
}
