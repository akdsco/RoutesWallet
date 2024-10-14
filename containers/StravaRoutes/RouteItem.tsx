import { TouchableOpacity, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { StravaRoute } from "@/auth/strava/types";

export const RouteItem = ({
  item,
  itemWidth,
}: {
  item: StravaRoute;
  itemWidth: number;
}) => (
  <TouchableOpacity
    style={[styles.item, { width: itemWidth, height: itemWidth }]}
    onPress={() => {
      /* Navigate to detailed view */
    }}
  >
    <ThemedText style={styles.itemText}>{item.name}</ThemedText>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  item: {
    backgroundColor: "#444",
    margin: 5,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  itemText: {
    textAlign: "center",
    padding: 5,
  },
});
