import { Stack } from "expo-router";
import { useTheme } from "@/hooks";
import { Share } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { ParamListBase, RouteProp } from "@react-navigation/core";

export default function HomeLayout() {
  const { theme } = useTheme();

  const onShare = async (route: RouteProp<ParamListBase, string>) => {
    // @ts-ignore
    const { route: routeNumber } = route.params;

    try {
      const result = await Share.share({
        message: "🚴‍♀️Strava route 🚴‍",
        url: "https://www.strava.com/routes/" + routeNumber,
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log("Shared via", result.activityType);
        } else {
          console.log("Shared successfully");
        }
      } else if (result.action === Share.dismissedAction) {
        console.log("Share dismissed");
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="[route]"
        options={({ route }) => ({
          // TODO
          // @ts-ignore
          title: route.params?.routeName || "Selected Route",
          headerStyle: { backgroundColor: theme.background },
          headerBackTitle: "Routes",
          headerTintColor: theme.tint,
          headerRight: () => (
            <FontAwesome
              size={25}
              name="share-alt"
              color={theme.tint}
              onPress={() => onShare(route)}
            />
          ),
        })}
      />
    </Stack>
  );
}
