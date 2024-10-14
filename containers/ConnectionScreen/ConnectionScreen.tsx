import Container from "@/components/Container";
import { ThemedText } from "@/components/ThemedText";
import { Link } from "expo-router";
import { View } from "react-native";

export const ConnectionScreen = () => {
  return (
    <Container>
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
    </Container>
  );
};
