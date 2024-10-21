import Container from "@/components/Container";
import { ThemedText } from "@/components/ThemedText";
import { useEffect } from "react";
import { useRouter } from "expo-router";

export default function Localhost() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the "authorise" screen
    router.replace("/authorise");
  }, [router]);

  return (
    <Container>
      <ThemedText>Localhost page</ThemedText>
    </Container>
  );
}
