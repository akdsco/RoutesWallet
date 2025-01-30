import Container from "@/components/Container";
import { ThemedText } from "@/components/ThemedText";
import { useTaggedRoutes } from "@/containers/TaggedRoutes/TaggedRoutes.hook";
import { StravaRoutes } from "@/containers/StravaRoutes";

export const TaggedRoutes = () => {
  const { loading, routeIds } = useTaggedRoutes();

  if (loading) {
    return (
      <Container>
        <ThemedText>Loader...</ThemedText>
      </Container>
    );
  }

  return <StravaRoutes filter={{ routeIds }} />;
};
