import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useTheme } from "@/hooks";
import { ParamListBase, RouteProp } from "@react-navigation/core";
import { Share } from "react-native";
import { log } from "@/library/logger";

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

    const fnName = "ShareButton";
    try {
      const result = await Share.share({ message });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          log.info(fnName, `Shared route ${routeId}`, { result, route });
        } else {
          log.info(fnName, "Shared successfully", { result, route });
        }
      } else if (result.action === Share.dismissedAction) {
        log.info(fnName, "Share dismissed", { result, route });
      }
    } catch (error) {
      log.error(fnName, "Error sharing", { error });
      throw error;
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
