import { stravaRoutesExamples } from "@/auth/strava/routes";
import Container from "@/components/Container";
import { FlatList, View, StyleSheet, useWindowDimensions } from "react-native";
import { RouteItem } from "./RouteItem";

export const Routes = () => {
  const { width } = useWindowDimensions();

  const getNumColumns = (screenWidth: number) => {
    if (screenWidth >= 768) return 4; // Desktop and larger tablets
    if (screenWidth >= 480) return 3; // Smaller tablets
    return 2; // Mobile
  };

  const numColumns = getNumColumns(width);
  const maxWidth = Math.min(width, 960);
  const itemWidth = (maxWidth - 20) / numColumns - 10; // 20px for container padding, 10px for item margin

  return (
    <Container>
      <View style={[styles.container, { maxWidth: 960 }]}>
        <FlatList
          data={stravaRoutesExamples}
          renderItem={({ item }) => (
            <RouteItem {...{ item, itemWidth }} />
          )}
          keyExtractor={(item) => item.id.toString()}
          numColumns={numColumns}
          contentContainerStyle={styles.gridContainer}
        />
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: "center",
    width: "100%",
    padding: 10,
  },
  gridContainer: {
    justifyContent: "space-between",
  },
});
