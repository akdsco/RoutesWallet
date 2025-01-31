import Container from "@/components/Container";
import { useRouteItemDetails } from "@/containers/RouteItemDetails/RouteItemDetails.hook";
import { Loader } from "@/components/Loader";
import { ThemedText } from "@/components/ThemedText";
import { Image, ScrollView, View } from "react-native";
import { Button } from "@/components/Button/Buttons";
import { useTheme } from "@/hooks";

export const RouteItemDetails = () => {
  const { loading, route, addTag } = useRouteItemDetails();

  // Keeping mapColor logic here helps in re-rendering the component when colorMode changes
  const { colorMode } = useTheme();
  const mapColor = `${colorMode}_url` as "dark_url" | "light_url";

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

  return (
    <Container>
      <ScrollView style={{ width: "100%" }}>
        <Image
          source={{ uri: route.map_urls[mapColor] }}
          className="h-64 w-96 object-cover rounded-lg mt-3"
        />
        <View className="flex row-auto justify-between items-center mt-4">
          <ThemedText className="text-xl font-bold">{route.name}</ThemedText>
          <Button
            title="Add tag"
            onPress={() => addTag(route.id)}
            accessibilityLabel=""
          />
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
        <View className="my-6 flex justify-end">
          <Button
            title="Share"
            onPress={() => console.log("share this route")}
            accessibilityLabel=""
          />
        </View>
      </ScrollView>
    </Container>
  );
};
