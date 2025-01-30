import { ThemedText } from "@/components/ThemedText";
import Container from "@/components/Container";
import { useEffect, useState } from "react";
import { useRoute } from "@react-navigation/core";

export default function TaggedRoutes() {
  const [loading, setLoading] = useState(true);
  const { params } = useRoute();

  useEffect(() => {
    console.log(params);
  }, []);

  if (loading) {
    return (
      <Container>
        <ThemedText>Loader...</ThemedText>
      </Container>
    );
  }

  return (
    <Container>
      <ThemedText>Loaded routes here</ThemedText>
    </Container>
  );
}
