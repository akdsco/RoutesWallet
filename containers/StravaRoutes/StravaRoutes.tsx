import Container from "@/components/Container";
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { RouteListItem } from "./RouteListItem";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button/Buttons";
import { Loader } from "@/components/Loader";
import { useApp } from "@/hooks";
import { useRoutes } from "@/containers/StravaRoutes/StravaRoutes.hook";

type StravaRoutesProps = {
  route: string;
  filter?: RouteFilters;
};

export type RouteFilters =
  | {
      routeIds?: BigInt[];
    }
  | undefined;

export const StravaRoutes = ({ route, filter }: StravaRoutesProps) => {
  const { width } = useWindowDimensions();
  const { loading } = useApp();
  const { loadingRoutes, routes } = useRoutes(filter);

  const getNumColumns = (screenWidth: number) => {
    if (screenWidth >= 980) return 4; // Desktop and larger tablets
    if (screenWidth >= 650) return 3; // Smaller tablets
    if (screenWidth >= 320) return 2; // Mobile
    return 1; // Small Mobile
  };

  const numColumns = getNumColumns(width);
  const maxWidth = Math.min(width, 1200);
  const itemWidth = (maxWidth - 20) / numColumns - 10; // 20 px for container padding, 10 px for item margin

  if (loading || loadingRoutes) {
    return <Loader />;
  }

  if (routes.length === 0) {
    return (
      <Container>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ThemedText>No routes available.</ThemedText>
          <Button
            title="Refresh"
            onPress={() => {}}
            accessibilityLabel="This will pull in your latest routes from Strava."
          />
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.innerContainer}>
          {/* // TODO: Potentially move to FlatList for mobile devices only */}
          <View style={styles.gridContainer}>
            {routes.map((item) => (
              <RouteListItem
                key={item.id.toString()}
                route={route}
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
