import { View } from "react-native";
import React from "react";
import { EndRoute } from "@/components/Icon/EndRoute";
import { ThemedText } from "@/components/ThemedText";

export const EmptyRoutesMsg = () => {
  return (
    <View
      style={{
        paddingVertical: 30,
        alignItems: "center",
      }}
    >
      <EndRoute />
      <ThemedText type="title" style={{ paddingTop: 40 }}>
        Dead end route
      </ThemedText>
      <ThemedText
        style={{ textAlign: "center", paddingHorizontal: 40, paddingTop: 15 }}
      >
        Remove filters or change the search criteria to find more routes
      </ThemedText>
    </View>
  );
};
