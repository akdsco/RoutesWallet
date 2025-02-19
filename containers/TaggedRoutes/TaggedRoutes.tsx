import Container from "@/components/Container";
import { ThemedText } from "@/components/ThemedText";
import { useTaggedRoutes } from "@/containers/TaggedRoutes/TaggedRoutes.hook";
import { StravaRoutes } from "@/containers/StravaRoutes";
import { View } from "react-native";

export const TaggedRoutes = () => {
  const { loading, routeIds } = useTaggedRoutes();

  if (loading) {
    return (
      <Container>
        <ThemedText>Loading...</ThemedText>
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
            No routes tagged yet
          </ThemedText>
        </View>
      </Container>
    );
  }

  return <StravaRoutes route="tags/tagged-routes/" filter={{ routeIds }} />;
};
