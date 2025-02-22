import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useTheme } from "@/hooks";
import { ParamListBase, RouteProp } from "@react-navigation/core";
import { Share } from "react-native";

type ShareButtonProps = {
  route: RouteProp<ParamListBase, string>;
};

export const ShareButton = ({ route }: ShareButtonProps) => {
  const { theme } = useTheme();

  const onShare = async (route: RouteProp<ParamListBase, string>) => {
    // @ts-ignore
    const { route: routeId } = route.params;

    const appMsg = `🚴‍♀️Strava route 🚴‍\nCheck out this route:\n`;
    const message = `https://www.strava.com/routes/${routeId}`;

    try {
      const result = await Share.share({ message });

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
    <FontAwesome
      size={25}
      name="share-alt"
      color={theme.tint}
      onPress={() => onShare(route)}
      style={{ marginRight: 5 }}
    />
  );
};
