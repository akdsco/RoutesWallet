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
import Fuse from "fuse.js";
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
  const [searchFoundRoutes, setSearchFoundRoutes] = useState<StravaRouteBase[]>(
    [],
  );
  const [isInSearchMode, setIsInSearchMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const onBottomSheetOpen = () => {
    if (!bottomSheetRef.current) {
      return;
    }

    log.info("useRoutes: onBottomSheetOpen", "Opening filters bottom sheet");
    bottomSheetRef.current.expand();
  };

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

  // TODO: when adding paging, this will need to be updated (so we always pull all routes and search through all)
  const fuse = new Fuse(routes, {
    includeScore: true,
    threshold: 0.4,
    keys: ["name", "description"],
  });

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

  const executeSearch = async (searchTerm: string) => {
    const result = fuse.search(searchTerm);

    const foundRoutes = result.map(({ item }) => item);

    log.info("useRoutes: executeSearch", "Routes found", {
      searchTerm,
      result,
    });

    setSearchFoundRoutes(foundRoutes);
  };

  const onSearchReset = () => {
    setSearchFoundRoutes([]);
  };

  useEffect(() => {
    const run = async () => {
      const routes = await getStravaRoutesBaseFromDb(db)(athleteId, filter);
      setRoutes(routes);

      return await getStravaAthleteBasicProfile(db)(athleteId);
    };

    if (Number(athleteId) > 0) {
      run().then((athlete) => {
        setLoadingRoutes(false);
        registerUser(postHog)(athlete);
      });
    }
  }, []);

  const filters = useRoutesFilters(bottomSheetRef);

  return {
    refreshing,
    onRefresh,
    loading: loadingApp || loadingRoutes,
    noRoutesAvailable: !isInSearchMode && routes.length === 0,
    routes: isInSearchMode ? searchFoundRoutes : routes,
    executeSearch,
    onSearchReset,
    isInSearchMode,
    isKeyboardVisible,
    setIsInSearchMode: (value: boolean) => setIsInSearchMode(value),
    onBottomSheetOpen,
    bottomSheetRef,
    ...filters,
  };
};
