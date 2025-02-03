import Container from "@/components/Container";
import { useRouteItemDetails } from "@/containers/RouteItemDetails/RouteItemDetails.hook";
import { Loader } from "@/components/Loader";
import { ThemedText } from "@/components/ThemedText";
import { Dimensions, Image, ScrollView, View } from "react-native";
import { Button } from "@/components/Button/Buttons";
import { useTheme } from "@/hooks";
import {
  Menu,
  MenuOption,
  MenuOptions,
  MenuTrigger,
} from "react-native-popup-menu";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import React from "react";
import { log } from "@/library/logger";

export const RouteItemDetails = () => {
  const { loading, route, assignedTags, addTag } = useRouteItemDetails();

  // Keeping mapColor logic here helps in re-rendering the component when colorMode changes
  const { colorMode } = useTheme();
  const mapColor = `${colorMode}_url` as "dark_url" | "light_url";
  const ScreenWidth = Dimensions.get("window").width;

  if (loading) {
    return <Loader />;
  }

  if (!route) {
    return (
      <Container>
        <ThemedText>Route not found</ThemedText>
      </Container>
    );
  }

  const handleSelectedMenuOption = (
    selectedMenuItem: string,
    routeId: BigInt,
  ) => {
    log.info(
      "handleSelectedMenuOption",
      `User adds tag ${selectedMenuItem} to routeId ${routeId}`,
    );
  };

  return (
    <Container>
      <ScrollView style={{ display: "flex" }}>
        <Image
          source={{ uri: route.map_urls[mapColor] }}
          style={{ width: ScreenWidth * 0.9 }}
          className="h-64 object-cover rounded-lg mt-3"
        />
        <View style={{ display: "flex", justifyContent: "space-between" }}>
          <View className="flex flex-row justify-between items-center mt-4">
            <ThemedText className="text-xl font-bold">{route.name}</ThemedText>
          </View>
          <View>
            {assignedTags.map((tag) => (
              <View key={tag.id}>
                <ThemedText>{tag.name}</ThemedText>
              </View>
            ))}
          </View>
        </View>
        <View className="mt-4 space-y-2">
          <ThemedText>
            Distance: {(route.distance / 1000).toFixed(2)} km
          </ThemedText>
          <ThemedText>
            Elevation Gain: {route.elevation_gain.toFixed(1)} m
          </ThemedText>
          {route.description && (
            <ThemedText>Description: {route.description}</ThemedText>
          )}
          <ThemedText>
            Created At: {new Date(route.created_at).toLocaleDateString()}
          </ThemedText>
        </View>
      </ScrollView>
      <View
        className="my-5 flex flex-row justify-around"
        style={{
          alignItems: "center",
        }}
      >
        <Button
          title="Share"
          onPress={() => console.log("share this route")}
          accessibilityLabel=""
        />
        <Menu
          onSelect={(value: string) =>
            handleSelectedMenuOption(value, route.id)
          }
        >
          <MenuTrigger
            style={{
              width: 65,
              borderRadius: 50,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FontAwesome size={25} name="plus-square" color="white" />
            <ThemedText>Add tags</ThemedText>
          </MenuTrigger>
          <MenuOptions>
            <MenuOption value="edit" text="Editasdfas" />
            <MenuOption value="remove" text="Remove" />
          </MenuOptions>
        </Menu>
      </View>
    </Container>
  );
};
