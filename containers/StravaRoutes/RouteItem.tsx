import {
  TouchableOpacity,
  StyleSheet,
  Text,
  View,
  Image,
  useColorScheme,
} from "react-native";
import { StravaRoute } from "@/auth/strava";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";

export const RouteItem = ({
  item,
  itemWidth,
}: {
  item: StravaRoute;
  itemWidth: number;
}) => {
  const { theme } = useTheme();

  const distanceInKms = (distanceInMeters: number) => {
    const distanceInKm = distanceInMeters / 1000;
    return `${distanceInKm.toFixed(1)} km`;
  };

  //TODO: later - improve this? (Better typing)
  const mapColor = `${useColorScheme()}_url` as "dark_url" | "light_url";

  const metadataStyle = [styles.metadata, { color: theme.icon }];

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          width: itemWidth,
          backgroundColor: theme.background,
          shadowColor: theme.shadowColor,
        },
      ]}
    >
      <Image source={{ uri: item.map_urls[mapColor] }} style={styles.image} />
      <View style={styles.infoContainer}>
        <ThemedText style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {item.name}
        </ThemedText>
        <View style={styles.metadataContainer}>
          <View style={styles.metadataItem}>
            <Ionicons
              name={item.type === 1 ? "bicycle-outline" : "map-outline"}
              size={16}
              color={theme.icon}
            />
            <Text style={metadataStyle}>{distanceInKms(item.distance)}</Text>
          </View>
          <View style={styles.metadataItem}>
            <Ionicons name="trending-up-outline" size={16} color={theme.icon} />
            <Text style={metadataStyle}>
              {item.elevation_gain.toFixed(0)} m
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 5,
    borderRadius: 4,
    overflow: "hidden",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  image: {
    width: "100%",
    aspectRatio: 16 / 9,
    resizeMode: "cover",
  },
  infoContainer: {
    padding: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  metadataContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metadataItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  metadata: {
    fontSize: 14,
    marginLeft: 4,
  },
});
