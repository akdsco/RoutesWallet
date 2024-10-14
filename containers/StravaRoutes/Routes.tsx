import { stravaRoutesExamples } from "@/auth/strava/routes";
import Container from "@/components/Container";
import {
  View,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import { RouteItem } from "./RouteItem";

export const Routes = () => {
  const { width } = useWindowDimensions();

  const getNumColumns = (screenWidth: number) => {
    if (screenWidth >= 980) return 4; // Desktop and larger tablets
    if (screenWidth >= 650) return 3; // Smaller tablets
    if (screenWidth >= 320) return 2; // Mobile
    return 1; // Small Mobile
  };

  const numColumns = getNumColumns(width);
  const maxWidth = Math.min(width, 1200);
  const itemWidth = (maxWidth - 20) / numColumns - 10; // 20px for container padding, 10px for item margin

  return (
    <Container>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.innerContainer}>
          {/* // TODO: Potentially move to FlatList for mobile devices only */}
          <View style={styles.gridContainer}>
            {stravaRoutesExamples.map((item) => (
              <RouteItem
                key={item.id.toString()}
                item={item}
                itemWidth={itemWidth}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </Container>
  );
};

const styles = StyleSheet.create({
  scrollViewContent: {
    flexGrow: 1,
  },
  innerContainer: {
    flex: 1,
    maxWidth: 1200,
    width: "100%",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
});
