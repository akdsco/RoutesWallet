import { ThemedText } from "@/components/ThemedText";
import Container from "@/components/Container";
import { useState } from "react";

export default function TaggedRoutes() {
  const [loading, setLoading] = useState(true);

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
