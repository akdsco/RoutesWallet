import Container from "@/components/Container";
import { ThemedText } from "@/components/ThemedText";
import { useTaggedRoutes } from "@/containers/TaggedRoutes/TaggedRoutes.hook";
import { StravaRoutes } from "@/containers/StravaRoutes";
import { Button } from "@/components/Button/Buttons";
import { useRouter } from "expo-router";
import { View } from "react-native";

export const TaggedRoutes = () => {
  const router = useRouter();
  const { loading, routeIds } = useTaggedRoutes();

  if (loading) {
    return (
      <Container>
        <ThemedText>Loader...</ThemedText>
      </Container>
    );
  }

  if (routeIds.length === 0) {
    return (
      <Container>
        <View
          style={{
            display: "flex",
            alignItems: "center",
          }}
        >
          <ThemedText
            className="mt-8 text-center"
            style={{ paddingHorizontal: 65 }}
          >
            No routes tagged yet.
          </ThemedText>
          <Button
            className="mt-5"
            style={{ maxWidth: 200 }}
            title="Go to Routes"
            accessibilityLabel=""
            onPress={() => router.navigate("/(app)/")}
          />
        </View>
      </Container>
    );
  }

  return <StravaRoutes route="tags/tagged-routes/" filter={{ routeIds }} />;
};
