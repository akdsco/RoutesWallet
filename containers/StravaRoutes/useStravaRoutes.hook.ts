import {
  getStravaRoutesAndSaveInDb,
  StravaRouteBase,
} from "@/integrations/strava";
import { useEffect, useRef, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { RouteFilters } from "@/containers/StravaRoutes/StravaRoutes";
import {
  getStravaAthleteBasicProfile,
  getStravaRoutesBaseFromDb,
} from "@/db/methods";
import { useApp } from "@/hooks";
import { Toast } from "@/library/Toast";
import { log } from "@/library/logger";
import { usePostHog } from "posthog-react-native";
import { registerUser } from "@/library/analytics/register";
import { Keyboard } from "react-native";
import BottomSheet from "@gorhom/bottom-sheet";
import { useRoutesFilters } from "@/containers/StravaRoutes/useRoutesFilters.hook";

export const useStravaRoutes = (filter: RouteFilters) => {
  const { loading: loadingApp } = useApp();
  const db = useSQLiteContext();
  const { athleteId } = useApp();
  const postHog = usePostHog();

  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [routes, setRoutes] = useState<StravaRouteBase[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const bottomSheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    const keyboardShowListener = Keyboard.addListener("keyboardDidShow", () => {
      setIsKeyboardVisible(true);
    });
    const keyboardHideListener = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, []);

  useEffect(() => {
    const run = async () => {
      const routes = await getStravaRoutesBaseFromDb(db)(athleteId, filter);
      setRoutes(routes);

      //TODO: Probably should run this user registration only once (outside of this hook/component)
      // remember that this is also rendered in Tags
      return await getStravaAthleteBasicProfile(db)(athleteId);
    };

    if (Number(athleteId) > 0) {
      run().then((athlete) => {
        setLoadingRoutes(false);
        registerUser(postHog)(athlete);
      });
    }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    log.info("useRoutes:onRefresh", "Refreshing Strava routes");
    const result = await getStravaRoutesAndSaveInDb(db)(athleteId);

    if (!result.success) {
      log.error("useRoutes:onRefresh", "Error when refreshing Strava routes", {
        athleteId,
        result,
      });
      Toast(
        "error",
        "Synchronising routes failed",
        "Try again later or get in touch if this error persists",
      );
      setRefreshing(false);
      return;
    }

    log.info("useRoutes:onRefresh", "Strava routes refreshed", { result });

    const { totalRoutes, routes } = result.data;

    Toast(
      "success",
      "Routes synchronised",
      `${totalRoutes} route${totalRoutes === 1 ? "" : "s"} available for tagging`,
    );

    setRoutes(routes);
    setRefreshing(false);
  };

  const filters = useRoutesFilters(bottomSheetRef, routes);

  return {
    refreshing,
    onRefresh,
    loading: loadingApp || loadingRoutes,
    routes: filters.filteredRoutes,
    isKeyboardVisible,
    bottomSheetRef,
    ...filters,
  };
};
